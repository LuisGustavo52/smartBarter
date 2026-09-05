export {};

/**
 * Minimal typing for the EIP-1193 provider MetaMask injects into the page.
 * We only type the surface this app actually uses, on purpose — no
 * dependency on external wallet libraries.
 */
interface Eip1193Provider {
  isMetaMask?: boolean;
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}
