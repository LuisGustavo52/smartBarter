import { network } from "hardhat";
import { formatEther } from "viem";

async function main() {
  console.log("Iniciando consulta RPC local...");
  try {
    const { viem } = await network.create();
    const publicClient = await viem.getPublicClient();
    
    // Balances
    const bal1 = await publicClient.getBalance({ address: "0x009805DBE4F5BeeC5a154C0Ce2B7df1695aa5b2a" });
    const bal2 = await publicClient.getBalance({ address: "0xa7dA2AC872Ea65f2db408a0a9Cadf04206E39001" });
    
    console.log(`\n=== SALDOS ===`);
    console.log(`Fazenda Ouvidor (0x009805DBE4F5BeeC5a154C0Ce2B7df1695aa5b2a): ${formatEther(bal1)} ETH`);
    console.log(`Account 2       (0xa7dA2AC872Ea65f2db408a0a9Cadf04206E39001): ${formatEther(bal2)} ETH`);

    // Contract
    const contractAddress = "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853";
    console.log(`\n=== PROPOSTAS NO CONTRATO ${contractAddress} ===`);
    
    // Checar se ha codigo no endereco
    const code = await publicClient.getBytecode({ address: contractAddress });
    if (!code || code === "0x") {
       console.log("-> ERRO: Nao ha codigo implantado neste endereco!");
       return;
    }

    const cpr = await viem.getContractAt("SmartBarterCPR", contractAddress);
    let id = 1n;
    while (true) {
      try {
        const p = await cpr.read.propostas([id]) as any;
        console.log(`ID ${id}: Produtor: ${p[0]}, Fornecedor: ${p[1]}, Sacas: ${p[2]}, Insumo: ${p[3]}, Ativa: ${p[4]}, Pendente: ${p[5]}, Confirmado: ${p[6]}`);
        id++;
        if (id > 50n) {
           console.log("Muitas propostas, parando no ID 50.");
           break;
        }
      } catch (e: any) {
        if (e.message.includes("revert") || e.message.includes("out of bounds")) {
           console.log(`-> Fim das propostas (ID ${id} reverteu/inexistente).`);
        } else {
           console.log(`-> Erro na leitura do ID ${id}: ${e.message}`);
        }
        break;
      }
    }
  } catch (err: any) {
    console.error("Erro critico de conexao:", err.message);
  }
}

main().catch(console.error);
