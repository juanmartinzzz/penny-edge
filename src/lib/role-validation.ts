import { z } from 'zod';

export const createRoleSchema = z.object({
  name: z.string().min(1).max(100),
  isDefault: z.boolean(),
});

export const updateRoleSchema = createRoleSchema.partial();

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;