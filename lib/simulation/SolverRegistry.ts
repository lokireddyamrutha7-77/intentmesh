import { Solver, PenaltyRecord } from '../types';
import { capacityRegistry } from './CapacityRegistry';
import { eventBus } from './EventBus';

export const INITIAL_SOLVERS: Solver[] = [
  {
    id: 'solver_a',
    name: 'AlphaRelay Bot',
    address: '0x3A9f88C6c7E28E954b8104f7C890088921aA12A1',
    reliabilityScore: 98,
    bondAmount: 45000,
    capacityByChainAsset: {
      'arbitrum-usdc': { declared: 250000, reserved: 0, pending: 0, available: 250000 },
      'optimism-usdc': { declared: 200000, reserved: 0, pending: 0, available: 200000 },
      'ethereum-usdt': { declared: 150000, reserved: 0, pending: 0, available: 150000 },
    },
    activePenalties: [],
    supportedVerifierClasses: ['routine', 'elevated', 'strict'],
  },
  {
    id: 'solver_b',
    name: 'BoltSpeed Bot',
    address: '0x7B12C45b9E1a48c69131C57a41B3eF102B9c88B2',
    reliabilityScore: 89,
    bondAmount: 30000,
    capacityByChainAsset: {
      'arbitrum-usdc': { declared: 180000, reserved: 0, pending: 0, available: 180000 },
      'optimism-usdc': { declared: 120000, reserved: 0, pending: 0, available: 120000 },
      'ethereum-usdt': { declared: 100000, reserved: 0, pending: 0, available: 100000 },
    },
    activePenalties: [],
    supportedVerifierClasses: ['routine', 'elevated'],
  },
  {
    id: 'solver_c',
    name: 'CitadelMesh Bot',
    address: '0xE589C1aF002598e3b88934C7b1F23214a1a3B77C',
    reliabilityScore: 95,
    bondAmount: 50000,
    capacityByChainAsset: {
      'arbitrum-usdc': { declared: 300000, reserved: 0, pending: 0, available: 300000 },
      'optimism-usdc': { declared: 250000, reserved: 0, pending: 0, available: 250000 },
      'ethereum-usdt': { declared: 200000, reserved: 0, pending: 0, available: 200000 },
    },
    activePenalties: [],
    supportedVerifierClasses: ['routine', 'elevated', 'strict'],
  },
];

export class SolverRegistry {
  private solvers: Map<string, Solver> = new Map();

  constructor() {
    this.resetFixtures();
  }

  public resetFixtures(): void {
    this.solvers.clear();
    INITIAL_SOLVERS.forEach((s) => {
      // Deep clone fixture
      const clone: Solver = JSON.parse(JSON.stringify(s));
      // recalculate available capacity
      Object.keys(clone.capacityByChainAsset).forEach((key) => {
        capacityRegistry.updateAvailable(clone.capacityByChainAsset[key]);
      });
      this.solvers.set(clone.id, clone);
    });
  }

  public getAllSolvers(): Solver[] {
    return Array.from(this.solvers.values());
  }

  public getSolver(id: string): Solver | undefined {
    return this.solvers.get(id);
  }

  /**
   * Applies penalty and slashes solver bond upon protocol failure.
   */
  public penalizeSolver(
    solverId: string,
    reason: string,
    slashAmount: number,
    intentId: string
  ): { success: boolean; slashed: number; newBond: number } {
    const solver = this.solvers.get(solverId);
    if (!solver) return { success: false, slashed: 0, newBond: 0 };

    const actualSlash = Math.min(solver.bondAmount, slashAmount);
    solver.bondAmount -= actualSlash;
    solver.reliabilityScore = Math.max(10, solver.reliabilityScore - 15); // Drop reliability

    const penaltyRecord: PenaltyRecord = {
      id: `pen_${Date.now()}`,
      reason,
      timestamp: Math.floor(Date.now() / 1000),
      slashedAmount: actualSlash,
    };

    solver.activePenalties.push(penaltyRecord);

    eventBus.emit(
      'PenaltyApplied',
      {
        solverId: solver.id,
        solverName: solver.name,
        reason,
        slashedAmount: actualSlash,
        remainingBond: solver.bondAmount,
        newReliabilityScore: solver.reliabilityScore,
      },
      intentId,
      solver.id
    );

    return {
      success: true,
      slashed: actualSlash,
      newBond: solver.bondAmount,
    };
  }

  public clearPenalties(solverId: string): void {
    const solver = this.solvers.get(solverId);
    if (solver) {
      solver.activePenalties = [];
    }
  }
}

export const solverRegistry = new SolverRegistry();
