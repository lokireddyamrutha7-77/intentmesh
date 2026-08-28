import {
  EligibilityReason,
  EligibilityResult,
  Intent,
  SolverCapabilities,
  SolverProfile,
} from "@intentmesh/protocol-types";

/**
 * Deterministic capability & structural eligibility evaluator for solvers.
 * Strictly verifies whether a solver is structurally capable of attempting an intent.
 */
export function evaluateEligibility(
  intent: Intent,
  profile: SolverProfile,
  capabilities: SolverCapabilities,
  currentTimestamp: bigint = BigInt(Math.floor(Date.now() / 1000))
): EligibilityResult {
  const reasons: EligibilityReason[] = [];

  if (!profile || !profile.solver || profile.solver === "0x0000000000000000000000000000000000000000") {
    reasons.push(EligibilityReason.SOLVER_UNREGISTERED);
  }

  if (profile && !profile.isActive) {
    reasons.push(EligibilityReason.SOLVER_INACTIVE);
  }

  if (intent.deadline <= currentTimestamp) {
    reasons.push(EligibilityReason.EXPIRED_INTENT);
  }

  const supportedChainSet = new Set(capabilities.supportedChains.map((c: bigint) => c.toString()));

  if (!supportedChainSet.has(intent.sourceChainId.toString())) {
    reasons.push(EligibilityReason.SOURCE_CHAIN_UNSUPPORTED);
  }

  if (!supportedChainSet.has(intent.destinationChainId.toString())) {
    reasons.push(EligibilityReason.DESTINATION_CHAIN_UNSUPPORTED);
  }

  const sourceTokens = capabilities.supportedTokens[intent.sourceChainId.toString()] || [];
  const sourceTokenSet = new Set(sourceTokens.map((t: string) => t.toLowerCase()));
  if (!sourceTokenSet.has(intent.sourceToken.toLowerCase())) {
    reasons.push(EligibilityReason.SOURCE_TOKEN_UNSUPPORTED);
  }

  const destTokens = capabilities.supportedTokens[intent.destinationChainId.toString()] || [];
  const destTokenSet = new Set(destTokens.map((t: string) => t.toLowerCase()));
  if (!destTokenSet.has(intent.destinationToken.toLowerCase())) {
    reasons.push(EligibilityReason.DESTINATION_TOKEN_UNSUPPORTED);
  }

  const eligible = reasons.length === 0;
  if (eligible) {
    reasons.push(EligibilityReason.ELIGIBLE);
  }

  return { eligible, reasons };
}
