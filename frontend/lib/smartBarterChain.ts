import { defineChain } from "thirdweb/chains";

export const smartBarterLocalChain = defineChain({
  id: 31337,
  name: "SmartBarter Local",
  rpc: "http://127.0.0.1:8545",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
});
