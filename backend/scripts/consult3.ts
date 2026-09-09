import { network } from "hardhat";
import { formatEther } from "viem";

async function main() {
  const { viem } = await network.create();
  const publicClient = await viem.getPublicClient();

  // a) eth_blockNumber
  const blockNumber = await publicClient.getBlockNumber();
  console.log(`a) eth_blockNumber: ${blockNumber}`);

  // b) getBalance 0x009805...
  const bal1 = await publicClient.getBalance({ address: "0x009805DBE4F5BeeC5a154C0Ce2B7df1695aa5b2a" });
  console.log(`b) getBalance(Fazenda Ouvidor): ${formatEther(bal1)} ETH`);

  // c) getBalance 0xa7dA2A...
  const bal2 = await publicClient.getBalance({ address: "0xa7dA2AC872Ea65f2db408a0a9Cadf04206E39001" });
  console.log(`c) getBalance(Account 2): ${formatEther(bal2)} ETH`);

  // d) getTransactionReceipt hash 0x772e9e...b71f2
  let foundTx = null;
  let foundReceipt = null;

  for (let i = 0n; i <= blockNumber; i++) {
    const block = await publicClient.getBlock({ blockNumber: i, includeTransactions: true });
    for (const tx of block.transactions) {
      if (typeof tx === 'object' && tx.hash) {
          const hashStr = tx.hash.toLowerCase();
          if (hashStr.startsWith("0x772e9e") && hashStr.endsWith("b71f2")) {
              foundTx = tx;
              foundReceipt = await publicClient.getTransactionReceipt({ hash: tx.hash });
          }
      } else if (typeof tx === 'string') {
          const hashStr = tx.toLowerCase();
          if (hashStr.startsWith("0x772e9e") && hashStr.endsWith("b71f2")) {
              foundTx = tx;
              foundReceipt = await publicClient.getTransactionReceipt({ hash: tx as `0x${string}` });
          }
      }
    }
  }

  if (foundReceipt) {
      console.log(`d) getTransactionReceipt (hash encontrado: ${foundReceipt.transactionHash}): status = ${foundReceipt.status === "success" ? 1 : 0}, blockNumber = ${foundReceipt.blockNumber}`);
  } else {
      console.log(`d) getTransactionReceipt: Nenhuma transacao correspondente a 0x772e9e...b71f2 foi encontrada nos blocos (0 a ${blockNumber}).`);
  }

  // e) getTransactionCount
  const nonce = await publicClient.getTransactionCount({ address: "0xa7dA2AC872Ea65f2db408a0a9Cadf04206E39001" });
  console.log(`e) getTransactionCount(Account 2): ${nonce}`);
}

main().catch(console.error);
