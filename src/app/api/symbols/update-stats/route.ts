import { NextRequest, NextResponse } from 'next/server';
import { symbolService } from '@/lib/symbol-service';

export async function GET(request: NextRequest) {
  try {
    const stats = await symbolService.getDashboardStats();
    return NextResponse.json(stats);
  } catch (error: any) {
    console.error('Error getting dashboard stats:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}