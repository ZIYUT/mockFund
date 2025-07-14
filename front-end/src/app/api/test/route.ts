import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    message: 'API is working',
    timestamp: new Date().toISOString(),
    env: {
      hasCoinGeckoKey: !!process.env.NEXT_PUBLIC_COINGECKO_API_KEY,
      coinGeckoBaseUrl: process.env.NEXT_PUBLIC_COINGECKO_BASE_URL || 'https://api.coingecko.com/api/v3'
    }
  });
} 