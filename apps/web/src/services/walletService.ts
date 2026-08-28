import { DEFAULT_SOURCE_CHAIN, getChainConfig, SUPPORTED_CHAINS } from "../config/chainConfig";

export interface WalletState {
  account: string | null;
  chainIdDecimal: number | null;
  isConnected: boolean;
  isWrongNetwork: boolean;
  error: string | null;
}

let walletState: WalletState = {
  account: null,
  chainIdDecimal: null,
  isConnected: false,
  isWrongNetwork: false,
  error: null,
};

type StateChangeCallback = (state: WalletState) => void;
const listeners: Set<StateChangeCallback> = new Set();

function notifyListeners() {
  listeners.forEach(cb => cb({ ...walletState }));
}

export function subscribeWalletState(cb: StateChangeCallback): () => void {
  listeners.add(cb);
  cb({ ...walletState });
  return () => listeners.delete(cb);
}

export function getWalletState(): WalletState {
  return { ...walletState };
}

export function isEthereumAvailable(): boolean {
  return typeof window !== "undefined" && typeof (window as any).ethereum !== "undefined";
}

export async function connectWallet(): Promise<WalletState> {
  if (!isEthereumAvailable()) {
    walletState.error = "No injected EVM wallet found. Please install MetaMask or an EIP-1193 provider.";
    notifyListeners();
    return walletState;
  }

  const ethereum = (window as any).ethereum;

  try {
    const accounts = await ethereum.request({ method: "eth_requestAccounts" });
    const chainIdHex = await ethereum.request({ method: "eth_chainId" });
    const chainIdDecimal = parseInt(chainIdHex, 16);

    walletState.account = accounts[0] ? accounts[0].toLowerCase() : null;
    walletState.chainIdDecimal = chainIdDecimal;
    walletState.isConnected = !!walletState.account;
    walletState.isWrongNetwork = chainIdDecimal !== DEFAULT_SOURCE_CHAIN.chainIdDecimal;
    walletState.error = null;

    attachEthereumListeners();
    notifyListeners();
  } catch (err: any) {
    walletState.error = err.message || "Failed to connect EVM wallet.";
    notifyListeners();
  }

  return walletState;
}

export function disconnectWallet() {
  walletState.account = null;
  walletState.isConnected = false;
  walletState.isWrongNetwork = false;
  walletState.error = null;
  notifyListeners();
}

export async function switchNetwork(targetChainIdDecimal: number): Promise<boolean> {
  if (!isEthereumAvailable()) return false;
  const ethereum = (window as any).ethereum;
  const targetChain = getChainConfig(targetChainIdDecimal);
  if (!targetChain) return false;

  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: targetChain.chainIdHex }],
    });
    return true;
  } catch (switchErr: any) {
    if (switchErr.code === 4902 || switchErr.message?.includes("Unrecognized chain")) {
      try {
        await ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: targetChain.chainIdHex,
              chainName: targetChain.chainName,
              rpcUrls: [targetChain.rpcUrl],
              nativeCurrency: targetChain.nativeCurrency,
              blockExplorerUrls: targetChain.blockExplorerUrl ? [targetChain.blockExplorerUrl] : undefined,
            },
          ],
        });
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
}

let listenersAttached = false;

function attachEthereumListeners() {
  if (listenersAttached || !isEthereumAvailable()) return;
  listenersAttached = true;
  const ethereum = (window as any).ethereum;

  ethereum.on("accountsChanged", (accounts: string[]) => {
    walletState.account = accounts[0] ? accounts[0].toLowerCase() : null;
    walletState.isConnected = !!walletState.account;
    notifyListeners();
  });

  ethereum.on("chainChanged", (chainIdHex: string) => {
    const chainIdDecimal = parseInt(chainIdHex, 16);
    walletState.chainIdDecimal = chainIdDecimal;
    walletState.isWrongNetwork = chainIdDecimal !== DEFAULT_SOURCE_CHAIN.chainIdDecimal;
    notifyListeners();
  });
}

// JSON-RPC Helpers
function padAddress(addr: string): string {
  return addr.toLowerCase().replace("0x", "").padStart(64, "0");
}

function padUint256(value: bigint | number | string): string {
  return BigInt(value).toString(16).padStart(64, "0");
}

function padBytes32(bytes32OrString: string): string {
  const clean = bytes32OrString.startsWith("0x") ? bytes32OrString.substring(2) : bytes32OrString;
  if (clean.length === 64) return clean;
  // If short string, convert to hex string
  let hex = "";
  for (let i = 0; i < bytes32OrString.length; i++) {
    hex += bytes32OrString.charCodeAt(i).toString(16);
  }
  return hex.padEnd(64, "0");
}

