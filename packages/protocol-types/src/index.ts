/**
 * Canonical TypeScript protocol types for IntentMesh.
 */

export enum IntentState {
  NONE = 0,
  CREATED = 1,
  VALIDATED = 2,
  AUCTION_READY = 3,
  AUCTION_OPEN = 4,
  BIDS_LOCKED = 5,
  WINNER_SELECTED = 6,
  CAPACITY_RESERVED = 7,
  EXECUTING = 8,
  FULFILMENT_PENDING = 9,
  VERIFICATION_PENDING = 10,
  SETTLEMENT = 11,
  COMPLETED = 12,
  EXPIRED = 13,
  FAILED = 14,
  REFUNDED = 15,
  REORGED = 16,
}

export enum VerificationStatus {
  UNVERIFIED = 0,
  VALID = 1,
  INVALID = 2,
  PENDING = 3,
  REORGED = 4,
  UNAVAILABLE = 5,
}

export interface Intent {
  intentHash: string;
  user: string;
  sourceChainId: bigint;
  sourceToken: string;
  sourceAmount: bigint;
  destinationChainId: bigint;
  destinationToken: string;
  recipient: string;
  minOutputAmount: bigint;
  deadline: bigint;
  nonce: bigint;
  verificationPolicy: string;
  createdAt: bigint;
}

export interface SolverProfile {
  solver: string;
  isActive: boolean;
  registeredAt: bigint;
  metadataURI: string;
}

export interface ChainCapability {
  chainId: bigint;
  supported: boolean;
}

export interface TokenCapability {
  chainId: bigint;
  token: string;
  supported: boolean;
}

export interface SolverCapabilities {
  solver: string;
  supportedChains: bigint[];
  supportedTokens: Record<string, string[]>; // chainId -> token addresses
}

export interface SolverBond {
  solver: string;
  totalBond: bigint;
  lockedBond: bigint;
  availableBond: bigint;
}

export interface SolverCapacity {
  solver: string;
  chainId: bigint;
  token: string;
  declaredCapacity: bigint;
  reservedCapacity: bigint;
  availableCapacity: bigint;
}

export enum EligibilityReason {
  ELIGIBLE = "ELIGIBLE",
  SOLVER_UNREGISTERED = "SOLVER_UNREGISTERED",
  SOLVER_INACTIVE = "SOLVER_INACTIVE",
  SOURCE_CHAIN_UNSUPPORTED = "SOURCE_CHAIN_UNSUPPORTED",
  DESTINATION_CHAIN_UNSUPPORTED = "DESTINATION_CHAIN_UNSUPPORTED",
  SOURCE_TOKEN_UNSUPPORTED = "SOURCE_TOKEN_UNSUPPORTED",
  DESTINATION_TOKEN_UNSUPPORTED = "DESTINATION_TOKEN_UNSUPPORTED",
  EXPIRED_INTENT = "EXPIRED_INTENT",
}

export interface EligibilityResult {
  eligible: boolean;
  reasons: EligibilityReason[];
}

export interface VerificationProof {
  intentHash: string;
  destinationChainId: bigint;
  destinationToken: string;
  recipient: string;
  deliveredAmount: bigint;
  transactionHash: string;
  blockNumber: bigint;
  blockTimestamp: bigint;
  status: VerificationStatus;
}
