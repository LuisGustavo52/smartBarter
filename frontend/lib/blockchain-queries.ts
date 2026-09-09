import { prepareEvent, parseEventLogs } from "thirdweb";

/**
 * Utilitário para buscar eventos brutos usando eth_getLogs diretamente no RPC local.
 * Contorna bugs conhecidos de silent empty results do thirdweb getContractEvents em localhost.
 */
export async function fetchRawEvents(contractAddress: string, eventSignature: string): Promise<any[]> {
  const event = prepareEvent({
    signature: eventSignature as any,
  });

  const rawResponse = await fetch("http://127.0.0.1:8545", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getLogs",
      params: [{
        address: contractAddress,
        fromBlock: "0x0",
        toBlock: "latest"
      }]
    })
  });

  if (!rawResponse.ok) {
    throw new Error("Falha HTTP ao buscar logs");
  }

  const rawData = await rawResponse.json();

  if (rawData.error) {
    throw new Error(rawData.error.message || "Erro no RPC");
  }

  const events = parseEventLogs({
    logs: rawData.result || [],
    events: [event],
  });

  return events;
}
