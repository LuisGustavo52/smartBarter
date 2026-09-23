# SmartBarter

This project showcases a Hardhat 3 project using the native Node.js test runner (`node:test`) and the `viem` library for Ethereum interactions.

## Project Overview

This project includes:

- A simple Hardhat configuration file.
- Foundry-compatible Solidity unit tests.
- TypeScript integration tests using [`node:test`](https://nodejs.org/api/test.html), the new Node.js native test runner, and [`viem`](https://viem.sh/).
- Examples demonstrating how to connect to different types of networks, including locally simulating OP mainnet.

## Como subir o ambiente local

### Regra de ouro
Trabalhe SEMPRE em `~/smartBarter` (pasta nativa do WSL/Linux).
NUNCA abra ou edite nada em `/mnt/c/...` (OneDrive/Windows) — isso já
causou bugs graves de sincronização (código editado no lugar errado
enquanto o app rodava do outro). Se for abrir o VS Code, sempre faça:
    cd ~/smartBarter && code .

### Ordem de inicialização (4 terminais)

**Terminal 1 — Blockchain local (Hardhat)**
    cd backend
    npx hardhat node
Deixe essa janela aberta o tempo todo. Fechar essa janela mata a
blockchain e todo o estado (contrato, saldos) junto.

**Terminal 2 — Deploy + financiamento (rodar sempre que o Terminal 1 reiniciar)**
    ./resetup.sh
Isso reimplanta o contrato, financia as carteiras de teste, e já
atualiza o endereço do contrato nos arquivos do frontend.

**Terminal 3 — API (NestJS)**
    cd api
    npm run start:dev

**Terminal 4 — Frontend (Next.js)**
    cd frontend
    npm run dev
Se o navegador mostrar comportamento estranho (cache de endereço
antigo, etc.), pare (Ctrl+C) e rode:
    rm -rf .next && npm run dev

### Checagens rápidas se algo não funcionar
    # Hardhat está vivo?
    curl -s -X POST -H "Content-Type: application/json" \
      --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
      http://127.0.0.1:8545

    # API está respondendo?
    curl -s http://localhost:3001/users/wallet/0xe65A778F7eB4943662f51ee3A8bDDe06678805D0

    # Código está sincronizado com o GitHub?
    git status
    # Se aparecer MUITA coisa modificada sem você ter mexido, rode:
    git fetch origin && git reset --hard origin/dev
    # (isso descarta qualquer edição local não commitada)

### Contas de teste (MetaMask)
- Fazenda Ouvidor / FORNECEDOR (Pedro): `0xe65A778F7eB4943662f51ee3A8bDDe06678805D0`
- Produtor (Rep. Bayer): `0x6c3E116F3C4F6F308ba124c51C91c29D7a784103`
- Rede: LocalHost, RPC `http://127.0.0.1:8545`, Chain ID `31337`


