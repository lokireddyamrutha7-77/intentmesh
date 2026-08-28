import {
  EligibilityResult,
  Intent,
  SolverProfile,
} from "@intentmesh/protocol-types";

export interface SolverProposal {
  intentHash: string;
  solver: string;
  sourceChainId: bigint;
  destinationChainId: bigint;
  sourceToken: string;
  destinationToken: string;
  sourceAmount: bigint;
  expectedOutputAmount: bigint;
  estimatedExecutionTime: number;
  capacityRequired: bigint;
  validUntil: bigint;
  executionDataReference: string;
}

export interface GeneratedBid {
  auctionId: string;
  intentHash: string;
  solver: string;
  expectedOutputAmount: bigint;
  estimatedExecutionTime: number;
  capacityRequired: bigint;
  salt: string;
  commitmentHash: string;
}

export interface ISolverAgent {
  readonly solverAddress: string;
  readonly agentName: string;
  readonly strategyName: string;

  getProfile(): Promise<SolverProfile>;
  canHandleIntent(intent: Intent): Promise<EligibilityResult>;
  buildProposal(intent: Intent): Promise<SolverProposal>;
  generateBid(intent: Intent, auctionId: string): Promise<GeneratedBid>;
}
