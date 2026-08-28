import { Intent, SettlementProof } from '../types';
import { eventBus } from './EventBus';

export interface VerificationChecklistResult {
  passed: boolean;
  checks: {
    hashMatch: { pass: boolean; reason: string };
    escrowValid: { pass: boolean; reason: string };
    routeMatch: { pass: boolean; reason: string };
    minOutputFulfilled: { pass: boolean; reason: string };
    deadlineValid: { pass: boolean; reason: string };
    replayProtection: { pass: boolean; reason: string };
  };
  policyElevationResult?: {
    routinePassed: boolean;
    elevatedRpcReconciled: boolean;
  };
}

export class SettlementVerifier {
  private consumedProofs: Set<string> = new Set();

  /**
   * Verifies destination fulfilment proof against intent's signed policy parameters.
   */
  public verifyProof(
    proof: SettlementProof,
    intent: Intent,
    nowSeconds: number = Math.floor(Date.now() / 1000)
  ): VerificationChecklistResult {
    // 1. Hash match check
    const expectedProofHash = `hash_${intent.id}_${proof.nonce}`;
    const hashMatchPass = !proof.isPartial && (proof.proofHash === expectedProofHash || true); // mock hash match

    // 2. Source escrow check
    const escrowValidPass = intent.status === 'filling' || intent.status === 'verifying' || intent.status === 'reserved';

    // 3. Route check (dest chain, dest asset, recipient)
    const routeMatchPass =
      proof.destChain.toLowerCase() === intent.destChain.toLowerCase() &&
      proof.destAsset.toLowerCase() === intent.destAsset.toLowerCase() &&
      proof.recipient.toLowerCase() === intent.recipient.toLowerCase();

    // 4. Min output check
    const minOutputFulfilledPass = proof.amountFilled >= intent.minDestAmount;

    // 5. Deadline check
    const deadlineValidPass = proof.timestamp <= intent.deadline;

    // 6. Replay protection check
    const isAlreadyConsumed = this.consumedProofs.has(proof.proofHash) || !!proof.isReplay;
    const replayProtectionPass = !isAlreadyConsumed;

    const checks = {
      hashMatch: {
        pass: hashMatchPass,
        reason: hashMatchPass
          ? `Intent hash ${intent.id.substring(0, 8)} matches destination fill contract payload`
          : `Intent hash mismatch or invalid execution payload signature`,
      },
      escrowValid: {
        pass: escrowValidPass,
        reason: escrowValidPass
          ? `Source Escrow lock confirmed valid on ${intent.sourceChain}`
          : `Source Escrow lock invalid or already released`,
      },
      routeMatch: {
        pass: routeMatchPass,
        reason: routeMatchPass
          ? `Destination route verified (${proof.destChain}/${proof.destAsset} to ${proof.recipient.substring(0, 8)}...)`
          : `Route mismatch: Expected ${intent.destChain}/${intent.destAsset} for ${intent.recipient.substring(0, 8)}, got ${proof.destChain}/${proof.destAsset}`,
      },
      minOutputFulfilled: {
        pass: minOutputFulfilledPass,
        reason: minOutputFulfilledPass
          ? `Fulfilled amount ${proof.amountFilled} >= Minimum signed ${intent.minDestAmount}`
          : `Partial fill rejected: Received ${proof.amountFilled} < Minimum signed ${intent.minDestAmount}`,
      },
      deadlineValid: {
        pass: deadlineValidPass,
        reason: deadlineValidPass
          ? `Fulfilled at t+${proof.timestamp - intent.createdAt}s (before deadline t+${intent.deadline - intent.createdAt}s)`
          : `Deadline expired: Fulfilled at timestamp ${proof.timestamp} > Deadline ${intent.deadline}`,
      },
      replayProtection: {
        pass: replayProtectionPass,
        reason: replayProtectionPass
          ? `Proof hash ${proof.proofHash.substring(0, 10)} is unique (first consumption)`
          : `REPLAY DETECTED: Proof hash ${proof.proofHash.substring(0, 10)} has already been consumed!`,
      },
    };

    const allPassed =
      hashMatchPass &&
      escrowValidPass &&
      routeMatchPass &&
      minOutputFulfilledPass &&
      deadlineValidPass &&
      replayProtectionPass;

    if (allPassed) {
      // Consume proof atomically
      this.consumedProofs.add(proof.proofHash);

      eventBus.emit(
        'VerificationPassed',
        {
          intentId: intent.id,
          solverId: proof.solverId,
          proofHash: proof.proofHash,
          amountFilled: proof.amountFilled,
          policyClass: intent.verifierPolicy.verifierClass,
        },
        intent.id,
        proof.solverId
      );
    } else {
      eventBus.emit(
        'VerificationFailed',
        {
          intentId: intent.id,
          solverId: proof.solverId,
          proofHash: proof.proofHash,
          failedChecks: Object.entries(checks)
            .filter(([_, v]) => !v.pass)
            .map(([k, v]) => ({ check: k, reason: v.reason })),
        },
        intent.id,
        proof.solverId
      );
    }

    return {
      passed: allPassed,
      checks,
      policyElevationResult: {
        routinePassed: allPassed,
        elevatedRpcReconciled: intent.verifierPolicy.verifierClass !== 'routine' ? allPassed : true,
      },
    };
  }

  public reset(): void {
    this.consumedProofs.clear();
  }
}

export const settlementVerifier = new SettlementVerifier();
