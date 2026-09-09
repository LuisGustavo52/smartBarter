import { network } from "hardhat";

async function main() {
  const { viem } = await network.create();
  const publicClient = await viem.getPublicClient();

  const contractAddress = "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853";
  const accountAddress = "0x009805DBE4F5BeeC5a154C0Ce2B7df1695aa5b2a";
  
  console.log("1. Account adress atual:", accountAddress);

  const logs = await publicClient.getLogs({
    address: contractAddress,
    event: {
      type: 'event',
      name: 'PropostaCriada',
      inputs: [
        { type: 'uint256', name: 'propostaId', indexed: true },
        { type: 'address', name: 'produtor', indexed: true },
        { type: 'address', name: 'fornecedor', indexed: true },
        { type: 'uint256', name: 'sacas' },
        { type: 'string', name: 'insumo' }
      ]
    },
    fromBlock: 0n,
    toBlock: 'latest'
  });

  console.log("2. Total de eventos PropostaCriada encontrados:", logs.length);
  const eventosBrutos = logs.map(e => ({
      id: e.args.propostaId?.toString(),
      produtor: e.args.produtor,
      fornecedor: e.args.fornecedor
  }));
  console.log("Eventos brutos:", eventosBrutos);

  const meusEventos = logs.filter((e) => {
    const eProdutor = e.args.produtor?.toLowerCase();
    const accAddress = accountAddress.toLowerCase();
    const matches = eProdutor === accAddress;
    console.log(`3. Filtro produtor: [Evento] ${eProdutor} vs [Account] ${accAddress} => ${matches}`);
    return matches;
  });

  const cpr = await viem.getContractAt("SmartBarterCPR", contractAddress);

  const propostasAtivas = [];
  for (const e of meusEventos) {
    const pId = e.args.propostaId;
    if (pId !== undefined) {
      const p = await cpr.read.propostas([pId]);
      console.log(`4. Lendo status da Proposta ID ${pId.toString()}: ativa=${p[4]}, pendente=${p[5]}, insumoConfirmado=${p[6]}`);
      
      const condition = p[4] === true && p[6] === false;
      console.log(`   -> Condição (p[4]===true && p[6]===false) => ${condition}`);

      if (condition) {
        propostasAtivas.push(pId);
      }
    }
  }
}

main().catch(console.error);
