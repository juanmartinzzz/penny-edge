import { SymbolEntity, CreateSymbolInput, UpdateSymbolInput } from '@/types/symbol';
import { CreateSymbolInput as ValidationCreateInput, UpdateSymbolInput as ValidationUpdateInput, createSymbolSchema, updateSymbolSchema } from './symbol-validation';
import {
  createSymbol as createSymbolRepo,
  getSymbolById as getSymbolByIdRepo,
  getSymbolByCode as getSymbolByCodeRepo,
  getSymbols as getSymbolsRepo,
  getSymbolsByFilter as getSymbolsByFilterRepo,
  getAllSymbolsForHotness as getAllSymbolsForHotnessRepo,
  updateSymbol as updateSymbolRepo,
  updateSymbolByCode as updateSymbolByCodeRepo,
  softDeleteSymbol as softDeleteSymbolRepo,
  restoreSymbol as restoreSymbolRepo,
  hardDeleteSymbol as hardDeleteSymbolRepo,
  getDashboardStats as getDashboardStatsRepo,
  type DashboardStats,
} from './symbol-repository';

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

export class SymbolService {
  async createSymbol(input: CreateSymbolInput): Promise<SymbolEntity> {
    // Validate input
    const validatedData = createSymbolSchema.parse(input);

    // Business logic: Check if symbol code already exists
    const existingSymbols = await getSymbolsByFilterRepo({ code: validatedData.code });
    if (existingSymbols.length > 0) {
      throw new Error('Symbol code already exists');
    }

    return createSymbolRepo(validatedData);
  }

  async getSymbolById(id: string): Promise<SymbolEntity | null> {
    return getSymbolByIdRepo(id);
  }

  async getSymbolByCode(code: string): Promise<SymbolEntity | null> {
    return getSymbolByCodeRepo(code);
  }

  async getSymbols(options: PaginationOptions): Promise<PaginatedSymbolsResult> {
    return getSymbolsRepo(options);
  }

  async getSymbolsByFilter(filter: { code?: string; exchange?: string }): Promise<SymbolEntity[]> {
    return getSymbolsByFilterRepo(filter);
  }

  async getAllSymbolsForHotness(): Promise<Array<{ code: string; exchange: string; hotness_score?: number }>> {
    return getAllSymbolsForHotnessRepo();
  }

  async updateSymbol(id: string, input: UpdateSymbolInput): Promise<SymbolEntity> {
    // Validate input
    const validatedData = updateSymbolSchema.parse(input);

    // Business logic: Check if symbol exists
    const existingSymbol = await getSymbolByIdRepo(id);
    if (!existingSymbol) {
      throw new Error('Symbol not found');
    }

    // Business logic: If updating code, check for uniqueness
    if (validatedData.code && validatedData.code !== existingSymbol.code) {
      const symbolsWithSameCode = await getSymbolsByFilterRepo({ code: validatedData.code });
      if (symbolsWithSameCode.length > 0) {
        throw new Error('Symbol code already exists');
      }
    }

    return updateSymbolRepo(id, validatedData);
  }

  async updateSymbolByCode(code: string, input: UpdateSymbolInput): Promise<SymbolEntity> {
    // Validate input
    const validatedData = updateSymbolSchema.parse(input);

    // Business logic: Check if symbol exists
    const existingSymbol = await getSymbolByCodeRepo(code);
    if (!existingSymbol) {
      throw new Error('Symbol not found');
    }

    // Business logic: If updating code, check for uniqueness
    if (validatedData.code && validatedData.code !== existingSymbol.code) {
      const symbolsWithSameCode = await getSymbolsByFilterRepo({ code: validatedData.code });
      if (symbolsWithSameCode.length > 0) {
        throw new Error('Symbol code already exists');
      }
    }

    return updateSymbolByCodeRepo(code, validatedData);
  }

  async softDeleteSymbol(id: string): Promise<SymbolEntity> {
    // Business logic: Check if symbol exists
    const symbol = await getSymbolByIdRepo(id);
    if (!symbol) {
      throw new Error('Symbol not found');
    }

    return softDeleteSymbolRepo(id);
  }

  async restoreSymbol(id: string): Promise<SymbolEntity> {
    return restoreSymbolRepo(id);
  }

  async hardDeleteSymbol(id: string): Promise<void> {
    // Business logic: Check if symbol exists
    const symbol = await getSymbolByIdRepo(id);
    if (!symbol && !await this.isSymbolDeleted(id)) {
      throw new Error('Symbol not found');
    }

    return hardDeleteSymbolRepo(id);
  }

  async getDashboardStats(): Promise<DashboardStats> {
    return getDashboardStatsRepo();
  }

  private async isSymbolDeleted(id: string): Promise<boolean> {
    // This would need to be implemented in the repository if needed
    // For now, we'll assume the symbol service checks via getSymbolById
    const symbol = await getSymbolByIdRepo(id);
    return symbol === null;
  }
}

// Export singleton instance
export const symbolService = new SymbolService();