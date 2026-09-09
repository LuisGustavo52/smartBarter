import { network } from "hardhat";

async function main() {
  const { viem } = await network.create();
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const fornecedorAddress = "0xa7dA2AC872Ea65f2db408a0a9Cadf04206E39001";
  const cpr = await viem.getContractAt("SmartBarterCPR", contractAddress);

  console.log(`\n=== Chamando getPropostasPendentesPorFornecedor para ${fornecedorAddress} ===`);
  try {
    const result = await cpr.read.getPropostasPendentesPorFornecedor([fornecedorAddress]);
    console.log(`\nRetorno bruto:`, result);
    const ids = result[0];
    const pendentes = result[1];
    
    console.log(`\nIDs retornados: ${ids}`);
    console.log(`Propostas retornadas:`);
    for (let i = 0; i < pendentes.length; i++) {
        console.log(`[${i}] Produtor: ${pendentes[i].produtor}, Insumo: ${pendentes[i].insumo}`);
    }
  } catch (e: any) {
    console.error("Erro ao chamar função:", e.message);
  }
}

main().catch(console.error);
