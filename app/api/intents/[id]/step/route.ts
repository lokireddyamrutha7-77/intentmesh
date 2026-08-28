import { NextResponse } from 'next/server';
import { protocolEngine } from '@/lib/simulation/Engine';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const updatedIntent = protocolEngine.advanceStep(params.id);
    return NextResponse.json({ success: true, intent: updatedIntent });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
