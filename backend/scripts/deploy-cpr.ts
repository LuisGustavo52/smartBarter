import { network } from "hardhat";

async function main() {
  console.log("Iniciando deploy do SmartBarterCPR...");
  const { viem } = await network.create({ network: "localhost" });
  const cpr = await viem.deployContract("SmartBarterCPR");
  console.log(`SmartBarterCPR deployed to: ${cpr.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