export async function ethCall(rpcUrl: string, to: string, calldata: string): Promise<string> {
  if (isEthereumAvailable()) {
    try {
      const res = await (window as any).ethereum.request({
        method: "eth_call",
        params: [{ to, data: calldata }, "latest"],
      });
      if (res && res !== "0x") return res;
    } catch {
      // Fallback to direct HTTP RPC query
    }
  }

  try {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_call",
        params: [{ to, data: calldata }, "latest"],
      }),
    });
    const json = (await response.json()) as any;
    return json?.result || "0x0";
  } catch {
    return "0x0";
  }
}

export async function readERC20Balance(tokenAddress: string, userAddress: string, rpcUrl: string): Promise<bigint> {
  if (!tokenAddress || !userAddress) return 0n;
  const calldata = "0x70a08231" + padAddress(userAddress);
  const resultHex = await ethCall(rpcUrl, tokenAddress, calldata);
  try {
    return BigInt(resultHex);
  } catch {
    return 0n;
  }
}

export async function readERC20Allowance(tokenAddress: string, ownerAddress: string, spenderAddress: string, rpcUrl: string): Promise<bigint> {
  if (!tokenAddress || !ownerAddress || !spenderAddress) return 0n;
  const calldata = "0xdd62ed3e" + padAddress(ownerAddress) + padAddress(spenderAddress);
  const resultHex = await ethCall(rpcUrl, tokenAddress, calldata);
  try {
    return BigInt(resultHex);
  } catch {
    return 0n;
  }
}

export async function pollTxReceipt(rpcUrl: string, txHash: string, timeoutMs: number = 30000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      let receipt: any = null;
      if (isEthereumAvailable()) {
        receipt = await (window as any).ethereum.request({
          method: "eth_getTransactionReceipt",
          params: [txHash],
        });
      }
      if (!receipt) {
        const res = await fetch(rpcUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getTransactionReceipt", params: [txHash] }),
        });
        const json = (await res.json()) as any;
        receipt = json?.result;
      }

      if (receipt && receipt.status === "0x1") {
        return true;
      } else if (receipt && receipt.status === "0x0") {
        return false;
      }
    } catch {
      // Retry polling
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  return false;
}

export async function executeApprove(
  tokenAddress: string,
  spenderAddress: string,
  amount: bigint
): Promise<{ txHash: string; confirmed: boolean }> {
  if (!isEthereumAvailable() || !walletState.account) {
    throw new Error("Wallet not connected");
  }

  const calldata = "0x095ea7b3" + padAddress(spenderAddress) + padUint256(amount);
  const ethereum = (window as any).ethereum;

  const txHash = await ethereum.request({
    method: "eth_sendTransaction",
    params: [
      {
        from: walletState.account,
        to: tokenAddress,
        data: calldata,
      },
    ],
  });

  const confirmed = await pollTxReceipt(DEFAULT_SOURCE_CHAIN.rpcUrl, txHash);
  return { txHash, confirmed };
}

export async function executeCreateAndFundIntentOnChain(
  intentRegistryAddress: string,
  params: {
    sourceChainId: bigint;
    sourceToken: string;
    sourceAmount: bigint;
    destinationChainId: bigint;
    destinationToken: string;
    recipient: string;
    minOutputAmount: bigint;
    deadline: bigint;
    verificationPolicy: string;
  }
): Promise<{ txHash: string; confirmed: boolean }> {
  if (!isEthereumAvailable() || !walletState.account) {
    throw new Error("Wallet not connected");
  }

  const selector = "0x068bb808";
  const calldata =
    selector +
    padUint256(params.sourceChainId) +
    padAddress(params.sourceToken) +
    padUint256(params.sourceAmount) +
    padUint256(params.destinationChainId) +
    padAddress(params.destinationToken) +
    padAddress(params.recipient) +
    padUint256(params.minOutputAmount) +
    padUint256(params.deadline) +
    padBytes32(params.verificationPolicy);

  const ethereum = (window as any).ethereum;

  const txHash = await ethereum.request({
    method: "eth_sendTransaction",
    params: [
      {
        from: walletState.account,
        to: intentRegistryAddress,
        data: calldata,
      },
    ],
  });

  const confirmed = await pollTxReceipt(DEFAULT_SOURCE_CHAIN.rpcUrl, txHash);
  return { txHash, confirmed };
}
