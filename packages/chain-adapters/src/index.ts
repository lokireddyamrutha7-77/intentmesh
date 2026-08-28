import { Intent } from "@intentmesh/protocol-types";

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
  rawReceipt?: any;
}

export interface IExecutionAdapter {
  simulateExecution(intent: Intent, solver: string, expectedOutput: bigint): Promise<{ canExecute: boolean; estimatedGas: bigint }>;
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
  ): Promise<{ canExecute: boolean; estimatedGas: bigint }> {
    if (expectedOutput < intent.minOutputAmount) {
      return { canExecute: false, estimatedGas: 0n };
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
