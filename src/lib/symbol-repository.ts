import { supabaseAdmin, SYMBOLS_TABLE } from './supabase';
import { SymbolEntity, CreateSymbolInput, UpdateSymbolInput } from '@/types/symbol';

interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface PaginatedSymbolsResult {
  data: SymbolEntity[];
  total: number;
  page: number;
  totalPages: number;
}

interface SymbolFilters {
  code?: string;
  exchange?: string;
}

// Create operation
export async function createSymbol(input: CreateSymbolInput): Promise<SymbolEntity> {
  const { data, error } = await supabaseAdmin
    .from(SYMBOLS_TABLE)
    .insert([{
      ...input,
      last_updated_recent_prices: input.recent_prices ? new Date().toISOString() : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create symbol: ${error.message}`);
  }

  return data as SymbolEntity;
}

// Read operations
export async function getSymbolById(id: string): Promise<SymbolEntity | null> {
  const { data, error } = await supabaseAdmin
    .from(SYMBOLS_TABLE)
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') { // No rows returned
      return null;
    }
    throw new Error(`Failed to get symbol: ${error.message}`);
  }

  return data as SymbolEntity;
}

export async function getSymbolByCode(code: string): Promise<SymbolEntity | null> {
  const { data, error } = await supabaseAdmin
    .from(SYMBOLS_TABLE)
    .select('*')
    .eq('code', code)
    .is('deleted_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') { // No rows returned
      return null;
    }
    throw new Error(`Failed to get symbol: ${error.message}`);
  }

  return data as SymbolEntity;
}

export async function getSymbols(options: PaginationOptions): Promise<PaginatedSymbolsResult> {
  const { page, limit, sortBy = 'created_at', sortOrder = 'desc' } = options;
  const offset = (page - 1) * limit;

  // Get total count
  const { count: totalCount, error: countError } = await supabaseAdmin
    .from(SYMBOLS_TABLE)
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null);

  if (countError) {
    throw new Error(`Failed to get symbol count: ${countError.message}`);
  }

  // Get paginated data
  let query = supabaseAdmin
    .from(SYMBOLS_TABLE)
    .select('*')
    .is('deleted_at', null)
    .range(offset, offset + limit - 1);

  // Add sorting
  if (sortOrder === 'desc') {
    query = query.order(sortBy, { ascending: false });
  } else {
    query = query.order(sortBy, { ascending: true });
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get symbols: ${error.message}`);
  }

  return {
    data: data as SymbolEntity[],
    total: totalCount || 0,
    page,
    totalPages: Math.ceil((totalCount || 0) / limit),
  };
}

export async function getSymbolsByFilter(filters: SymbolFilters): Promise<SymbolEntity[]> {
  let query = supabaseAdmin
    .from(SYMBOLS_TABLE)
    .select('*')
    .is('deleted_at', null);

  // Apply filters
  if (filters.code) {
    query = query.eq('code', filters.code);
  }

  if (filters.exchange) {
    query = query.eq('exchange', filters.exchange);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get filtered symbols: ${error.message}`);
  }

  return data as SymbolEntity[];
}

// Update operation
export async function updateSymbol(id: string, input: UpdateSymbolInput): Promise<SymbolEntity> {
  // Check if symbol exists and is not deleted
  const existingSymbol = await getSymbolById(id);
  if (!existingSymbol) {
    throw new Error('Symbol not found');
  }

  // Prepare update data
  const updateData: any = {
    ...input,
    updated_at: new Date().toISOString(),
  };

  // If recent_prices is being updated, also update last_updated_recent_prices
  if (input.recent_prices !== undefined) {
    updateData.last_updated_recent_prices = new Date().toISOString();
  }

  // Update in Supabase
  const { data, error } = await supabaseAdmin
    .from(SYMBOLS_TABLE)
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update symbol: ${error.message}`);
  }

  return data as SymbolEntity;
}

export async function updateSymbolByCode(code: string, input: UpdateSymbolInput): Promise<SymbolEntity> {
  // Check if symbol exists and is not deleted
  const existingSymbol = await getSymbolByCode(code);
  if (!existingSymbol) {
    throw new Error('Symbol not found');
  }

  // Prepare update data
  const updateData: any = {
    ...input,
    updated_at: new Date().toISOString(),
  };

  // If recent_prices is being updated, also update last_updated_recent_prices
  if (input.recent_prices !== undefined) {
    updateData.last_updated_recent_prices = new Date().toISOString();
  }

  // Update in Supabase
  const { data, error } = await supabaseAdmin
    .from(SYMBOLS_TABLE)
    .update(updateData)
    .eq('code', code)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update symbol: ${error.message}`);
  }

  return data as SymbolEntity;
}

// Soft-delete operation
export async function softDeleteSymbol(id: string): Promise<SymbolEntity> {
  // Check if symbol exists and is not already deleted
  const existingSymbol = await getSymbolById(id);
  if (!existingSymbol) {
    throw new Error('Symbol not found');
  }

  if (existingSymbol.deleted_at) {
    throw new Error('Symbol is already deleted');
  }

  // Mark as soft-deleted in Supabase
  const { data, error } = await supabaseAdmin
    .from(SYMBOLS_TABLE)
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to soft delete symbol: ${error.message}`);
  }

  return data as SymbolEntity;
}

// Restore soft-deleted symbol
export async function restoreSymbol(id: string): Promise<SymbolEntity> {
  // Check if symbol exists and is deleted
  const { data: existingSymbol, error: fetchError } = await supabaseAdmin
    .from(SYMBOLS_TABLE)
    .select('*')
    .eq('id', id)
    .not('deleted_at', 'is', null)
    .single();

  if (fetchError || !existingSymbol) {
    throw new Error('Symbol not found or not deleted');
  }

  // Restore by setting deleted_at to null
  const { data, error } = await supabaseAdmin
    .from(SYMBOLS_TABLE)
    .update({
      deleted_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to restore symbol: ${error.message}`);
  }

  return data as SymbolEntity;
}

// Hard delete (permanent deletion)
export async function hardDeleteSymbol(id: string): Promise<void> {
  // Permanently delete from Supabase
  const { error } = await supabaseAdmin
    .from(SYMBOLS_TABLE)
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to hard delete symbol: ${error.message}`);
  }
}

// Dashboard statistics
export interface DashboardStats {
  totalSymbols: number;
  outdatedSymbols: number; // last_updated_recent_prices is null or >= 24 hours ago
  recentSymbols: number; // last_updated_recent_prices < 24 hours ago
}

export async function getDashboardStats(): Promise<DashboardStats> {
  // Get total symbols count
  const { count: totalSymbols, error: totalError } = await supabaseAdmin
    .from(SYMBOLS_TABLE)
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null);

  if (totalError) {
    throw new Error(`Failed to get total symbols count: ${totalError.message}`);
  }

  // Get count of symbols with recent prices updated within last 24 hours
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { count: recentSymbols, error: recentError } = await supabaseAdmin
    .from(SYMBOLS_TABLE)
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null)
    .gte('last_updated_recent_prices', twentyFourHoursAgo);

  if (recentError) {
    throw new Error(`Failed to get recent symbols count: ${recentError.message}`);
  }

  // Outdated symbols = total - recent (includes null values)
  const outdatedSymbols = (totalSymbols || 0) - (recentSymbols || 0);

  return {
    totalSymbols: totalSymbols || 0,
    outdatedSymbols,
    recentSymbols: recentSymbols || 0,
  };
}