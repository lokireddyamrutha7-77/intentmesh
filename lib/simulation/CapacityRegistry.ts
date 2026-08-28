import { Solver, CapacityDetails } from '../types';
import { eventBus } from './EventBus';

export class CapacityRegistry {
  /**
   * Recalculates available capacity according to exact formula:
   * available = declared - activeReservations - pendingSettlementExposure
   */
  public updateAvailable(capacity: CapacityDetails): number {
    capacity.available = Math.max(
      0,
      capacity.declared - capacity.reserved - capacity.pending
    );
    return capacity.available;
  }

  /**
   * Atomically attempts to reserve capacity for a solver fill.
   * Prevents overcommit / double commit.
   */
  public reserveCapacity(
    solver: Solver,
    chainAsset: string,
    amount: number,
    intentId: string
  ): { success: boolean; reason?: string } {
    const key = chainAsset.toLowerCase();
    let cap = solver.capacityByChainAsset[key];

    if (!cap) {
      cap = { declared: 100000, reserved: 0, pending: 0, available: 100000 };
      solver.capacityByChainAsset[key] = cap;
    }

    this.updateAvailable(cap);

    if (cap.available < amount) {
      eventBus.emit(
        'CapacityOvercommitRejected',
        {
          solverId: solver.id,
          solverName: solver.name,
          chainAsset,
          requestedAmount: amount,
          availableCapacity: cap.available,
          declaredLiquidity: cap.declared,
          reserved: cap.reserved,
          pending: cap.pending,
        },
        intentId,
        solver.id
      );

      return {
        success: false,
        reason: `Insufficient available capacity. Requested: ${amount.toLocaleString()}, Available: ${cap.available.toLocaleString()}`,
      };
    }

    // Atomic state mutation
    cap.reserved += amount;
    this.updateAvailable(cap);

    eventBus.emit(
      'CapacityReserved',
      {
        solverId: solver.id,
        solverName: solver.name,
        chainAsset,
        reservedAmount: amount,
        newAvailable: cap.available,
        newReserved: cap.reserved,
      },
      intentId,
      solver.id
    );

    return { success: true };
  }

  /**
   * Moves reserved capacity to pending settlement exposure once fill starts.
   */
  public markPending(solver: Solver, chainAsset: string, amount: number): void {
    const key = chainAsset.toLowerCase();
    const cap = solver.capacityByChainAsset[key];
    if (!cap) return;

    cap.reserved = Math.max(0, cap.reserved - amount);
    cap.pending += amount;
    this.updateAvailable(cap);
  }

  /**
   * Releases capacity atomically on completion, expiry, or failure.
   */
  public releaseCapacity(
    solver: Solver,
    chainAsset: string,
    amount: number,
    intentId: string,
    fromState: 'reserved' | 'pending'
  ): void {
    const key = chainAsset.toLowerCase();
    const cap = solver.capacityByChainAsset[key];
    if (!cap) return;

    if (fromState === 'reserved') {
      cap.reserved = Math.max(0, cap.reserved - amount);
    } else {
      cap.pending = Math.max(0, cap.pending - amount);
    }

    this.updateAvailable(cap);
  }
}

export const capacityRegistry = new CapacityRegistry();
