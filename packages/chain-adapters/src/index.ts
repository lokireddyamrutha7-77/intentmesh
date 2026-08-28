import { Intent } from "@intentmesh/protocol-types";
import * as http from "http";
import * as path from "path";
import * as fs from "fs";

export type ExecutionStatus = "PENDING" | "SUBMITTED" | "CONFIRMED" | "FAILED" | "TIMEOUT";

export interface ExecutionResult {
  intentHash: string;
  solver: string;
  sourceChainId: bigint;
  destinationChainId: bigint;
  transactionHash: string;
  blockNumber: number;
  timestamp: number;
  outputAmount: bigint;
  recipient: string;
  destinationToken: string;
  status: ExecutionStatus;
  gasUsed?: number;
  rawReceipt?: any;
  isSimulated?: boolean;
}

export interface IExecutionAdapter {
  simulateExecution(intent: Intent, solver: string, expectedOutput: bigint): Promise<{ canExecute: boolean; estimatedGas: bigint; reason?: string }>;
  execute(intent: Intent, solver: string, outputAmount: bigint, shouldFailSimulated?: boolean): Promise<ExecutionResult>;
  getExecutionStatus(txHash: string): Promise<ExecutionStatus>;
  getReceipt(txHash: string): Promise<ExecutionResult | null>;
}

export class LocalSimulationAdapter implements IExecutionAdapter {
  public readonly sourceChainName: string = "LOCAL SOURCE CHAIN (Chain 31337)";
  public readonly destinationChainName: string = "LOCAL DESTINATION CHAIN (Chain 31338)";
  private readonly receipts: Map<string, ExecutionResult> = new Map();
  private txCounter: number = 1000;

  public async simulateExecution(
    intent: Intent,
    solver: string,
    expectedOutput: bigint
  ): Promise<{ canExecute: boolean; estimatedGas: bigint; reason?: string }> {
    if (expectedOutput < intent.minOutputAmount) {
      return { canExecute: false, estimatedGas: 0n, reason: "OUTPUT_BELOW_MINIMUM" };
    }
    return { canExecute: true, estimatedGas: 65000n };
  }

  public async execute(
    intent: Intent,
    solver: string,
    outputAmount: bigint,
    shouldFailSimulated: boolean = false
  ): Promise<ExecutionResult> {
    this.txCounter++;
    const now = Math.floor(Date.now() / 1000);
    const txHash = `0x${this.txCounter.toString(16).padStart(8, "0")}${intent.intentHash.substring(10, 50)}`;

    if (shouldFailSimulated) {
      const failedResult: ExecutionResult = {
        intentHash: intent.intentHash,
        solver,
        sourceChainId: intent.sourceChainId,
        destinationChainId: intent.destinationChainId,
        transactionHash: txHash,
        blockNumber: 100 + this.txCounter,
        timestamp: now,
        outputAmount: 0n,
        recipient: intent.recipient,
        destinationToken: intent.destinationToken,
        status: "FAILED",
        isSimulated: true,
      };
      this.receipts.set(txHash, failedResult);
      return failedResult;
    }

    const successResult: ExecutionResult = {
      intentHash: intent.intentHash,
      solver,
      sourceChainId: intent.sourceChainId,
      destinationChainId: intent.destinationChainId,
      transactionHash: txHash,
      blockNumber: 100 + this.txCounter,
      timestamp: now,
      outputAmount,
      recipient: intent.recipient,
      destinationToken: intent.destinationToken,
      status: "CONFIRMED",
      gasUsed: 65000,
      isSimulated: true,
      rawReceipt: {
        status: 1,
        transactionHash: txHash,
        blockNumber: 100 + this.txCounter,
        chain: this.destinationChainName,
        from: solver,
        to: intent.recipient,
        token: intent.destinationToken,
        amount: outputAmount.toString(),
      },
    };

    this.receipts.set(txHash, successResult);
    return successResult;
  }

  public async getExecutionStatus(txHash: string): Promise<ExecutionStatus> {
    const res = this.receipts.get(txHash);
    return res ? res.status : "PENDING";
  }

  public async getReceipt(txHash: string): Promise<ExecutionResult | null> {
    return this.receipts.get(txHash) || null;
  }
}

export interface EVMAdapterConfig {
  destinationRpcUrl: string;
  destinationChainId: bigint;
  destinationVaultAddress?: string;
  destinationTokenAddress?: string;
}

export class EVMChainAdapter implements IExecutionAdapter {
  public readonly sourceChainName: string = "LOCAL SOURCE CHAIN (Chain 31337)";
  public readonly destinationChainName: string = "LOCAL DESTINATION CHAIN (Chain 31338)";
  private readonly config: EVMAdapterConfig;
  private readonly fallbackSimulator: LocalSimulationAdapter;
  private readonly receipts: Map<string, ExecutionResult> = new Map();

