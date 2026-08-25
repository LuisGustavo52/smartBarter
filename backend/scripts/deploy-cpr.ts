import { ethers } from "hardhat";

async function main() {
  console.log("Iniciando deploy do SmartBarterCPR...");
  
  const CPR = await ethers.getContractFactory("SmartBarterCPR");
  const cpr = await CPR.deploy();

  await cpr.waitForDeployment();
  const address = await cpr.getAddress();

  console.log(`SmartBarterCPR deployed to: ${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
