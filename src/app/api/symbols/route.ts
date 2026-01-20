import { NextRequest, NextResponse } from 'next/server';
import { ALL_SYMBOLS } from '@/lib/symbols';
import { Symbol } from '@/types/symbol';

/**
 * API endpoint for fetching categorized stock symbols.
 *
 * Currently reads from static lib files containing TSX and TSXV symbol data.
 *
 * FUTURE DATABASE INTEGRATION:
 * When moving to a database, follow these steps:
 *
 * 1. Set up database connection (Prisma/PostgreSQL recommended)
 *    - Install Prisma: npm install prisma @prisma/client
 *    - Initialize: npx prisma init
 *    - Create schema for symbols table with fields: code, name, country, exchange, currency, type, isin, industry?, sector?
 *
 * 2. Create database migration
 *    - Define Symbol model in schema.prisma
 *    - Run: npx prisma migrate dev --name add-symbols-table
 *
 * 3. Import symbol data into database
 *    - Create a seed script that reads from TO_LIST_OF_SYMBOLS.ts and V_LIST_OF_SYMBOLS.ts
 *    - Transform the data to match your database schema
 *    - Run seed: npx prisma db seed
 *
 * 4. Update this endpoint to:
 *    - Remove import of ALL_SYMBOLS from lib files
 *    - Import database client (PrismaClient)
 *    - Query database: await prisma.symbol.findMany()
 *    - Add industry/sector data from database if available
 *
 * 5. Add caching layer (Redis recommended)
 *    - Cache categorized results for 1 hour
 *    - Use Redis SET/GET with JSON serialization
 *    - Handle cache invalidation when symbols are updated
 *
 * 6. Add filtering/search capabilities
 *    - Add query parameters: ?exchange=TO&category=mining&type=common
 *    - Implement database WHERE clauses for filtering
 *
 * 7. Add pagination for large result sets
 *    - Add ?page=1&limit=100 query parameters
 *    - Return metadata: { total, page, limit, hasMore }
 *
 * 8. Add symbol metadata enrichment
 *    - Fetch additional data from external APIs (market cap, sector, industry)
 *    - Store enriched data in database
 *    - Consider background jobs for data enrichment
 *
 * 9. Error handling and monitoring
 *    - Add database connection error handling
 *    - Implement retry logic for database queries
 *    - Add logging for performance monitoring
 *    - Consider rate limiting for API calls
 */

interface SymbolCategories {
  [category: string]: {
    tsx: string[];
    tsxv: string[];
  };
}

export async function GET(request: NextRequest) {
  try {
    console.log('Symbols API called - reading from lib files');

    // Group symbols by their actual type field (from the static data)
    const categorizedSymbols: SymbolCategories = {};

    // Categorize each symbol by its type and exchange
    ALL_SYMBOLS.forEach((symbol: Symbol) => {
      const category = symbol.type;
      const symbolCode = `${symbol.code}.${symbol.exchange}`;

      if (!categorizedSymbols[category]) {
        categorizedSymbols[category] = { tsx: [], tsxv: [] };
      }

      if (symbol.exchange === 'TO') {
        categorizedSymbols[category].tsx.push(symbolCode);
      } else if (symbol.exchange === 'V') {
        categorizedSymbols[category].tsxv.push(symbolCode);
      }
    });

    // Sort categories alphabetically for consistent display
    const sortedCategories: SymbolCategories = {};
    Object.keys(categorizedSymbols)
      .sort()
      .forEach(category => {
        sortedCategories[category] = categorizedSymbols[category];
      });

    console.log(`Symbols processed successfully: ${ALL_SYMBOLS.length} total symbols in ${Object.keys(sortedCategories).length} categories`);

    return NextResponse.json({
      categories: sortedCategories,
      totalSymbols: ALL_SYMBOLS.length,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in symbols API:', error);
    console.error('Error details:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: 'Failed to fetch symbols' },
      { status: 500 }
    );
  }
}