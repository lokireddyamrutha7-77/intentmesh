import { Intent } from "@intentmesh/protocol-types";

export interface BidCommitmentPayload {
  auctionId: string;
  intentHash: string;
  solver: string;
  expectedOutputAmount: bigint;
  estimatedExecutionTime: number;
  capacityRequired: bigint;
  salt: string;
}

export interface BidRevealPayload extends BidCommitmentPayload {}

export function computeAuctionId(intentHash: string, commitDeadline: bigint): string {
  return `0xauc_${intentHash.substring(2, 10)}_${commitDeadline.toString()}`;
}

export function computeBidCommitmentHash(payload: BidCommitmentPayload): string {
  return `0xhash_${payload.auctionId}_${payload.solver}_${payload.expectedOutputAmount.toString()}_${payload.salt}`;
}
