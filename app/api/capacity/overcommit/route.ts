import { NextResponse } from 'next/server';
import { solverRegistry } from '@/lib/simulation/SolverRegistry';
import { capacityRegistry } from '@/lib/simulation/CapacityRegistry';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const solverId = body.solverId || 'solver_a';
    const chainAsset = body.chainAsset || 'arbitrum-usdc';
    const amount = Number(body.amount) || 9999999; // massive overcommit amount

    const solver = solverRegistry.getSolver(solverId);
    if (!solver) {
      return NextResponse.json({ success: false, error: 'Solver not found' }, { status: 404 });
    }

    const res = capacityRegistry.reserveCapacity(solver, chainAsset, amount, 'demo_overcommit_test');
    return NextResponse.json({
      success: res.success,
      reason: res.reason,
      solver,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
