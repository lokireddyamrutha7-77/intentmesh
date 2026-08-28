import { NextResponse } from 'next/server';
import { protocolEngine } from '@/lib/simulation/Engine';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const failureType = body.failureType as 'forced_timeout' | 'forced_partial_fill' | 'forced_replay_proof';

    if (!failureType) {
      return NextResponse.json({ success: false, error: 'failureType is required' }, { status: 400 });
    }

    const result = protocolEngine.triggerFailureScenario(params.id, failureType);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