  constructor(config?: Partial<EVMAdapterConfig>) {
    this.config = {
      destinationRpcUrl: config?.destinationRpcUrl || process.env.DESTINATION_CHAIN_RPC_URL || "http://127.0.0.1:8546",
      destinationChainId: config?.destinationChainId || 31338n,
      destinationVaultAddress: config?.destinationVaultAddress,
      destinationTokenAddress: config?.destinationTokenAddress,
    };
    this.fallbackSimulator = new LocalSimulationAdapter();
  }

  private loadDeployments(): { DestinationVault?: string; MockUSDC?: string } {
    try {
      const deploymentsPath = path.resolve(__dirname, "../../../contracts/deployments/deployments-31338.json");
      if (fs.existsSync(deploymentsPath)) {
        const json = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
        return { DestinationVault: json.DestinationVault, MockUSDC: json.MockUSDC };
      }
    } catch {
      // Ignore errors
    }
    return {};
  }

  private getDestinationVaultAddress(): string {
    if (this.config.destinationVaultAddress) return this.config.destinationVaultAddress;
    const deps = this.loadDeployments();
    return deps.DestinationVault || "0x09635F643e140090A9A8Dcd712eD6285858ceBef";
  }

  private getDestinationTokenAddress(): string {
    if (this.config.destinationTokenAddress) return this.config.destinationTokenAddress;
    const deps = this.loadDeployments();
    return deps.MockUSDC || "0x84eA74d481Ee0A5332c457a4d796187F6Ba67fEB";
  }

