export interface ChainDetails {
  chainIdHex: string;
  chainIdDecimal: number;
  chainName: string;
  rpcUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorerUrl?: string;
  isSupported: boolean;
}

export const SUPPORTED_CHAINS: Record<number, ChainDetails> = {
  31337: {
    chainIdHex: "0x7a69",
    chainIdDecimal: 31337,
    chainName: "Anvil Local Source Chain",
    rpcUrl: "http://127.0.0.1:8545",
    nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
    isSupported: true,
  },
  31338: {
    chainIdHex: "0x7a6a",
    chainIdDecimal: 31338,
    chainName: "Anvil Local Destination Chain",
    rpcUrl: "http://127.0.0.1:8546",
    nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
    isSupported: true,
  },
  11155111: {
    chainIdHex: "0xaa36a7",
    chainIdDecimal: 11155111,
    chainName: "Ethereum Sepolia Testnet",
    rpcUrl: "https://rpc.sepolia.org",
    nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
    blockExplorerUrl: "https://sepolia.etherscan.io",
    isSupported: true,
  },
};

export const DEFAULT_SOURCE_CHAIN = SUPPORTED_CHAINS[31337];
export const DEFAULT_DEST_CHAIN = SUPPORTED_CHAINS[31338];

export function getChainConfig(chainId: number): ChainDetails | null {
  return SUPPORTED_CHAINS[chainId] || null;
}
