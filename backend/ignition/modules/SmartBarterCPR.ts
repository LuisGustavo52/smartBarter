import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("SmartBarterCPRModule", (m) => {
  const cpr = m.contract("SmartBarterCPR");
  return { cpr };
});
