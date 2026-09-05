const CHAIN_NAMES: Record<string, string> = {
  "0x1": "Ethereum Mainnet",
  "0xaa36a7": "Sepolia",
  "0xa": "OP Mainnet",
  "0x2105": "Base",
  "0x89": "Polygon",
  "0x539": "Localhost",
  "0x7a69": "Hardhat Local",
};

export function truncateAddress(address: string): string {
  if (address.length < 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function chainLabel(chainId: string): string {
  return CHAIN_NAMES[chainId.toLowerCase()] ?? `Chain ${parseInt(chainId, 16)}`;
}
