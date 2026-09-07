import { network } from "hardhat";

async function main() {
  const { viem } = await network.create();
  
  // O endereco do contrato atual no seu ambiente local (deploy mais recente)
  const contractAddress = "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853";
  const cpr = await viem.getContractAt("SmartBarterCPR", contractAddress);

  const testClients = await viem.getWalletClients();
  const produtor = testClients[1]; // Account 1
  const fornecedor = testClients[2]; // Account 2

  console.log("=== INICIANDO TESTE DE FLUXO PONTA-A-PONTA (NOVO FLUXO) ===\n");

  // 1. Propor CPR (Produtor)
  console.log("1. Produtor propondo CPR...");
  const txHash = await cpr.write.proporCPR([fornecedor.account.address, 100n, "Sementes Teste"], { account: produtor.account });
  
  const publicClient = await viem.getPublicClient();
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  
  // O evento PropostaCriada e o primeiro emitido, o topic[1] contem o propostaId indexado
  const propostaIdHex = receipt.logs[0].topics[1];
  const propostaId = BigInt(propostaIdHex as string);
  console.log(`-> Proposta ID ${propostaId} criada com sucesso (tx: ${txHash}).\n`);

  // 2. Aceite (Fornecedor)
  console.log("2. Fornecedor aceitando a proposta...");
  await cpr.write.aceitarProposta([propostaId], { account: fornecedor.account });
  console.log(`-> Proposta aceita! O status mudou para ATIVA, mas o NFT AINDA NÃO FOI MINTADO.\n`);

  // Verificar se o NFT existe (deve falhar)
  try {
      await cpr.read.ownerOf([propostaId]);
      console.log("-> ERRO: O NFT foi mintado prematuramente!");
  } catch (e) {
      console.log("-> Checagem: O NFT ainda não existe, como esperado.\n");
  }

  // 3. Confirmar Insumo (Produtor)
  console.log("3. Produtor confirmando recebimento do insumo...");
  await cpr.write.confirmarRecebimentoInsumo([propostaId], { account: produtor.account });
  
  // Verificar se o NFT existe agora
  const owner = await cpr.read.ownerOf([propostaId]);
  console.log(`-> Insumo confirmado! O NFT foi MINTADO com sucesso na carteira do fornecedor: ${owner}\n`);

  // 4. Liquidar CPR (Fornecedor)
  console.log("4. Fornecedor liquidando a CPR...");
  await cpr.write.liquidarCPR([propostaId], { account: fornecedor.account });
  
  // Verificar se o NFT foi queimado
  try {
      await cpr.read.ownerOf([propostaId]);
      console.log("-> ERRO: O NFT ainda existe!");
  } catch (e) {
      console.log("-> Sucesso: A CPR foi liquidada e o NFT foi QUEIMADO.\n");
  }

  console.log("=== FLUXO CONCLUIDO COM SUCESSO ===");
}

main().catch(console.error);
