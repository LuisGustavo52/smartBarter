import { network } from "hardhat";
import { parseEther } from "viem";

async function main() {
  const { viem } = await network.create();
  const testClients = await viem.getWalletClients();
  const funder = testClients[0]; // Tem 10.000 ETH no hardhat node
  
  const produtor = "0x009805DBE4F5BeeC5a154C0Ce2B7df1695aa5b2a";
  const fornecedor = "0x6c3E116F3C4F6F308ba124c51C91c29D7a784103";

  console.log(`Funder balance: ${await viem.getPublicClient().then(c => c.getBalance({address: funder.account.address}))}`);
  console.log("Financiando as carteiras de teste com 10 ETH falsos cada...");

  const hash1 = await funder.sendTransaction({
    to: produtor,
    value: parseEther("10"),
  });
  console.log(`Enviado 10 ETH para o Produtor (${produtor}) - Hash: ${hash1}`);

  const hash2 = await funder.sendTransaction({
    to: fornecedor,
    value: parseEther("10"),
  });
  console.log(`Enviado 10 ETH para o Fornecedor (${fornecedor}) - Hash: ${hash2}`);

  console.log("Sucesso! As carteiras agora possuem saldo na rede localhost.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
