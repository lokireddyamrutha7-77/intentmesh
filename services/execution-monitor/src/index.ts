import { ExecutionResult, IExecutionAdapter } from "@intentmesh/chain-adapters";
import { Intent } from "@intentmesh/protocol-types";

export type ExecutionObservationStatus = "CONFIRMED" | "FAILED" | "TIMEOUT" | "PENDING";

export interface ExecutionObservation {
  intentHash: string;
  solver: string;
  status: ExecutionObservationStatus;
  executionResult?: ExecutionResult;
  failureReason?: string;
  timestamp: number;
}

export class ExecutionMonitorService {
  private readonly adapter: IExecutionAdapter;
  private readonly observations: Map<string, ExecutionObservation> = new Map();

  constructor(adapter: IExecutionAdapter) {
    this.adapter = adapter;
  }

  public async observeExecution(
    intent: Intent,
    solver: string,
    txHash: string,
    timeoutWindowSeconds: number = 180
  ): Promise<ExecutionObservation> {
    const now = Math.floor(Date.now() / 1000);
    const receipt = await this.adapter.getReceipt(txHash);

    if (!receipt) {
      // Check if timed out
      if (now > Number(intent.createdAt) + timeoutWindowSeconds) {
        const timeoutObs: ExecutionObservation = {
          intentHash: intent.intentHash,
          solver,
          status: "TIMEOUT",
          failureReason: "EXECUTION_TIMEOUT_EXCEEDED",
          timestamp: now,
        };
        this.observations.set(intent.intentHash, timeoutObs);
        return timeoutObs;
      }
      return {
        intentHash: intent.intentHash,
        solver,
        status: "PENDING",
        timestamp: now,
      };
    }

    if (receipt.status === "FAILED") {
      const failedObs: ExecutionObservation = {
        intentHash: intent.intentHash,
        solver,
        status: "FAILED",
        executionResult: receipt,
        failureReason: "DESTINATION_TRANSACTION_REVERTED",
        timestamp: now,
      };
      this.observations.set(intent.intentHash, failedObs);
      return failedObs;
    }

    const confirmedObs: ExecutionObservation = {
      intentHash: intent.intentHash,
      solver,
      status: "CONFIRMED",
      executionResult: receipt,
      timestamp: now,
    };
    this.observations.set(intent.intentHash, confirmedObs);
    return confirmedObs;
  }

  public getObservation(intentHash: string): ExecutionObservation | null {
    return this.observations.get(intentHash) || null;
  }
}
