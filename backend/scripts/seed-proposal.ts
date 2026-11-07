import { network } from "hardhat";

async function main() {
  const { viem } = await network.create();
  const clients = await viem.getWalletClients();
  const fornecedor = clients[0];
  const produtorAddress = clients[1].account.address;
  const cprAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const cpr = await viem.getContractAt("SmartBarterCPR", cprAddress);

  const txHash = await cpr.write.emitirCPR([
    produtorAddress,
    100n,
    "Café",
    "100 sacas",
    "2026/2027",
    "Arábica",
    "proposta-seed",
  ], { account: fornecedor.account });

  const publicClient = await viem.getPublicClient();
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  console.log("CPR emitida. Hash:", receipt.transactionHash);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
