import { NextRequest, NextResponse } from 'next/server';
import { getAveragePrices } from '@/lib/price-service';

export async function POST(request: NextRequest) {
  try {
    const { symbol, exchange, numberOfDaysInPeriod, amountOfPeriods } = await request.json();

    if (!symbol || typeof symbol !== 'string') {
      return NextResponse.json({ error: 'Symbol string is required' }, { status: 400 });
    }

    if (!exchange || typeof exchange !== 'string') {
      return NextResponse.json({ error: 'Exchange string is required' }, { status: 400 });
    }

    if (!numberOfDaysInPeriod || typeof numberOfDaysInPeriod !== 'number' || numberOfDaysInPeriod <= 0) {
      return NextResponse.json({ error: 'numberOfDaysInPeriod must be a positive number' }, { status: 400 });
    }

    if (!amountOfPeriods || typeof amountOfPeriods !== 'number' || amountOfPeriods <= 0) {
      return NextResponse.json({ error: 'amountOfPeriods must be a positive number' }, { status: 400 });
    }

    if (amountOfPeriods > 10) {
      return NextResponse.json({ error: 'amountOfPeriods cannot exceed 10' }, { status: 400 });
    }

    const data = await getAveragePrices(symbol, exchange, numberOfDaysInPeriod, amountOfPeriods);

    return NextResponse.json(data);

  } catch (error) {
    console.error('Error in average-prices API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}