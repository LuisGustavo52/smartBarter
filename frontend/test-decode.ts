import { prepareEvent, parseEventLogs } from "thirdweb";

async function main() {
    const rawResponse = await fetch("http://127.0.0.1:8545", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "eth_getLogs",
            params: [{
                fromBlock: "0x0",
                toBlock: "latest"
            }]
        })
    });
    const rawData = await rawResponse.json();

    const event = prepareEvent({
        signature: "event PropostaCriada(uint256 indexed propostaId, address indexed produtor, address indexed fornecedor, uint256 sacas, string insumo)",
    });

    try {
        const decoded = parseEventLogs({
            logs: rawData.result,
            events: [event],
        });
        console.log("DECODED length:", decoded.length);
        if (decoded.length > 0) {
            console.log(decoded[0].args);
        }
    } catch (err) {
        console.error(err);
    }
}
main();
