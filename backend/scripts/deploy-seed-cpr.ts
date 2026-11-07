import { network } from "hardhat";

async function main() {
  const { viem } = await network.create({ network: "localhost" });
  const [deployer, produtor] = await viem.getWalletClients();
  const cpr = await viem.deployContract("SmartBarterCPR");

  const hash = await cpr.write.emitirCPR([
    produtor.account.address,
    100n,
    "Insumo de teste",
    "10 unidades",
    "2026/2027",
    "Arábica Borges",
    "seed-proposta",
  ], { account: deployer.account });
  const publicClient = await viem.getPublicClient();
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  const tokenId = 0n;
  const entregaHash = await cpr.write.confirmarEntrega([tokenId], {
    account: produtor.account,
  });
  await publicClient.waitForTransactionReceipt({ hash: entregaHash });

  console.log(JSON.stringify({
    contractAddress: cpr.address,
    tokenId: tokenId.toString(),
    emissaoTx: receipt.transactionHash,
    entregaTx: entregaHash,
    fornecedorWallet: deployer.account.address,
    produtorWallet: produtor.account.address,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
