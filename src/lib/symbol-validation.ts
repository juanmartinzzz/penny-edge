import { z } from 'zod';

// Schema for AveragePricePeriod (matches average-prices endpoint structure)
const averagePricePeriodSchema = z.object({
  name: z.string(),
  startDaysAgo: z.number(),
  endDaysAgo: z.number(),
  averagePrice: z.number(),
  highestPrice: z.number(),
  lowestPrice: z.number(),
  changePercent: z.number().optional(),
  changeAbsolute: z.number().optional(),
  direction: z.enum(['up', 'down']).optional(),
});

// Schema for AveragePriceData
const averagePriceDataSchema = z.object({
  symbol: z.string(),
  periods: z.array(averagePricePeriodSchema),
});

export const createSymbolSchema = z.object({
  code: z.string().min(1).max(50),
  exchange: z.string().min(1).max(10),
  recent_prices: averagePriceDataSchema.optional(),
});

export const updateSymbolSchema = createSymbolSchema.partial();

export type CreateSymbolInput = z.infer<typeof createSymbolSchema>;
export type UpdateSymbolInput = z.infer<typeof updateSymbolSchema>;