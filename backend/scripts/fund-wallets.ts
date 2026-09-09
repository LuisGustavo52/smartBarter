import { network } from "hardhat";
import { parseEther } from "viem";

async function main() {
  const { viem } = await network.create();
  const testClients = await viem.getWalletClients();
  const funder = testClients[0]; // Tem 10.000 ETH no hardhat node
  
  const produtor = "0x009805DBE4F5BeeC5a154C0Ce2B7df1695aa5b2a"; // Fazenda Ouvidor
  const fornecedor1 = "0x6c3E116F3C4F6F308ba124c51C91c29D7a784103"; // Rep. Bayer
  const fornecedor2 = "0xa7dA2AC872Ea65f2db408a0a9Cadf04206E39001"; // Account 2

  const publicClient = await viem.getPublicClient();

  const printBalances = async () => {
    console.log(`\nSaldos atuais:`);
    console.log(`- Funder (Hardhat #0): ${await publicClient.getBalance({address: funder.account.address})}`);
    console.log(`- Produtor (Fazenda): ${await publicClient.getBalance({address: produtor as `0x${string}`})}`);
    console.log(`- Fornecedor 1 (Bayer): ${await publicClient.getBalance({address: fornecedor1 as `0x${string}`})}`);
    console.log(`- Fornecedor 2 (Account 2): ${await publicClient.getBalance({address: fornecedor2 as `0x${string}`})}\n`);
  };

  await printBalances();
  console.log("Financiando as carteiras com 50 ETH falsos cada...");

  await funder.sendTransaction({ to: produtor, value: parseEther("50") });
  await funder.sendTransaction({ to: fornecedor1, value: parseEther("50") });
  await funder.sendTransaction({ to: fornecedor2, value: parseEther("50") });

  console.log("Transferências concluídas!");
  await printBalances();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
