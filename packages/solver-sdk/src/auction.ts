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
  const input = `${payload.auctionId}:${payload.intentHash}:${payload.solver.toLowerCase()}:${payload.expectedOutputAmount.toString()}:${payload.estimatedExecutionTime}:${payload.capacityRequired.toString()}:${payload.salt}`;
  let hash = 0n;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31n + BigInt(input.charCodeAt(i))) % 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffn;
  }
  return "0x" + hash.toString(16).padStart(64, "0");
}
