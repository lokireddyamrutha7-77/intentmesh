export type IntentStatus =
  | 'pending'
  | 'auctioning'
  | 'reserved'
  | 'filling'
  | 'verifying'
  | 'settled'
  | 'failed'
  | 'fallback';

export interface VerifierPolicy {
  verifierClass: 'routine' | 'elevated' | 'strict';
  requiredConfirmations: number;
  challengeRule: string;
  maxSettlementDelay: number; // in seconds
}

export interface Intent {
  id: string;
  userAddress: string;
  sourceChain: string;
  destChain: string;
  sourceAsset: string;
  destAsset: string;
  sourceAmount: number;
  minDestAmount: number;
  deadline: number; // unix timestamp seconds
  recipient: string;
  verifierPolicy: VerifierPolicy;
  status: IntentStatus;
  signature: string;
  createdAt: number;
  winningSolverId?: string;
  selectedBid?: Bid;
  settlementProof?: SettlementProof;
  currentFallbackIndex?: number;
}

export interface CapacityDetails {
  declared: number;
  reserved: number;
  pending: number;
  available: number;
}

export interface PenaltyRecord {
  id: string;
  reason: string;
  timestamp: number;
  slashedAmount: number;
}

export interface Solver {
  id: string;
  name: string;
  address: string;
  reliabilityScore: number; // 0 - 100 percentage
  bondAmount: number; // USD / ETH value
  capacityByChainAsset: {
    [chainAsset: string]: CapacityDetails;
  };
  activePenalties: PenaltyRecord[];
  supportedVerifierClasses: ('routine' | 'elevated' | 'strict')[];
}

export interface ScoringWeights {
  value: number; // default 0.30
  speed: number; // default 0.15
  reliability: number; // default 0.15
  headroom: number; // default 0.20
  security: number; // default 0.20
  riskPenalty: number; // default 0.10
}

export interface ScoreBreakdown {
  qs: number; // 0 - 100
  raw: {
    value: number;
    speed: number;
    reliability: number;
    headroom: number;
    security: number;
    riskPenalty: number;
  };
  normalized: {
    value: number;
    speed: number;
    reliability: number;
    headroom: number;
    security: number;
    riskPenalty: number;
  };
  weights: ScoringWeights;
}

export interface GateDetail {
  pass: boolean;
  reason: string;
}

export interface GateEvaluationResult {
  passed: boolean;
  gates: {
    quoteValid: GateDetail;
    minOutput: GateDetail;
    capacityAvailable: GateDetail;
    bondSufficient: GateDetail;
    policySupported: GateDetail;
    noActivePenalty: GateDetail;
  };
}

export interface Bid {
  solverId: string;
  solverName: string;
  intentId: string;
  outputAmount: number;
  etaSeconds: number;
  feeBps: number;
  routeDescription: string;
  submittedAt: number;
  expiresAt: number;
  score?: ScoreBreakdown;
  gates?: GateEvaluationResult;
}

export interface SettlementProof {
  intentId: string;
  solverId: string;
  destTxHash: string;
  destChain: string;
  destAsset: string;
  recipient: string;
  amountFilled: number;
  timestamp: number;
  nonce: string;
  proofHash: string;
  isReplay?: boolean;
  isPartial?: boolean;
}

export type EventTopic =
  | 'IntentCreated'
  | 'BidsReceived'
  | 'GatesEvaluated'
  | 'SolverSelected'
  | 'CapacityReserved'
  | 'DestinationFilled'
  | 'VerificationPassed'
  | 'VerificationFailed'
  | 'SettlementReleased'
  | 'PenaltyApplied'
  | 'FallbackTriggered'
  | 'CapacityOvercommitRejected';

export interface ProtocolEvent {
  id: string;
  timestamp: number;
  blockNumber: number;
  txHash: string;
  topic: EventTopic;
  intentId?: string;
  solverId?: string;
  details: Record<string, any>;
}

export interface ProtocolConfig {
  weights: ScoringWeights;
  minBondThreshold: number;
}
