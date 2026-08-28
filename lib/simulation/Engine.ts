import {
  Intent,
  Bid,
  Solver,
  ScoringWeights,
  ProtocolConfig,
  SettlementProof,
} from '../types';
import { DEFAULT_WEIGHTS, evaluateEligibilityGates, calculateQualityScore } from '../scoring/ScoringEngine';
import { solverRegistry } from './SolverRegistry';
import { capacityRegistry } from './CapacityRegistry';
import { settlementVerifier } from './SettlementVerifier';
import { escrowManager } from './EscrowManager';
import { eventBus } from './EventBus';

export class ProtocolEngine {
  private intents: Map<string, Intent> = new Map();
  private bidsByIntent: Map<string, Bid[]> = new Map();
  private config: ProtocolConfig = {
    weights: { ...DEFAULT_WEIGHTS },
    minBondThreshold: 10000,
  };

  constructor() {
    this.seedDefaultIntent();
  }

  public getConfig(): ProtocolConfig {
    return this.config;
  }

  public updateWeights(newWeights: Partial<ScoringWeights>): ScoringWeights {
    this.config.weights = { ...this.config.weights, ...newWeights };
    // Re-score all open/auctioning intents
    this.intents.forEach((intent) => {
      if (intent.status === 'auctioning' || intent.status === 'reserved') {
        this.runAuctionForIntent(intent.id);
      }
    });
    return this.config.weights;
  }

