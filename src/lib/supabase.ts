import { createClient } from '@supabase/supabase-js';

// Supabase client configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create Supabase admin client for server-side operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Table naming with prefix support
const TABLE_PREFIX = process.env.SUPABASE_TABLE_PREFIX || '';

export function getTableName(table: string): string {
  return `${TABLE_PREFIX}${table}`;
}

// Table names
export const SYMBOLS_TABLE = getTableName('symbols');