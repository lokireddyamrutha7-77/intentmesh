import { NextResponse } from 'next/server';
import { protocolEngine } from '@/lib/simulation/Engine';

export async function POST() {
  protocolEngine.resetSimulation();
  return NextResponse.json({
    success: true,
    message: 'Simulation reset to clean demo state',
    intents: protocolEngine.getAllIntents(),
  });
}