  public createIntent(params: Omit<Intent, 'id' | 'status' | 'createdAt'>): Intent {
    const id = `intent_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const intent: Intent = {
      ...params,
      id,
      status: 'pending',
      createdAt: Math.floor(Date.now() / 1000),
    };

    this.intents.set(id, intent);

    // Lock source funds in Escrow
    escrowManager.lockSourceEscrow(intent);

    eventBus.emit(
      'IntentCreated',
      {
        intentId: id,
        userAddress: intent.userAddress,
        source: `${intent.sourceAmount} ${intent.sourceAsset} on ${intent.sourceChain}`,
        destination: `Min ${intent.minDestAmount} ${intent.destAsset} on ${intent.destChain}`,
        deadline: new Date(intent.deadline * 1000).toLocaleTimeString(),
        verifierPolicy: intent.verifierPolicy,
      },
      id
    );

    // Immediately trigger auction loop
    this.runAuctionForIntent(id);

    return intent;
  }

  public getEvents(intentId?: string) {
    return eventBus.getEvents(intentId);
  }

  public getIntent(id: string): Intent | undefined {
    return this.intents.get(id);
  }

  public getAllIntents(): Intent[] {
    return Array.from(this.intents.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  public getBidsForIntent(intentId: string): Bid[] {
    return this.bidsByIntent.get(intentId) || [];
  }

  /**
   * Generates simulated quotes from solvers (A, B, C), runs eligibility gates & deterministic quality score Qs.
   */
  public runAuctionForIntent(intentId: string): { intent: Intent; bids: Bid[] } {
    const intent = this.intents.get(intentId);
    if (!intent) throw new Error(`Intent ${intentId} not found`);

    intent.status = 'auctioning';
    const solvers = solverRegistry.getAllSolvers();
    const now = Math.floor(Date.now() / 1000);

    // Generate benchmark bids
    const bids: Bid[] = solvers.map((solver) => {
      let outputAmount = intent.minDestAmount;
      let etaSeconds = 10;
      let feeBps = 15;
      let routeDescription = `Native liquidity bridge pool via ${intent.sourceChain}->${intent.destChain}`;

      if (solver.id === 'solver_a') {
        // Benchmark Solver A: Output 1012, ETA 12s
        outputAmount = Math.round(intent.minDestAmount * 1.012);
        etaSeconds = 12;
        feeBps = 12;
        routeDescription = 'AlphaRelay Batch Route (Zero Slippage Lock)';
      } else if (solver.id === 'solver_b') {
        // Benchmark Solver B: Output 1018, ETA 10s
        outputAmount = Math.round(intent.minDestAmount * 1.018);
        etaSeconds = 10;
        feeBps = 8;
        routeDescription = 'BoltSpeed Direct Liquidity Injection';
      } else if (solver.id === 'solver_c') {
        // Benchmark Solver C: Output 1009, ETA 8s
        outputAmount = Math.round(intent.minDestAmount * 1.009);
        etaSeconds = 8;
        feeBps = 18;
        routeDescription = 'CitadelMesh Institutional Escrow Pool';
      }

      return {
        solverId: solver.id,
        solverName: solver.name,
        intentId,
        outputAmount,
        etaSeconds,
        feeBps,
        routeDescription,
        submittedAt: now,
        expiresAt: now + 300, // 5 min validity
      };
    });

    // Evaluate gates and score each bid
    bids.forEach((bid) => {
      const solver = solverRegistry.getSolver(bid.solverId)!;
      bid.gates = evaluateEligibilityGates(bid, intent, solver, now);
      bid.score = calculateQualityScore(bid, bids, intent, solver, this.config.weights);
    });

    // Save bids
    this.bidsByIntent.set(intentId, bids);

    eventBus.emit(
      'BidsReceived',
      {
        intentId,
        bidCount: bids.length,
        bids: bids.map((b) => ({
          solverName: b.solverName,
          output: b.outputAmount,
          eta: `${b.etaSeconds}s`,
          qsScore: b.score?.qs,
          passedGates: b.gates?.passed,
        })),
      },
      intentId
    );

    // Select highest scoring eligible solver
    this.selectWinningSolver(intentId);

    return { intent, bids };
  }

  /**
   * Evaluates highest scoring eligible solver, reserves capacity, and updates intent status.
   */
  public selectWinningSolver(intentId: string): Intent {
    const intent = this.intents.get(intentId);
    const bids = this.bidsByIntent.get(intentId) || [];
    if (!intent) throw new Error('Intent not found');

    const chainAssetKey = `${intent.destChain.toLowerCase()}-${intent.destAsset.toLowerCase()}`;

    // Filter eligible passing bids
    const eligibleBids = bids
      .filter((b) => b.gates?.passed)
      .sort((a, b) => (b.score?.qs || 0) - (a.score?.qs || 0));

    eventBus.emit(
      'GatesEvaluated',
      {
        intentId,
        totalBids: bids.length,
        eligibleCount: eligibleBids.length,
        ranking: eligibleBids.map((b, idx) => ({
          rank: idx + 1,
          solverName: b.solverName,
          qs: b.score?.qs,
        })),
      },
      intentId
    );

    if (eligibleBids.length === 0) {
      intent.status = 'failed';
      escrowManager.refundUser(intentId, 'No eligible solver bids available');
      return intent;
    }

    const winnerBid = eligibleBids[0];
    const winnerSolver = solverRegistry.getSolver(winnerBid.solverId)!;

    // Atomically reserve capacity
    const res = capacityRegistry.reserveCapacity(
      winnerSolver,
      chainAssetKey,
      winnerBid.outputAmount,
      intentId
    );

    if (!res.success) {
      // Try next eligible solver if reservation failed
      if (eligibleBids.length > 1) {
        intent.currentFallbackIndex = 1;
        return this.selectWinningSolver(intentId);
      } else {
        intent.status = 'failed';
        escrowManager.refundUser(intentId, 'Winner capacity reservation failed');
        return intent;
      }
    }

    intent.winningSolverId = winnerSolver.id;
    intent.selectedBid = winnerBid;
    intent.status = 'reserved';

    eventBus.emit(
      'SolverSelected',
      {
        intentId,
        winnerSolverId: winnerSolver.id,
        winnerSolverName: winnerSolver.name,
        winningScore: winnerBid.score?.qs,
        outputAmount: winnerBid.outputAmount,
        etaSeconds: winnerBid.etaSeconds,
      },
      intentId,
      winnerSolver.id
    );

    return intent;
  }

  /**
   * Advances intent lifecycle through regular steps:
   * reserved -> filling -> verifying -> settled
   */
  public advanceStep(intentId: string): Intent {
    const intent = this.intents.get(intentId);
    if (!intent) throw new Error('Intent not found');

    const chainAssetKey = `${intent.destChain.toLowerCase()}-${intent.destAsset.toLowerCase()}`;

    if (intent.status === 'reserved') {
      intent.status = 'filling';
      const solver = solverRegistry.getSolver(intent.winningSolverId!)!;
      capacityRegistry.markPending(solver, chainAssetKey, intent.selectedBid!.outputAmount);

      eventBus.emit(
        'DestinationFilled',
        {
          intentId,
          solverId: solver.id,
          solverName: solver.name,
          destChain: intent.destChain,
          destAsset: intent.destAsset,
          amountFilled: intent.selectedBid!.outputAmount,
          recipient: intent.recipient,
        },
        intentId,
        solver.id
      );
    } else if (intent.status === 'filling') {
      intent.status = 'verifying';

      // Perform verification check
      const proof: SettlementProof = {
        intentId,
        solverId: intent.winningSolverId!,
        destTxHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
        destChain: intent.destChain,
        destAsset: intent.destAsset,
        recipient: intent.recipient,
        amountFilled: intent.selectedBid!.outputAmount,
        timestamp: Math.floor(Date.now() / 1000),
        nonce: `nonce_${intentId}_1`,
        proofHash: `hash_${intentId}_nonce_${intentId}_1`,
      };

      intent.settlementProof = proof;
      const vResult = settlementVerifier.verifyProof(proof, intent);

      if (vResult.passed) {
        intent.status = 'settled';
        const solver = solverRegistry.getSolver(intent.winningSolverId!)!;
        // Release pending capacity
        capacityRegistry.releaseCapacity(solver, chainAssetKey, intent.selectedBid!.outputAmount, intentId, 'pending');
        // Release escrow source funds to solver
        escrowManager.releaseToSolver(intentId, solver.id, solver.address);
      } else {
        // Verification failed -> trigger fallback loop
        this.triggerFailureScenario(intentId, 'forced_partial_fill');
      }
    }

    return intent;
  }

  /**
   * Triggers a forced failure scenario for demonstration and executes the fallback auction loop!
   */
  public triggerFailureScenario(
    intentId: string,
    failureType: 'forced_timeout' | 'forced_partial_fill' | 'forced_replay_proof'
  ): { intent: Intent; penalizedSolverId: string; fallbackSolverId?: string } {
    const intent = this.intents.get(intentId);
    if (!intent) throw new Error('Intent not found');

    const winnerId = intent.winningSolverId;
    if (!winnerId) throw new Error('No winning solver selected to fail');

    const winnerSolver = solverRegistry.getSolver(winnerId)!;
    const chainAssetKey = `${intent.destChain.toLowerCase()}-${intent.destAsset.toLowerCase()}`;
    const fillAmount = intent.selectedBid?.outputAmount || intent.minDestAmount;

    let failureReason = '';
    if (failureType === 'forced_timeout') {
      failureReason = `TIMEOUT: Winning solver ${winnerSolver.name} failed to submit destination proof within deadline window`;
    } else if (failureType === 'forced_partial_fill') {
      failureReason = `PARTIAL FILL REJECTED: ${winnerSolver.name} delivered ${Math.round(fillAmount * 0.8)} < Signed Minimum ${intent.minDestAmount}`;
    } else if (failureType === 'forced_replay_proof') {
      failureReason = `REPLAY PROOF DETECTED: ${winnerSolver.name} attempted to submit an already consumed proof receipt hash`;
    }

    // 1. Penalize winning solver (slash bond, drop reliability score)
    solverRegistry.penalizeSolver(winnerId, failureReason, 5000, intentId);

    // 2. Release capacity reservation of the failed solver
    capacityRegistry.releaseCapacity(
      winnerSolver,
      chainAssetKey,
      fillAmount,
      intentId,
      intent.status === 'filling' || intent.status === 'verifying' ? 'pending' : 'reserved'
    );

    // 3. Mark intent in fallback status
    intent.status = 'fallback';

    eventBus.emit(
      'FallbackTriggered',
      {
        intentId,
        failedSolverId: winnerId,
        failedSolverName: winnerSolver.name,
        failureType,
        reason: failureReason,
        action: 'Re-evaluating remaining eligible solvers with current capacity state',
      },
      intentId,
      winnerId
    );

    // 4. Fallback Auction Loop: Re-score remaining eligible solvers
    const bids = this.bidsByIntent.get(intentId) || [];
    const now = Math.floor(Date.now() / 1000);

    // Re-evaluate eligibility gates with updated capacity & penalties!
    bids.forEach((bid) => {
      const solver = solverRegistry.getSolver(bid.solverId)!;
      bid.gates = evaluateEligibilityGates(bid, intent, solver, now);
      bid.score = calculateQualityScore(bid, bids, intent, solver, this.config.weights);
    });

    const remainingEligibleBids = bids
      .filter((b) => b.solverId !== winnerId && b.gates?.passed)
      .sort((a, b) => (b.score?.qs || 0) - (a.score?.qs || 0));

    if (remainingEligibleBids.length > 0) {
      const fallbackBid = remainingEligibleBids[0];
      const fallbackSolver = solverRegistry.getSolver(fallbackBid.solverId)!;

      // Reserve capacity for fallback solver
      const capRes = capacityRegistry.reserveCapacity(
        fallbackSolver,
        chainAssetKey,
        fallbackBid.outputAmount,
        intentId
      );

      if (capRes.success) {
        intent.winningSolverId = fallbackSolver.id;
        intent.selectedBid = fallbackBid;
        intent.status = 'reserved';

        eventBus.emit(
          'SolverSelected',
          {
            intentId,
            winnerSolverId: fallbackSolver.id,
            winnerSolverName: fallbackSolver.name,
            isFallbackWinner: true,
            winningScore: fallbackBid.score?.qs,
            outputAmount: fallbackBid.outputAmount,
          },
          intentId,
          fallbackSolver.id
        );

        // Auto-advance fallback fill & settlement for complete demo feedback!
        intent.status = 'filling';
        capacityRegistry.markPending(fallbackSolver, chainAssetKey, fallbackBid.outputAmount);

        const proof: SettlementProof = {
          intentId,
          solverId: fallbackSolver.id,
          destTxHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
          destChain: intent.destChain,
          destAsset: intent.destAsset,
          recipient: intent.recipient,
          amountFilled: fallbackBid.outputAmount,
          timestamp: now,
          nonce: `nonce_fallback_${intentId}`,
          proofHash: `hash_fallback_${intentId}`,
        };

        const vResult = settlementVerifier.verifyProof(proof, intent);
        if (vResult.passed) {
          intent.status = 'settled';
          capacityRegistry.releaseCapacity(fallbackSolver, chainAssetKey, fallbackBid.outputAmount, intentId, 'pending');
          escrowManager.releaseToSolver(intentId, fallbackSolver.id, fallbackSolver.address);
        }

        return {
          intent,
          penalizedSolverId: winnerId,
          fallbackSolverId: fallbackSolver.id,
        };
      }
    }

    // If no eligible fallback solver, refund user
    intent.status = 'failed';
    escrowManager.refundUser(intentId, 'Fallback auction failed: No remaining eligible solvers');

    return {
      intent,
      penalizedSolverId: winnerId,
    };
  }

  /**
   * Seeds a pre-configured demo intent for instant hackathon judge preview!
   */
  private seedDefaultIntent(): void {
    const defaultIntent: Intent = {
      id: 'intent_demo_1001',
      userAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      sourceChain: 'Ethereum',
      destChain: 'Arbitrum',
      sourceAsset: 'ETH',
      destAsset: 'USDC',
      sourceAmount: 1.0,
      minDestAmount: 1000,
      deadline: Math.floor(Date.now() / 1000) + 3600,
      recipient: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      verifierPolicy: {
        verifierClass: 'elevated',
        requiredConfirmations: 12,
        challengeRule: 'Standard 7-day challenge period with optimistic RPC verification',
        maxSettlementDelay: 60,
      },
      status: 'pending',
      signature: '0x8f3c7e61a...92b4',
      createdAt: Math.floor(Date.now() / 1000) - 30,
    };

    this.intents.set(defaultIntent.id, defaultIntent);
    escrowManager.lockSourceEscrow(defaultIntent);
    this.runAuctionForIntent(defaultIntent.id);
  }

  public resetSimulation(): void {
    this.intents.clear();
    this.bidsByIntent.clear();
    solverRegistry.resetFixtures();
    settlementVerifier.reset();
    escrowManager.reset();
    eventBus.clear();
    this.config.weights = { ...DEFAULT_WEIGHTS };
    this.seedDefaultIntent();
  }
}

export const protocolEngine = new ProtocolEngine();