  private jsonRpcRequest(method: string, params: any[]): Promise<any> {
    return new Promise((resolve, reject) => {
      const url = new URL(this.config.destinationRpcUrl);
      const payload = JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params });

      const req = http.request(
        {
          hostname: url.hostname,
          port: url.port || 80,
          path: url.pathname,
          method: "POST",
          headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) },
          timeout: 4000,
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            try {
              const parsed = JSON.parse(data);
              if (parsed.error) {
                reject(new Error(parsed.error.message || JSON.stringify(parsed.error)));
              } else {
                resolve(parsed.result);
              }
            } catch (err) {
              reject(err);
            }
          });
        }
      );

      req.on("error", reject);
      req.on("timeout", () => {
        req.destroy();
        reject(new Error("RPC_TIMEOUT"));
      });
      req.write(payload);
      req.end();
    });
  }

  private padAddress(address: string): string {
    return address.toLowerCase().replace(/^0x/, "").padStart(64, "0");
  }

  private padBytes32(hex: string): string {
    return hex.toLowerCase().replace(/^0x/, "").padStart(64, "0");
  }

  private padUint256(amount: bigint): string {
    return amount.toString(16).padStart(64, "0");
  }

  public async simulateExecution(
    intent: Intent,
    solver: string,
    expectedOutput: bigint
  ): Promise<{ canExecute: boolean; estimatedGas: bigint; reason?: string }> {
    if (expectedOutput < intent.minOutputAmount) {
      return { canExecute: false, estimatedGas: 0n, reason: "OUTPUT_BELOW_MINIMUM" };
    }

    try {
      const tokenAddress = intent.destinationToken || this.getDestinationTokenAddress();
      const data = "0x70a08231" + this.padAddress(solver);
      const resHex = await this.jsonRpcRequest("eth_call", [{ to: tokenAddress, data }, "latest"]);
      if (!resHex) return this.fallbackSimulator.simulateExecution(intent, solver, expectedOutput);
      const solverBalance = BigInt(resHex);

      if (solverBalance < expectedOutput) {
        return {
          canExecute: false,
          estimatedGas: 0n,
          reason: `INSUFFICIENT DESTINATION LIQUIDITY (Balance: ${solverBalance / 10n**6n} USDC < Expected: ${expectedOutput / 10n**6n} USDC)`,
        };
      }
      return { canExecute: true, estimatedGas: 150000n };
    } catch {
      return this.fallbackSimulator.simulateExecution(intent, solver, expectedOutput);
    }
  }

  public async execute(
    intent: Intent,
    solver: string,
    outputAmount: bigint,
    shouldFailSimulated: boolean = false
  ): Promise<ExecutionResult> {
    if (shouldFailSimulated) {
      return this.fallbackSimulator.execute(intent, solver, outputAmount, true);
    }

    try {
      const vaultAddress = this.getDestinationVaultAddress();
      const tokenAddress = intent.destinationToken || this.getDestinationTokenAddress();

      // 1. Verify solver balance on Destination Chain
      const balData = "0x70a08231" + this.padAddress(solver);
      const balHex = await this.jsonRpcRequest("eth_call", [{ to: tokenAddress, data: balData }, "latest"]).catch(() => null);
      
      if (!balHex || balHex === "0x" || balHex === "0x0") {
        // RPC unreachable or contract not deployed -> fallback to local simulator
        return this.fallbackSimulator.execute(intent, solver, outputAmount, false);
      }

      const solverBalance = BigInt(balHex);

      if (solverBalance < outputAmount) {
        const now = Math.floor(Date.now() / 1000);
        const failedRes: ExecutionResult = {
          intentHash: intent.intentHash,
          solver,
          sourceChainId: intent.sourceChainId,
          destinationChainId: this.config.destinationChainId,
          transactionHash: `0xfail_liquidity_${Date.now()}`,
          blockNumber: 0,
          timestamp: now,
          outputAmount: 0n,
          recipient: intent.recipient,
          destinationToken: tokenAddress,
          status: "FAILED",
          isSimulated: false,
        };
        this.receipts.set(failedRes.transactionHash, failedRes);
        return failedRes;
      }

      // 2. Submit ERC20 Approve to DestinationVault
      const approveData = "0x095ea7b3" + this.padAddress(vaultAddress) + this.padUint256(outputAmount);
      await this.jsonRpcRequest("eth_sendTransaction", [
        { from: solver, to: tokenAddress, data: approveData },
      ]);

      // 3. Submit depositFulfilment transaction to DestinationVault
      const depositData =
        "0xb7ff04df" +
        this.padBytes32(intent.intentHash) +
        this.padAddress(tokenAddress) +
        this.padUint256(outputAmount) +
        this.padAddress(intent.recipient);

      const realTxHash = await this.jsonRpcRequest("eth_sendTransaction", [
        { from: solver, to: vaultAddress, data: depositData },
      ]);

      // 4. Poll receipt for actual deposit blockNumber and status
      let receipt = null;
      for (let i = 0; i < 10; i++) {
        await new Promise((r) => setTimeout(r, 200));
        receipt = await this.jsonRpcRequest("eth_getTransactionReceipt", [realTxHash]);
        if (receipt && receipt.blockNumber) break;
      }

      const now = Math.floor(Date.now() / 1000);
      const isSuccess = receipt && (receipt.status === "0x1" || receipt.status === 1);

      if (isSuccess) {
        // 4b. Release fulfilment tokens to final recipient on Destination Chain after deposit is confirmed
        const releaseData = "0x35daaf4c" + this.padBytes32(intent.intentHash);
        const ownerAccount = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
        try {
          const relTxHash = await this.jsonRpcRequest("eth_sendTransaction", [
            { from: ownerAccount, to: vaultAddress, data: releaseData },
          ]);
          if (relTxHash) {
            for (let i = 0; i < 10; i++) {
              await new Promise((r) => setTimeout(r, 200));
              const relReceipt = await this.jsonRpcRequest("eth_getTransactionReceipt", [relTxHash]);
              if (relReceipt && relReceipt.blockNumber) {
                if (relReceipt.status !== "0x1" && relReceipt.status !== 1) {
                  console.error("Release transaction reverted on-chain:", relReceipt);
                }
                break;
              }
            }
          }
        } catch (relErr: any) {
          console.error("Release fulfilment error:", relErr.message || relErr);
        }
      }

      // 5. On-Chain State Verification: Check DestinationVault fulfilment record
      const checkData = "0x9a3ba366" + this.padBytes32(intent.intentHash);
      const getFulfilHex = await this.jsonRpcRequest("eth_call", [{ to: vaultAddress, data: checkData }, "latest"]);
      const onChainFulfilledAmount = BigInt(getFulfilHex || "0x0");

      const result: ExecutionResult = {
        intentHash: intent.intentHash,
        solver,
        sourceChainId: intent.sourceChainId,
        destinationChainId: this.config.destinationChainId,
        transactionHash: realTxHash,
        blockNumber: receipt?.blockNumber ? parseInt(receipt.blockNumber, 16) : 100,
        timestamp: now,
        outputAmount: isSuccess && onChainFulfilledAmount >= intent.minOutputAmount ? outputAmount : 0n,
        recipient: intent.recipient,
        destinationToken: tokenAddress,
        status: isSuccess && onChainFulfilledAmount >= intent.minOutputAmount ? "CONFIRMED" : "FAILED",
        gasUsed: receipt?.gasUsed ? parseInt(receipt.gasUsed, 16) : 120000,
        isSimulated: false,
        rawReceipt: receipt || { transactionHash: realTxHash, status: 1 },
      };

      this.receipts.set(realTxHash, result);
      return result;
    } catch {
      return this.fallbackSimulator.execute(intent, solver, outputAmount, false);
    }
  }

  public async getExecutionStatus(txHash: string): Promise<ExecutionStatus> {
    const res = this.receipts.get(txHash);
    if (res) return res.status;
    try {
      const receipt = await this.jsonRpcRequest("eth_getTransactionReceipt", [txHash]);
      if (!receipt) return "PENDING";
      return receipt.status === "0x1" || receipt.status === 1 ? "CONFIRMED" : "FAILED";
    } catch {
      return "PENDING";
    }
  }

  public async getReceipt(txHash: string): Promise<ExecutionResult | null> {
    return this.receipts.get(txHash) || null;
  }
}
