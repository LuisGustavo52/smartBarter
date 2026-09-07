import { network } from "hardhat";

async function main() {
  const { viem } = await network.create();
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const cpr = await viem.getContractAt("SmartBarterCPR", contractAddress);

  console.log(`\n=== Lendo propostas criadas ===`);

  for (let i = 0n; i < 20n; i++) {
    try {
      const proposta = await cpr.read.propostas([i]);
      if (proposta[0] === "0x0000000000000000000000000000000000000000") {
        console.log(`\nFim das propostas. Total encontradas: ${i}`);
        break;
      }
      console.log(`\nProposta ID: ${i}`);
      console.log(`  Produtor:   ${proposta[0]}`);
      console.log(`  Fornecedor: ${proposta[1]}`);
      console.log(`  Sacas:      ${proposta[2]}`);
      console.log(`  Insumo:     ${proposta[3]}`);
      console.log(`  Ativa:      ${proposta[4]}`);
      console.log(`  Pendente:   ${proposta[5]}`);
    } catch (e: any) {
      console.log(`\nProposta ID: ${i} -> Erro ao ler: ${e.message}`);
    }
  }
}

main().catch(console.error);
