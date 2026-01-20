import { NextRequest, NextResponse } from 'next/server';
import { symbolService } from '@/lib/symbol-service';

export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const symbol = await symbolService.getSymbolByCode(decodeURIComponent(code));

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol not found' }, { status: 404 });
    }

    return NextResponse.json(symbol);
  } catch (error: any) {
    console.error('Error getting symbol:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const body = await request.json();

    const symbol = await symbolService.updateSymbolByCode(decodeURIComponent(code), body);
    return NextResponse.json(symbol);
  } catch (error: any) {
    console.error('Error updating symbol:', error);

    if (error.message === 'Symbol not found') {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;

    // First get the symbol to get its ID for soft delete
    const symbol = await symbolService.getSymbolByCode(decodeURIComponent(code));
    if (!symbol) {
      return NextResponse.json({ error: 'Symbol not found' }, { status: 404 });
    }

    await symbolService.softDeleteSymbol(symbol.id);
    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error('Error deleting symbol:', error);

    if (error.message === 'Symbol not found') {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}