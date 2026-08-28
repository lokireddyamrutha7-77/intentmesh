import { NextResponse } from 'next/server';
import { protocolEngine } from '@/lib/simulation/Engine';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const intentId = searchParams.get('intentId') || undefined;
  const events = protocolEngine.getEvents(intentId);
  return NextResponse.json({ success: true, events });
}
