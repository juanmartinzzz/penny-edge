import { NextRequest, NextResponse } from 'next/server';
import { ALL_SYMBOLS } from '@/lib/symbols';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    // Parse the code - it might be "SYMBOL.TO" or "SYMBOL.V"
    const [symbolCode, exchange] = code.split('.');

    if (!symbolCode || !exchange) {
      return NextResponse.json(
        { error: 'Invalid symbol format. Expected: SYMBOL.EXCHANGE' },
        { status: 400 }
      );
    }

    // Find the symbol in our data
    const symbol = ALL_SYMBOLS.find(s =>
      s.code === symbolCode && s.exchange === exchange
    );

    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      symbol
    });

  } catch (error) {
    console.error('Error fetching symbol details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch symbol details' },
      { status: 500 }
    );
  }
}