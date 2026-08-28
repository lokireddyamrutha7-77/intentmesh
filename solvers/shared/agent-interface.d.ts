import { EligibilityResult, Intent, SolverProfile } from "@intentmesh/protocol-types";
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
export interface ISolverAgent {
    getProfile(): Promise<SolverProfile>;
    canHandleIntent(intent: Intent): Promise<EligibilityResult>;
    buildProposal(intent: Intent): Promise<SolverProposal>;
    createBidCommitment(auctionId: string, proposal: SolverProposal, salt: string): string;
}
//# sourceMappingURL=agent-interface.d.ts.map