import { NextRequest, NextResponse } from 'next/server';
import { symbolService } from '@/lib/symbol-service';

export async function GET(request: NextRequest) {
  try {
    const symbols = await symbolService.getAllSymbolsForHotness();

    return NextResponse.json({ symbols });
  } catch (error: any) {
    console.error('Error getting symbols hotness data:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}