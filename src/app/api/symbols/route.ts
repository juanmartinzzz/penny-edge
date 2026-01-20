import { NextRequest, NextResponse } from 'next/server';
import { symbolService } from '@/lib/symbol-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const symbol = await symbolService.createSymbol(body);
    return NextResponse.json(symbol, { status: 201 });
  } catch (error: any) {
    console.error('Error creating symbol:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';

    const result = await symbolService.getSymbols({
      page,
      limit,
      sortBy,
      sortOrder,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error getting symbols:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}