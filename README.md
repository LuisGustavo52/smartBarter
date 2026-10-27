# SmartBarter

Plataforma descentralizada de barter agrícola voltada à cafeicultura. Permite a negociação e troca de safras de café por insumos agrícolas, com formalização de Cédulas de Produto Rural (CPR) emitidas como NFTs (ERC-721) na blockchain Ethereum/Hardhat, integradas a um backend NestJS e frontend Next.js com histórico persistente de transações e cálculo de reputação no Supabase.

---

## Como subir o ambiente local

### Regra de ouro
Trabalhe SEMPRE em `~/smartBarter` (pasta nativa do WSL/Linux).
NUNCA abra ou edite nada em `/mnt/c/...` (OneDrive/Windows) — isso já causou problemas graves de sincronização e perda de edições. Se for abrir o VS Code, sempre execute a partir do terminal WSL:
```bash
cd ~/smartBarter && code .
```

---

### Variáveis de ambiente

#### 1. API (`api/.env`)
Crie ou edite o arquivo `api/.env` na raiz da pasta `api/`:
- `SUPABASE_URL`: URL do seu projeto no Supabase (obrigatória).
- `SUPABASE_KEY`: Chave pública `anon` do Supabase (obrigatória).
- `CONTRACT_ADDRESS`: Endereço do contrato `SmartBarterCPR` implantado na rede local. **Atualizada automaticamente pelo `resetup.sh`**.
- `AMBIENTE`: Identificador obrigatório do ambiente por desenvolvedor (ex.: `pedro` ou `luis`). Permite distinguir os dados e eventos em bancos compartilhados. Se ausente, a API grava `local` e registra um aviso no log.
- `RPC_URL`: URL do nó RPC da blockchain local. Opcional (padrão no código: `http://127.0.0.1:8545`).
- Outros parâmetros com padrões já definidos no código: `PORT=3001`, `THIRDWEB_CLIENT_ID=d3690d56bdafa6a3cd84d948259dbbe0`, `DOMAIN=localhost:3000`.

#### 2. Frontend (`frontend/.env.local`)
Copie o modelo de exemplo:
```bash
cd frontend && cp .env.example .env.local
```
Variáveis disponíveis em `frontend/.env.local`:
- `NEXT_PUBLIC_CONTRACT_ADDRESS`: Endereço do contrato `SmartBarterCPR`. **Gravado e atualizado automaticamente pelo `resetup.sh`**.
- `NEXT_PUBLIC_API_URL`: URL base da API NestJS (padrão: `http://localhost:3001`).
- `NEXT_PUBLIC_RPC_URL`: URL RPC do nó local Hardhat (padrão: `http://127.0.0.1:8545`).
- `NEXT_PUBLIC_THIRDWEB_CLIENT_ID`: Client ID do Thirdweb (padrão: `d3690d56bdafa6a3cd84d948259dbbe0`).
- `NEXT_PUBLIC_DOMAIN`: Domínio do frontend (padrão: `localhost:3000`).

> **Nota**: `frontend/lib/config.ts` centraliza estas variáveis, mas a adoção em todas as telas ainda está em andamento (card "Refatoração .env e scripts"). Hoje o único valor que o `resetup.sh` altera é `NEXT_PUBLIC_CONTRACT_ADDRESS`.

---

### Ordem de inicialização (4 terminais)

**Terminal 1 — Blockchain local (Hardhat)**
```bash
cd backend
npx hardhat node
```
*Deixe essa janela aberta o tempo todo. Fechar essa janela encerra o nó e zera o estado volátil da blockchain local.*

**Terminal 2 — Deploy e financiamento de carteiras (`resetup.sh`)**
```bash
./resetup.sh
```
Execute este script sempre após iniciar ou reiniciar o Terminal 1. O script:
1. Verifica se o nó Hardhat do Terminal 1 está respondendo em `http://127.0.0.1:8545`.
2. Reimplanta o contrato inteligente `SmartBarterCPR` via Hardhat Ignition (`ignition/modules/SmartBarterCPR.ts`) e extrai o novo endereço gerado.
3. Financia as 4 carteiras cadastradas em `backend/scripts/wallets.json` com 50 ETH cada, via `scripts/fund-wallets.ts`.
4. Atualiza `NEXT_PUBLIC_CONTRACT_ADDRESS` em `frontend/.env.local`.
5. Atualiza `CONTRACT_ADDRESS` em `api/.env` (se o arquivo existir e contiver essa chave).
6. Limpa o cache de build do frontend (`rm -rf frontend/.next`).

> **Atenção**: Sempre após executar o `resetup.sh`, é necessário reiniciar a API (Terminal 3) e o Frontend (Terminal 4) para carregarem o novo endereço do contrato.

**Terminal 3 — API (NestJS)**
```bash
cd api
npm run start:dev
```
*Roda na porta `3001` (para não conflitar com a porta 3000 do Next.js).*

