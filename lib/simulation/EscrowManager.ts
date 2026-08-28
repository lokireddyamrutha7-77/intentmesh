import { Intent } from '../types';
import { eventBus } from './EventBus';

export interface EscrowAccount {
  intentId: string;
  userAddress: string;
  sourceChain: string;
  sourceAsset: string;
  sourceAmount: number;
  status: 'locked' | 'released' | 'refunded';
  lockedAt: number;
}

export class EscrowManager {
  private escrows: Map<string, EscrowAccount> = new Map();

  public lockSourceEscrow(intent: Intent): EscrowAccount {
    const escrow: EscrowAccount = {
      intentId: intent.id,
      userAddress: intent.userAddress,
      sourceChain: intent.sourceChain,
      sourceAsset: intent.sourceAsset,
      sourceAmount: intent.sourceAmount,
      status: 'locked',
      lockedAt: Math.floor(Date.now() / 1000),
    };

    this.escrows.set(intent.id, escrow);
    return escrow;
  }

  public releaseToSolver(intentId: string, solverId: string, solverAddress: string): boolean {
    const escrow = this.escrows.get(intentId);
    if (!escrow || escrow.status !== 'locked') return false;

    escrow.status = 'released';

    eventBus.emit(
      'SettlementReleased',
      {
        intentId,
        solverId,
        solverAddress,
        releasedAmount: escrow.sourceAmount,
        asset: escrow.sourceAsset,
        chain: escrow.sourceChain,
      },
      intentId,
      solverId
    );

    return true;
  }

  public refundUser(intentId: string, reason: string): boolean {
    const escrow = this.escrows.get(intentId);
    if (!escrow || escrow.status !== 'locked') return false;

    escrow.status = 'refunded';

    eventBus.emit(
      'SettlementReleased',
      {
        intentId,
        userAddress: escrow.userAddress,
        action: 'user_refund',
        reason,
        refundedAmount: escrow.sourceAmount,
        asset: escrow.sourceAsset,
        chain: escrow.sourceChain,
      },
      intentId
    );

    return true;
  }

  public getEscrow(intentId: string): EscrowAccount | undefined {
    return this.escrows.get(intentId);
  }

  public reset(): void {
    this.escrows.clear();
  }
}

export const escrowManager = new EscrowManager();
