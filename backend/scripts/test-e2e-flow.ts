import { network } from "hardhat";

async function main() {
  const { viem } = await network.create();
  const contractAddress = "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853";
  const cpr = await viem.getContractAt("SmartBarterCPR", contractAddress);
  const clients = await viem.getWalletClients();
  const produtor = clients[1];
  const fornecedor = clients[2];
  const tokenId = 0n;

  console.log("1. Fornecedor emitindo CPR...");
  await cpr.write.emitirCPR([
    produtor.account.address,
    100n,
    "Sementes Teste",
    "10 toneladas",
    "2026/2027",
    "Arábica Borges",
    "proposta-e2e",
  ], { account: fornecedor.account });

  console.log("2. Produtor confirmando entrega...");
  await cpr.write.confirmarEntrega([tokenId], { account: produtor.account });

  console.log("3. Fornecedor liquidando CPR...");
  await cpr.write.liquidarCPR([tokenId], { account: fornecedor.account });
  console.log("Fluxo concluído com sucesso.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
