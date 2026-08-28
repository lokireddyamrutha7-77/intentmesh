import { Bid, Intent, Solver, ScoringWeights, ScoreBreakdown, GateEvaluationResult } from '../types';

export const DEFAULT_WEIGHTS: ScoringWeights = {
  value: 0.30,
  speed: 0.15,
  reliability: 0.15,
  headroom: 0.20,
  security: 0.20,
  riskPenalty: 0.10,
};

export const MIN_BOND_THRESHOLD = 10000; // $10,000 equivalent

/**
 * Evaluates all 6 eligibility gates for a solver's bid against an intent.
 */
export function evaluateEligibilityGates(
  bid: Bid,
  intent: Intent,
  solver: Solver,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): GateEvaluationResult {
  const chainAssetKey = `${intent.destChain.toLowerCase()}-${intent.destAsset.toLowerCase()}`;
  const cap = solver.capacityByChainAsset[chainAssetKey] || {
    declared: 0,
    reserved: 0,
    pending: 0,
    available: 0,
  };

  const quoteValidPass = bid.expiresAt > nowSeconds;
  const minOutputPass = bid.outputAmount >= intent.minDestAmount;
  const capacityAvailablePass = cap.available >= bid.outputAmount;
  const bondSufficientPass = solver.bondAmount >= MIN_BOND_THRESHOLD;
  const policySupportedPass = solver.supportedVerifierClasses.includes(
    intent.verifierPolicy.verifierClass
  );
  const noActivePenaltyPass = solver.activePenalties.length === 0;

  const gates = {
    quoteValid: {
      pass: quoteValidPass,
      reason: quoteValidPass
        ? `Quote valid until ${new Date(bid.expiresAt * 1000).toLocaleTimeString()}`
        : `Quote expired at ${new Date(bid.expiresAt * 1000).toLocaleTimeString()}`,
    },
    minOutput: {
      pass: minOutputPass,
      reason: minOutputPass
        ? `Output ${bid.outputAmount} >= Min required ${intent.minDestAmount}`
        : `Output ${bid.outputAmount} < Min required ${intent.minDestAmount}`,
    },
    capacityAvailable: {
      pass: capacityAvailablePass,
      reason: capacityAvailablePass
        ? `Available capacity ${cap.available.toLocaleString()} >= Required ${bid.outputAmount.toLocaleString()}`
        : `Available capacity ${cap.available.toLocaleString()} < Required ${bid.outputAmount.toLocaleString()}`,
    },
    bondSufficient: {
      pass: bondSufficientPass,
      reason: bondSufficientPass
        ? `Bond $${solver.bondAmount.toLocaleString()} >= Required threshold $${MIN_BOND_THRESHOLD.toLocaleString()}`
        : `Bond $${solver.bondAmount.toLocaleString()} < Required threshold $${MIN_BOND_THRESHOLD.toLocaleString()}`,
    },
    policySupported: {
      pass: policySupportedPass,
      reason: policySupportedPass
        ? `Solver supports policy level '${intent.verifierPolicy.verifierClass}'`
        : `Solver does not support policy level '${intent.verifierPolicy.verifierClass}'`,
    },
    noActivePenalty: {
      pass: noActivePenaltyPass,
      reason: noActivePenaltyPass
        ? `No active slashing/penalty flags`
        : `Active penalties found: ${solver.activePenalties.map((p) => p.reason).join(', ')}`,
    },
  };

  const allPassed =
    quoteValidPass &&
    minOutputPass &&
    capacityAvailablePass &&
    bondSufficientPass &&
    policySupportedPass &&
    noActivePenaltyPass;

  return {
    passed: allPassed,
    gates,
  };
}

/**
 * Calculates the deterministic Quality Score (Qs) for a bid across all competing bids in an auction.
 */
export function calculateQualityScore(
  bid: Bid,
  allBids: Bid[],
  intent: Intent,
  solver: Solver,
  weights: ScoringWeights = DEFAULT_WEIGHTS
): ScoreBreakdown {
  const maxOutput = Math.max(...allBids.map((b) => b.outputAmount), bid.outputAmount, 1);
  const minEta = Math.min(...allBids.map((b) => b.etaSeconds), bid.etaSeconds, 1);

  const chainAssetKey = `${intent.destChain.toLowerCase()}-${intent.destAsset.toLowerCase()}`;
  const cap = solver.capacityByChainAsset[chainAssetKey] || { available: 0 };

  // 1. Raw values
  const rawValue = bid.outputAmount;
  const rawSpeed = bid.etaSeconds;
  const rawReliability = solver.reliabilityScore;
  const rawHeadroom = cap.available / Math.max(bid.outputAmount, 1);
  const rawSecurity = solver.bondAmount;
  const rawRiskPenalty = solver.activePenalties.length;

  // 2. Normalized values (0 to 100)
  // Value: Relative to maximum output bid in the auction
  const normValue = Math.min(100, Math.max(0, (rawValue / maxOutput) * 100));

  // Speed: Inverse ratio relative to fastest solver ETA
  const normSpeed = Math.min(100, Math.max(0, (minEta / Math.max(rawSpeed, 1)) * 100));

  // Reliability: Already 0 - 100 percentage
  const normReliability = Math.min(100, Math.max(0, rawReliability));

  // Headroom: Capacity ratio normalized (5x capacity headroom = 100 score)
  const normHeadroom = Math.min(100, Math.max(0, rawHeadroom * 20));

  // Security: Bond relative to $50,000 max benchmark
  const normSecurity = Math.min(100, Math.max(0, (rawSecurity / 50000) * 100));

  // Risk Penalty: Each active penalty subtracts score
  const normRiskPenalty = Math.min(100, rawRiskPenalty * 50);

  // 3. Weighted total score calculation
  const weightedValue = weights.value * normValue;
  const weightedSpeed = weights.speed * normSpeed;
  const weightedReliability = weights.reliability * normReliability;
  const weightedHeadroom = weights.headroom * normHeadroom;
  const weightedSecurity = weights.security * normSecurity;
  const weightedRiskPenalty = weights.riskPenalty * normRiskPenalty;

  const qsUnrounded =
    weightedValue +
    weightedSpeed +
    weightedReliability +
    weightedHeadroom +
    weightedSecurity -
    weightedRiskPenalty;

  const qs = Math.min(100, Math.max(0, Math.round(qsUnrounded * 100) / 100));

  return {
    qs,
    raw: {
      value: rawValue,
      speed: rawSpeed,
      reliability: rawReliability,
      headroom: rawHeadroom,
      security: rawSecurity,
      riskPenalty: rawRiskPenalty,
    },
    normalized: {
      value: Math.round(normValue * 10) / 10,
      speed: Math.round(normSpeed * 10) / 10,
      reliability: Math.round(normReliability * 10) / 10,
      headroom: Math.round(normHeadroom * 10) / 10,
      security: Math.round(normSecurity * 10) / 10,
      riskPenalty: Math.round(normRiskPenalty * 10) / 10,
    },
    weights,
  };
}
