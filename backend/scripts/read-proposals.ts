import { network } from "hardhat";

async function main() {
  const { viem } = await network.create();
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const cpr = await viem.getContractAt("SmartBarterCPR", contractAddress);
  const value = await cpr.read.cprs([0n]);

  console.log("CPR 0:", value);
}

main().catch(console.error);
