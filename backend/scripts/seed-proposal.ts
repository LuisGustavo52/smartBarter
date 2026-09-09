import { network } from "hardhat";

async function main() {
  const { viem } = await network.create();
  const publicClient = await viem.getPublicClient();
  const testClients = await viem.getWalletClients();
  const produtor = testClients[0];
  const FORNECEDOR_ADDRESS = "0x6c3E116F3C4F6F308ba124c51C91c29D7a784103";
  
  const cprAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const cpr = await viem.getContractAt("SmartBarterCPR", cprAddress);

  console.log(`Propondo CPR do Produtor Local (${produtor.account.address}) para o Fornecedor (${FORNECEDOR_ADDRESS})...`);

  const txHash = await cpr.write.proporCPR([
    FORNECEDOR_ADDRESS,
    100n,
    "Café Arabico, Safra 2024/2025"
  ]);

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  console.log("Transação confirmada! Hash:", receipt.transactionHash);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
