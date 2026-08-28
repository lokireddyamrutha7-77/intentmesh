export interface HealthStatus {
  status: string;
  protocol: string;
  version: string;
  sourceChainId: string;
  destinationChainId: string;
  anvilNodes: {
    sourceConnected: boolean;
    destinationConnected: boolean;
  };
  deployments: Record<string, string>;
  timestamp: number;
}

export interface IntentRecord {
  intentHash: string;
  user: string;
  sourceChainId: string;
  sourceToken: string;
  sourceAmount: string;
  destinationChainId: string;
  destinationToken: string;
  recipient: string;
  minOutputAmount: string;
  deadline: string;
  nonce: string;
  verificationPolicy: string;
  createdAt: string;
  state: number;
  escrowStatus?: string;
}

export interface SolverRecord {
  solver: string;
  isActive: boolean;
  metadataURI: string;
  bondEth: string;
  capacityUsdc: string;
  supportedChains: string[];
  supportedTokens?: Record<string, string[]>;
}

export interface AuctionRecord {
  auctionId: string;
  intentHash: string;
  commitDeadline: number;
  revealDeadline: number;
  maxBidsAllowed: number;
  state: string;
  bidsCount: number;
  winner?: string;
}

export interface RiskAssessmentRecord {
  assessment: {
    solverAddress: string;
    riskScore: number;
    riskLevel: string;
    hardSafetyPass: boolean;
    disqualificationReasons: string[];
    factors: {
      reliabilityScore: number;
      successRateScore: number;
      timeoutRateScore: number;
      latencyScore: number;
      coverageScore: number;
    };
    lookbackDays: number;
    sampleCount: number;
    evidenceSufficient: boolean;
    advisoryNote: string;
  };
}

export interface ExecutionRecord {
  executionId: string;
  intentHash: string;
  solver: string;
  sourceChainId: string;
  destinationChainId: string;
  transactionHash: string;
  status: string;
  timestamp: number;
  verification?: {
    isValid: boolean;
    checklist: Record<string, boolean>;
  };
}

export interface ProtocolEventLog {
  id: string;
  intentHash: string;
  auctionId?: string;
  solverAddress?: string;
  type: string;
  timestamp: number;
  blockNumber?: number;
  transactionHash?: string;
  message: string;
  data?: any;
}

export interface DemoResponse {
  status: string;
  scenario: string;
  intentHash: string;
  winner?: string;
  failedSolver?: string;
  fallbackSolver?: string;
  refundAuthorized?: boolean;
  execResult?: any;
  verification?: any;
  resolution?: any;
}