**Terminal 4 — Frontend (Next.js)**
```bash
cd frontend
npm run dev
```
*Acesse em [http://localhost:3000](http://localhost:3000).*

---

### Contas de teste (MetaMask)

Carteiras configuradas em `backend/scripts/wallets.json` e financiadas automaticamente pelo `resetup.sh`:
- `0xe65A778F7eB4943662f51ee3A8bDDe06678805D0`: nos testes atuais é o **Fornecedor** (`@fazenda_bitencourt`). Rótulo no `wallets.json`: "Produtor (Fazenda Ouvidor)".
- `0x6c3E116F3C4F6F308ba124c51C91c29D7a784103`: rótulo no `wallets.json`: "Fornecedor 1 (Rep. Bayer)".
- `0xa7dA2AC872Ea65f2db408a0a9Cadf04206E39001`: rótulo no `wallets.json`: "Fornecedor 2 (Account 2)".
- `0x009805DBE4F5BeeC5a154C0Ce2B7df1695aa5b2a`: nos testes atuais é o **Produtor** ("Account 1").

O papel de cada carteira (produtor ou fornecedor) é definido no cadastro do usuário, não pelo `wallets.json`; os rótulos do arquivo só aparecem na saída do `resetup.sh`.

**Configuração da Rede na MetaMask**:
- **Nome da Rede**: Localhost 8545
- **URL do RPC**: `http://127.0.0.1:8545`
- **ID da Cadeia (Chain ID)**: `31337`
- **Símbolo da Moeda**: `ETH`

---

### Checagens rápidas se algo não funcionar

```bash
# 1. O nó Hardhat está respondendo?
curl -s -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://127.0.0.1:8545

# 2. A API está respondendo?
curl -s http://localhost:3001/users/wallet/0xe65A778F7eB4943662f51ee3A8bDDe06678805D0

# 3. O histórico de transações da API está respondendo?
curl -s "http://localhost:3001/historico?wallet=0xe65A778F7eB4943662f51ee3A8bDDe06678805D0&limit=5"

# 4. Git limpo e sincronizado?
git status
```

---

## Banco de Dados e Migrations

As migrações SQL ficam em `api/supabase/migrations/`:
1. `20261014190000_reset_catalogo_propostas.sql`
2. `20261016100000_add_unidade_total_sacas.sql`
3. `20261022140000_create_historico_transacoes.sql`
4. `20261025120000_historico_rls_policies.sql`

### Como aplicar
As migrations devem ser aplicadas **manualmente**, em ordem cronológica, pelo **SQL Editor do Supabase Dashboard**.
> **IMPORTANTE**: **NÃO** utilize `supabase db push`.
>
> **ATENÇÃO**: a migration `20261014190000_reset_catalogo_propostas.sql` remove e recria as tabelas `assets` e `propostas` (`drop table ... cascade`), apagando seus dados. **Não a reaplique** no banco compartilhado, que já a recebeu. A tabela `historico_transacoes` não tem chaves estrangeiras e não é afetada por esse reset.

### Tabela `historico_transacoes` e Políticas RLS
- **Estrutura append-only**: A tabela é estritamente de inclusão, sem chaves estrangeiras (`foreign keys`), para garantir que sobreviva a resets do Hardhat e truncamento de tabelas de propostas ou ativos. Triggers de banco bloqueiam qualquer operação de `UPDATE`, `DELETE` ou `TRUNCATE`.
- **Acesso via chave `anon`**: A API conecta ao Supabase com a chave pública anônima.
- **Políticas RLS ativas**: A tabela possui Row Level Security ativado com políticas que permitem somente leitura (`SELECT to anon`) e inserção (`INSERT to anon`). Não existem políticas de modificação nem de exclusão.

---

## Histórico Persistente de Transações

### O Problema
Em ambiente de desenvolvimento, a blockchain Hardhat executa em memória e é zerada sempre que o processo é reiniciado. Quando isso ocorre:
- O número de bloco volta a 0.
- Os `tokenId` das CPRs começam a ser gerados novamente a partir de 0.
- Contratos emitidos em sessões anteriores perdem o vínculo ou colidem com IDs da nova sessão.

### A Solução
Para garantir rastreabilidade completa e dados contínuos para os desenvolvedores e avaliadores:
1. **Identificação por `chain_epoch`**: Cada ciclo de vida da blockchain local tem um identificador único `chain_epoch`, definido pelo hash do bloco gênese (`blocoZero.hash`). Ao reiniciar o nó, um novo epoch é gerado.
2. **Ambiente e Snapshot**: Cada registro grava o campo `ambiente` (definido pela variável `AMBIENTE` na API) e um `snapshot` (JSONB) com os dados contextuais da CPR ou da proposta (insumo, quantidade, safra, sacas, status, etc.).
3. **Indexador em Segundo Plano (`HistoricoIndexerService`)**:
   - Polling contínuo a cada 3 segundos na chain.
   - Detecta mudanças de `chain_epoch` e avança o cursor de blocos.
   - Captura eventos on-chain: `CPREmitida`, `EntregaConfirmada` e `CPRLiquidada`.
   - Lê o estado da CPR no bloco exato do evento e persiste de forma idempotente com chave única `(chain_epoch, tx_hash, log_index)`.
4. **Registro de Propostas Off-Chain (`PropostasService`)**:
   - Registra transições de status off-chain: `PROPOSTA_CRIADA`, `PROPOSTA_ACEITA` e `PROPOSTA_RECUSADA`.
5. **Endpoint `GET /historico`**:
   - Parâmetros: `wallet` (filtra se a carteira foi produtor, fornecedor ou ator), `evento`, `ambiente`, `limit` (padrão 100) e `offset`.
6. **Interface `/hub/historico`**:
   - Tela cliente protegida pelo `HubGuard` e com link direto na navegação global do Hub.
   - Filtro interativo por tipo de evento e paginação via botão *"Carregar mais"*.
   - Cartões agrupados por ciclo de proposta (`agruparPorCiclo`), destacando o papel do usuário conectado (*"Você é: Produtor"* ou *"Você é: Fornecedor"*), insumo, quantidade, safra e sacas.
   - Linha do tempo com data/hora em pt-BR, ator encurtado, token ID, hash da transação, tag de chain (`chain 0x1234abcd`) e ambiente.
7. **Reputação Persistente (`ReputacaoService`)**:
   - O cálculo de pontuação, total de negócios aceitos, recusados e contratos liquidados de cada fornecedor é feito a partir de `public.historico_transacoes`. Com isso, a reputação do usuário **não cai e não é zerada** quando o nó Hardhat reinicia.

### Limitações do Histórico
- **API ligada**: O indexador on-chain só processa e grava eventos emitidos enquanto a API estiver rodando.
- **Registro off-chain de melhor esforço**: O registro das propostas em `PropostasService` é disparado como *best-effort* (falhas são logadas com aviso, sem retentativas automáticas).
- **Chave `anon`**: As políticas RLS permitem inserção e leitura abertas via chave `anon`.
- **Eventos prévios**: Transações emitidas na blockchain antes da implementação do histórico persistente não podem ser recuperadas retroativamente.

---

### Como resetar com segurança e como validar

1. **Antes de reiniciar**: Verifique no Terminal 3 (API) se os últimos eventos on-chain foram indexados (busque por mensagens do `HistoricoIndexerService` nos logs).
2. **Reinício**:
   - Pare o Terminal 1 (`Ctrl+C`) e rode `npx hardhat node`.
   - No Terminal 2, execute `./resetup.sh`.
   - Reinicie os Terminais 3 (API) e 4 (Frontend).
3. **Validação no Supabase**:
   No SQL Editor do Supabase, execute a query de validação para confirmar os múltiplos epochs registrados:
   ```sql
   select
     chain_epoch,
     ambiente,
     count(*) as total_eventos,
     min(ocorrido_em) as primeiro_evento,
     max(ocorrido_em) as ultimo_evento
   from public.historico_transacoes
   group by chain_epoch, ambiente
   order by max(ocorrido_em) desc;
   ```

---

## Testes Automatizados

### 1. API (NestJS)
Rode a suíte de testes unitários da API:
```bash
cd api && npm test
```
- **Quantidade real**: **5 test suites**, **43 testes** (100% passando).
  - `src/reputacao/reputacao.logic.spec.ts`: lógica de cálculo de score e contagens a partir do histórico persistente.
  - `src/historico/historico-indexer.logic.spec.ts`: divisão de intervalos de blocos, identificação de UUIDs e mapeamento de logs on-chain.
  - `src/propostas/calculo-sacas.spec.ts`: regras de cálculo de sacas de café e arredondamento para CPR.
  - `src/app.controller.spec.ts`: healthcheck básico do controlador.
  - `src/historico/historico.service.spec.ts`: sanitização de snapshots, inserções off-chain/on-chain e consultas de reputação.

### 2. Backend (Contratos e scripts Hardhat)
Rode os testes de integração do contrato Solidity via Node.js test runner e viem:
```bash
cd backend && npx hardhat test
```
*(Requer Node.js 22.13.0 ou superior).*
- **Quantidade real**: **6 testes** (100% passando).
  - Emissão de CPR por fornecedor com mintagem do NFT e persistência de dados.
  - Rejeição de emissão com endereço de produtor inválido ou quantidade de sacas zerada.
  - Confirmação de entrega de insumos permitida exclusivamente pelo produtor vinculado.
  - Bloqueio de confirmação de entrega em duplicidade.
  - Bloqueio de liquidação de CPR enquanto a entrega física do insumo não for confirmada.
  - Liquidação financeira da CPR permitida somente pelo detentor atual do NFT.
