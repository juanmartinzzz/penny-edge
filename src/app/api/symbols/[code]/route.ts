import { NextRequest, NextResponse } from 'next/server';
import { symbolService } from '@/lib/symbol-service';

export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const decodedCode = decodeURIComponent(code);

    // Handle both full symbol codes (e.g., "ABC.TO") and base codes (e.g., "ABC")
    let symbolCode = decodedCode;
    if (decodedCode.includes('.')) {
      // If it contains a dot, it's a full symbol code, extract the base code
      symbolCode = decodedCode.split('.')[0];
    }

    const symbol = await symbolService.getSymbolByCode(symbolCode);

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
    const decodedCode = decodeURIComponent(code);

    // Handle both full symbol codes (e.g., "ABC.TO") and base codes (e.g., "ABC")
    let symbolCode = decodedCode;
    if (decodedCode.includes('.')) {
      // If it contains a dot, it's a full symbol code, extract the base code
      symbolCode = decodedCode.split('.')[0];
    }

    const symbol = await symbolService.updateSymbolByCode(symbolCode, body);
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
    const decodedCode = decodeURIComponent(code);

    // Handle both full symbol codes (e.g., "ABC.TO") and base codes (e.g., "ABC")
    let symbolCode = decodedCode;
    if (decodedCode.includes('.')) {
      // If it contains a dot, it's a full symbol code, extract the base code
      symbolCode = decodedCode.split('.')[0];
    }

    // First get the symbol to get its ID for soft delete
    const symbol = await symbolService.getSymbolByCode(symbolCode);
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