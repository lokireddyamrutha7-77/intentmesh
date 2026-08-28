import { NextResponse } from 'next/server';
import { protocolEngine } from '@/lib/simulation/Engine';
import { solverRegistry } from '@/lib/simulation/SolverRegistry';

export async function GET() {
  const config = protocolEngine.getConfig();
  const solvers = solverRegistry.getAllSolvers();
  return NextResponse.json({ success: true, config, solvers });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (body.weights) {
      protocolEngine.updateWeights(body.weights);
    }

    if (body.solvers && Array.isArray(body.solvers)) {
      body.solvers.forEach((sUpdate: any) => {
        const solver = solverRegistry.getSolver(sUpdate.id);
        if (solver) {
          if (sUpdate.reliabilityScore !== undefined) {
            solver.reliabilityScore = Number(sUpdate.reliabilityScore);
          }
          if (sUpdate.bondAmount !== undefined) {
            solver.bondAmount = Number(sUpdate.bondAmount);
          }
        }
      });
    }

    return NextResponse.json({
      success: true,
      config: protocolEngine.getConfig(),
      solvers: solverRegistry.getAllSolvers(),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
