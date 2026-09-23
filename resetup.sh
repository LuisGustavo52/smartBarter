#!/bin/bash
set -e

# Garante que o Node correto (via NVM) esteja ativo, se o NVM existir nesta máquina
[ -s "$HOME/.nvm/nvm.sh" ] && \. "$HOME/.nvm/nvm.sh"

# Descobre a pasta raiz do projeto a partir da localização deste script,
# não de um caminho fixo — assim funciona em qualquer máquina/pasta
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$SCRIPT_DIR/backend"
FRONTEND="$SCRIPT_DIR/frontend"

echo "== 1. Checando se o Hardhat está vivo =="
curl -s -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://127.0.0.1:8545 > /dev/null || { echo "Hardhat não está rodando. Abra 'npx hardhat node' no Terminal 1 primeiro."; exit 1; }

echo "== 2. Reimplantando o contrato =="
cd "$BACKEND"
DEPLOY_OUTPUT=$(npx hardhat ignition deploy ignition/modules/SmartBarterCPR.ts --network localhost)
echo "$DEPLOY_OUTPUT"
NEW_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -oE '0x[a-fA-F0-9]{40}' | tail -1)
echo ">>> Novo endereço: $NEW_ADDRESS"

echo "== 3. Financiando as carteiras =="
npx hardhat run scripts/fund-wallets.ts --network localhost

echo "== 4. Atualizando endereço nos 4 arquivos do frontend =="
cd "$FRONTEND"
for f in app/hub/propostas/page.tsx app/hub/meus-ativos/page.tsx components/BotaoAssinarAcordo.tsx hooks/useNotificacoesCPR.ts; do
  sed -i -E "s/CONTRACT_ADDRESS = \"0x[a-fA-F0-9]{40}\"/CONTRACT_ADDRESS = \"$NEW_ADDRESS\"/g" "$f"
done
grep -n "CONTRACT_ADDRESS" app/hub/propostas/page.tsx app/hub/meus-ativos/page.tsx components/BotaoAssinarAcordo.tsx hooks/useNotificacoesCPR.ts

echo "== 5. Limpando cache do frontend =="
rm -rf .next

echo ""
echo "PRONTO. Falta manual: rodar 'npm run dev' no Terminal 4, e se as contas Fazenda Ouvidor/Account 2 já foram reimportadas via chave privada, elas devem funcionar direto — sem precisar de reset de atividade."
