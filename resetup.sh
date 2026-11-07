#!/bin/bash
set -e

# Garante que o Node correto (via NVM) esteja ativo, se o NVM existir nesta máquina
[ -s "$HOME/.nvm/nvm.sh" ] && \. "$HOME/.nvm/nvm.sh"

# Descobre a pasta raiz do projeto a partir da localização deste script,
# não de um caminho fixo — assim funciona em qualquer máquina/pasta
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$SCRIPT_DIR/backend"
FRONTEND="$SCRIPT_DIR/frontend"
API="$SCRIPT_DIR/api"

echo "== 1. Checando se o Hardhat está vivo =="
curl -s -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://127.0.0.1:8545 > /dev/null || { echo "Hardhat não está rodando. Abra 'npx hardhat node' no Terminal 1 primeiro."; exit 1; }

echo "== 2. Reimplantando o contrato =="
cd "$BACKEND"
DEPLOY_OUTPUT=$(npx hardhat ignition deploy ignition/modules/SmartBarterCPR.ts --network localhost)
echo "$DEPLOY_OUTPUT"
NEW_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -oE '0x[a-fA-F0-9]{40}' | tail -1)
if [ -z "$NEW_ADDRESS" ]; then
  echo "ERRO: Não foi possível obter o endereço do contrato do output do deploy."
  exit 1
fi
echo ">>> Novo endereço: $NEW_ADDRESS"

echo "== 3. Financiando as carteiras =="
npx hardhat run scripts/fund-wallets.ts --network localhost

echo "== 4. Atualizando endereço no frontend (.env.local) =="
ENV_FILE="$FRONTEND/.env.local"
touch "$ENV_FILE"
if grep -q '^NEXT_PUBLIC_CONTRACT_ADDRESS=' "$ENV_FILE"; then
  sed -i -E "s|^NEXT_PUBLIC_CONTRACT_ADDRESS=.*|NEXT_PUBLIC_CONTRACT_ADDRESS=$NEW_ADDRESS|" "$ENV_FILE"
else
  echo "NEXT_PUBLIC_CONTRACT_ADDRESS=$NEW_ADDRESS" >> "$ENV_FILE"
fi
echo "frontend/.env.local -> NEXT_PUBLIC_CONTRACT_ADDRESS=$NEW_ADDRESS"

echo "== 5. Atualizando endereço na API (.env se existir) =="
API_ENV="$API/.env"
if [ -f "$API_ENV" ] && [ "$(grep -c '^CONTRACT_ADDRESS=' "$API_ENV")" -gt 0 ]; then
  sed -i -E "s|^CONTRACT_ADDRESS=.*|CONTRACT_ADDRESS=$NEW_ADDRESS|" "$API_ENV"
  echo "api/.env atualizado"
else
  echo "api/.env sem CONTRACT_ADDRESS (ignorado)"
fi

echo "== 6. Limpando cache do frontend =="
cd "$FRONTEND"
rm -rf .next

echo ""
echo "PRONTO. Falta manual: reinicie o Terminal 3 (API) e o Terminal 4 (frontend)"
