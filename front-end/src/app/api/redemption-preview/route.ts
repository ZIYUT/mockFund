import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const amount = searchParams.get('amount');

    if (!amount || parseFloat(amount) <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    // 模拟MFC价值（在实际应用中，这里应该从合约获取）
    const mfcValue = 1.0; // 1 USDC per MFC
    const usdcAmount = parseFloat(amount) * mfcValue;

    return NextResponse.json({ usdcAmount: usdcAmount.toString() });
  } catch {
    return NextResponse.json(
      { error: 'Failed to calculate preview' },
      { status: 500 }
    );
  }
} 