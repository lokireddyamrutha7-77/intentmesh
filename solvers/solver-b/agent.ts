import {
  EligibilityResult,
  Intent,
  SolverProfile,
} from "@intentmesh/protocol-types";
import { evaluateEligibility, SolverClient } from "@intentmesh/solver-sdk";
import { ISolverAgent, SolverProposal } from "../shared/agent-interface";

export class FastSolverAgent implements ISolverAgent {
  private readonly solverAddress: string;
  private readonly client: SolverClient;

  constructor(solverAddress: string, client: SolverClient) {
    this.solverAddress = solverAddress;
    this.client = client;
  }

  public async getProfile(): Promise<SolverProfile> {
    return this.client.getSolverProfile(this.solverAddress);
  }

  public async canHandleIntent(intent: Intent): Promise<EligibilityResult> {
    return this.client.checkEligibility(intent, this.solverAddress);
  }

  public async buildProposal(intent: Intent): Promise<SolverProposal> {
    const eligibility = await this.canHandleIntent(intent);
    if (!eligibility.eligible) {
      throw new Error(`Solver B cannot handle intent: ${eligibility.reasons.join(", ")}`);
    }

    // Fast parameters: 2% above minOutputAmount, 15s execution time
    const expectedOutputAmount = intent.minOutputAmount + (intent.minOutputAmount * 2n) / 100n;
    const estimatedExecutionTime = 15; // 15 seconds
    const capacityRequired = intent.sourceAmount;

    return {
      intentHash: intent.intentHash,
      solver: this.solverAddress,
      sourceChainId: intent.sourceChainId,
      destinationChainId: intent.destinationChainId,
      sourceToken: intent.sourceToken,
      destinationToken: intent.destinationToken,
      sourceAmount: intent.sourceAmount,
      expectedOutputAmount,
      estimatedExecutionTime,
      capacityRequired,
      validUntil: intent.deadline,
      executionDataReference: "solver-b:fast-route:express",
    };
  }

  public createBidCommitment(
    auctionId: string,
    proposal: SolverProposal,
    salt: string
  ): string {
    return "0xcommitment_hash_b";
  }
}
