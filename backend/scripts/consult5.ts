import { network } from "hardhat";

async function main() {
  const { viem } = await network.create();
  const contractAddress = "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853";
  const cpr = await viem.getContractAt("SmartBarterCPR", contractAddress);

  for (let i = 0n; i < 20n; i++) {
    try {
      const value = await cpr.read.cprs([i]);
      if (value[0] === "0x0000000000000000000000000000000000000000") {
        console.log(`Fim das CPRs. Total encontradas: ${i}`);
        break;
      }
      console.log(`CPR ${i}: produtor=${value[0]}, fornecedor=${value[1]}, sacas=${value[2]}, insumo=${value[3]}, quantidade=${value[4]}, entregue=${value[9]}, liquidada=${value[10]}`);
    } catch (error) {
      console.log(`Fim das CPRs no ID ${i}: ${error instanceof Error ? error.message : error}`);
      break;
    }
  }
}

main().catch(console.error);
