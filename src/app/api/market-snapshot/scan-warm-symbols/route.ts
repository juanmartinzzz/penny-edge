import { NextRequest, NextResponse } from 'next/server';
import {
  UpdateWarmSymbolsRequest,
  getWarmSymbolRequestValidationError,
  scanWarmSymbols
} from '../update-warm-symbols/route';

export async function POST(request: NextRequest) {
  try {
    const body: UpdateWarmSymbolsRequest = await request.json();

    const validationError = getWarmSymbolRequestValidationError(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const { allSymbols, warmSymbols, filterBreakdown } = await scanWarmSymbols(body);

    return NextResponse.json({
      totalSymbols: allSymbols.length,
      warmSymbols: warmSymbols.length,
      filterBreakdown
    });
  } catch (error: unknown) {
    console.error('Error in warm-symbol scan API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to scan warm symbols';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

