import { NextResponse } from 'next/server';
import { protocolEngine } from '@/lib/simulation/Engine';

export async function GET() {
  const intents = protocolEngine.getAllIntents();
  return NextResponse.json({ success: true, intents });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const intent = protocolEngine.createIntent({
      userAddress: body.userAddress || '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      sourceChain: body.sourceChain || 'Ethereum',
      destChain: body.destChain || 'Arbitrum',
      sourceAsset: body.sourceAsset || 'ETH',
      destAsset: body.destAsset || 'USDC',
      sourceAmount: Number(body.sourceAmount) || 1.0,
      minDestAmount: Number(body.minDestAmount) || 1000,
      deadline: Math.floor(Date.now() / 1000) + Number(body.deadlineOffset || 3600),
      recipient: body.recipient || body.userAddress || '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      verifierPolicy: {
        verifierClass: body.verifierClass || 'routine',
        requiredConfirmations: Number(body.requiredConfirmations) || 6,
        challengeRule: body.challengeRule || 'Standard optimistic verification',
        maxSettlementDelay: Number(body.maxSettlementDelay) || 60,
      },
      signature: body.signature || '0x' + Array.from({ length: 130 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
    });

    return NextResponse.json({ success: true, intent });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
