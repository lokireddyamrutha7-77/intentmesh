import {
  EligibilityResult,
  Intent,
  SolverProfile,
} from "@intentmesh/protocol-types";
import { computeBidCommitmentHash, SolverClient } from "@intentmesh/solver-sdk";
import { GeneratedBid, ISolverAgent, SolverProposal } from "../shared/agent-interface";

export class FastSolverAgent implements ISolverAgent {
  public readonly solverAddress: string;
  public readonly agentName: string = "Solver B";
  public readonly strategyName: string = "Express Fast";
  private readonly client: SolverClient;
  private activeBids: Map<string, GeneratedBid> = new Map();

  constructor(solverAddress: string, client: SolverClient) {
    this.solverAddress = solverAddress.toLowerCase();
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

    // Fast express strategy: 2% surplus above minimum output, 15s execution time
    const expectedOutputAmount = intent.minOutputAmount + (intent.minOutputAmount * 2n) / 100n;
    const estimatedExecutionTime = 15;
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

  public async generateBid(intent: Intent, auctionId: string): Promise<GeneratedBid> {
    const proposal = await this.buildProposal(intent);
    const saltNum = BigInt(Math.floor(Math.random() * 1e12)) + 200000n;
    const salt = `0xsalt_b_${saltNum.toString(16)}`;

    const commitmentHash = computeBidCommitmentHash({
      auctionId,
      intentHash: intent.intentHash,
      solver: this.solverAddress,
      expectedOutputAmount: proposal.expectedOutputAmount,
      estimatedExecutionTime: proposal.estimatedExecutionTime,
      capacityRequired: proposal.capacityRequired,
      salt,
    });

    const bid: GeneratedBid = {
      auctionId,
      intentHash: intent.intentHash,
      solver: this.solverAddress,
      expectedOutputAmount: proposal.expectedOutputAmount,
      estimatedExecutionTime: proposal.estimatedExecutionTime,
      capacityRequired: proposal.capacityRequired,
      salt,
      commitmentHash,
    };

    this.activeBids.set(auctionId, bid);
    return bid;
  }
}
