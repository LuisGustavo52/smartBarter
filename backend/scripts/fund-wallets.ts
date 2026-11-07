import { readFileSync } from "node:fs";
import { network } from "hardhat";
import { isAddress, parseEther } from "viem";

interface WalletEntry {
  label: string;
  address: string;
  eth: string;
}

async function main() {
  const { viem } = await network.create();
  const testClients = await viem.getWalletClients();
  const funder = testClients[0]; // Tem 10.000 ETH no hardhat node
  const publicClient = await viem.getPublicClient();

  const raw = readFileSync(new URL("./wallets.json", import.meta.url), "utf-8");
  const wallets: WalletEntry[] = JSON.parse(raw);

  const validWallets: WalletEntry[] = [];
  for (const w of wallets) {
    if (!isAddress(w.address)) {
      console.warn(`[AVISO] Endereço inválido para ${w.label} (${w.address}). Pulando...`);
      continue;
    }
    validWallets.push(w);
  }

  const printBalances = async () => {
    console.log(`\nSaldos atuais:`);
    console.log(`- Funder (Hardhat #0): ${await publicClient.getBalance({ address: funder.account.address })}`);
    for (const w of validWallets) {
      console.log(`- ${w.label}: ${await publicClient.getBalance({ address: w.address as `0x${string}` })}`);
    }
    console.log("");
  };

  await printBalances();
  console.log("Financiando as carteiras...");

  for (const w of validWallets) {
    console.log(`Enviando ${w.eth} ETH para ${w.label} (${w.address})...`);
    await funder.sendTransaction({
      to: w.address as `0x${string}`,
      value: parseEther(w.eth),
    });
  }

  console.log("Transferências concluídas!");
  await printBalances();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
