import { readContract } from "thirdweb";
import { fetchRawEvents } from "@/lib/blockchain-queries";

export const CPR_EVENT_SIGNATURE =
  "event CPREmitida(uint256 indexed tokenId, address indexed produtor, address indexed fornecedor, uint256 sacas, string insumo, string quantidadeInsumo, string safra, string tipoCafe, string idPropostaOffchain)";

export type Cpr = {
  tokenId: bigint;
  produtor: string;
  fornecedor: string;
  sacas: bigint;
  insumo: string;
  quantidadeInsumo: string;
  safra: string;
  tipoCafe: string;
  idPropostaOffchain: string;
  aguardandoEntrega: boolean;
  entregue: boolean;
  liquidada: boolean;
  donoAtual: string | null;
};

export async function carregarCprs(contract: any, wallet: string): Promise<Cpr[]> {
  const events = await fetchRawEvents(contract.address, CPR_EVENT_SIGNATURE);
  const result: Cpr[] = [];
  for (const event of events) {
    const tokenId = event.args.tokenId as bigint;
    const data = (await readContract({
      contract,
      method:
        "function cprs(uint256) view returns (address produtor, address fornecedor, uint256 sacas, string insumo, string quantidadeInsumo, string safra, string tipoCafe, string idPropostaOffchain, bool aguardandoEntrega, bool entregue, bool liquidada)",
      params: [tokenId],
    })) as readonly [
      string,
      string,
      bigint,
      string,
      string,
      string,
      string,
      string,
      boolean,
      boolean,
      boolean
    ];
    const produtor = data[0];
    const fornecedor = data[1];
    if (
      produtor.toLowerCase() !== wallet.toLowerCase() &&
      fornecedor.toLowerCase() !== wallet.toLowerCase()
    ) {
      continue;
    }
    let donoAtual: string | null = null;
    try {
      donoAtual = (await readContract({
        contract,
        method: "function ownerOf(uint256) view returns (address)",
        params: [tokenId],
      })) as string;
    } catch {
      donoAtual = null;
    }
    result.push({
      tokenId,
      produtor,
      fornecedor,
      sacas: data[2],
      insumo: data[3],
      quantidadeInsumo: data[4],
      safra: data[5],
      tipoCafe: data[6],
      idPropostaOffchain: data[7],
      aguardandoEntrega: data[8],
      entregue: data[9],
      liquidada: data[10],
      donoAtual,
    });
  }
  return result.reverse();
}
