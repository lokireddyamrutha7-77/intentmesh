import { NextResponse } from 'next/server';
import { protocolEngine } from '@/lib/simulation/Engine';
import { solverRegistry } from '@/lib/simulation/SolverRegistry';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const intent = protocolEngine.getIntent(params.id);
  if (!intent) {
    return NextResponse.json({ success: false, error: 'Intent not found' }, { status: 404 });
  }

  const bids = protocolEngine.getBidsForIntent(params.id);
  const solvers = solverRegistry.getAllSolvers();
  const events = protocolEngine.getEvents(params.id);

  return NextResponse.json({
    success: true,
    intent,
    bids,
    solvers,
    events,
  });
}
