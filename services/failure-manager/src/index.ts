import { ExecutionResult, LocalSimulationAdapter } from "@intentmesh/chain-adapters";
import { ExecutionObservation, ExecutionMonitorService } from "@intentmesh/execution-monitor";
import { Intent } from "@intentmesh/protocol-types";

export interface RevealedBid {
  solver: string;
  expectedOutputAmount: bigint;
  estimatedExecutionTime: number;
  capacityRequired: bigint;
  salt: string;
}

export interface FallbackResolution {
  action: "RETRY_WITH_FALLBACK" | "TRIGGER_REFUND";
  intentHash: string;
  failedSolver: string;
  fallbackSolver?: string;
  reason: string;
  refundAuthorized?: boolean;
}

export class FailureManagerService {
  private readonly monitor: ExecutionMonitorService;
  private readonly adapter: LocalSimulationAdapter;
  private readonly failedSolversPerIntent: Map<string, Set<string>> = new Map();

  constructor(monitor: ExecutionMonitorService, adapter: LocalSimulationAdapter) {
    this.monitor = monitor;
    this.adapter = adapter;
  }

  public recordSolverFailure(intentHash: string, solver: string): void {
    if (!this.failedSolversPerIntent.has(intentHash)) {
      this.failedSolversPerIntent.set(intentHash, new Set());
    }
    this.failedSolversPerIntent.get(intentHash)!.add(solver.toLowerCase());
  }

  public resolveFailureOrFallback(
    intent: Intent,
    failedSolver: string,
    revealedBids: RevealedBid[]
  ): FallbackResolution {
    this.recordSolverFailure(intent.intentHash, failedSolver);
    const failedSet = this.failedSolversPerIntent.get(intent.intentHash) || new Set();

    // Filter candidate bids excluding failed solvers and solvers providing output below minOutput
    const eligibleBids = revealedBids.filter(
      (b) => !failedSet.has(b.solver.toLowerCase()) && b.expectedOutputAmount >= intent.minOutputAmount
    );

    // Sort candidates by deterministic ranking formula (highest output -> lowest time -> lowest address)
    eligibleBids.sort((a, b) => {
      if (a.expectedOutputAmount > b.expectedOutputAmount) return -1;
      if (a.expectedOutputAmount < b.expectedOutputAmount) return 1;
      if (a.estimatedExecutionTime < b.estimatedExecutionTime) return -1;
      if (a.estimatedExecutionTime > b.estimatedExecutionTime) return 1;
      return a.solver.localeCompare(b.solver);
    });

    if (eligibleBids.length > 0) {
      const fallbackSolver = eligibleBids[0].solver;
      return {
        action: "RETRY_WITH_FALLBACK",
        intentHash: intent.intentHash,
        failedSolver,
        fallbackSolver,
        reason: `Primary solver ${failedSolver} failed execution. Automatically selecting fallback solver ${fallbackSolver}.`,
      };
    }

    return {
      action: "TRIGGER_REFUND",
      intentHash: intent.intentHash,
      failedSolver,
      reason: `No safe, eligible fallback solver remaining for intent ${intent.intentHash}. Protocol contract refund authorized.`,
      refundAuthorized: true,
    };
  }
}
