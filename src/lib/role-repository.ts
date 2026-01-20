import { redis } from './redis';
import { Role } from '@/types/role';
import { CreateRoleInput, UpdateRoleInput } from './role-validation';
import { getRoleKey, getRoleListKey } from './role-keys';

// ID generation using Redis counter (simplified for compatibility)
async function generateRoleId(): Promise<string> {
  // For simplicity, use timestamp + random for ID generation
  // In production with real Redis, you'd use INCR
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Create operation
export async function createRole(input: CreateRoleInput): Promise<Role> {
  const id = await generateRoleId();

  const role: Role = {
    id,
    ...input,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const roleKey = getRoleKey(id);
  const roleData = JSON.stringify({
    ...role,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
    deletedAt: role.deletedAt,
  });

  // Store role data
  await redis.set(roleKey, roleData);

  // Add to active roles list (simplified - using a single key to store active role IDs)
  const activeRolesKey = getRoleListKey();
  const currentActive = await redis.get(activeRolesKey);
  const activeRoles = currentActive ? JSON.parse(currentActive as string) : [];
  activeRoles.push(id);
  await redis.set(activeRolesKey, JSON.stringify(activeRoles));

  return role;
}

// Read operations
export async function getRoleById(id: string): Promise<Role | null> {
  const roleKey = getRoleKey(id);

  // Get role data
  const roleDataStr = await redis.get(roleKey);
  if (!roleDataStr) {
    return null;
  }

  const roleData = JSON.parse(roleDataStr as string);

  // Check if soft-deleted
  if (roleData.deletedAt) {
    return null;
  }

  return roleData as Role;
}

interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export async function getRoles(options: PaginationOptions): Promise<{
  data: Role[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const { page, limit } = options;
  const offset = (page - 1) * limit;

  // Get active role IDs
  const activeRolesStr = await redis.get(getRoleListKey());
  const activeRoleIds: string[] = activeRolesStr ? JSON.parse(activeRolesStr as string) : [];

  // Filter out soft-deleted roles (simplified - in real Redis we'd use sets)
  const activeRoles = [];
  for (const id of activeRoleIds) {
    const role = await getRoleById(id);
    if (role) {
      activeRoles.push(role);
    }
  }

  // Simple sorting by createdAt desc (can be enhanced)
  activeRoles.sort((a, b) => b.createdAt - a.createdAt);

  // Apply pagination
  const paginatedRoles = activeRoles.slice(offset, offset + limit);

  return {
    data: paginatedRoles,
    total: activeRoles.length,
    page,
    totalPages: Math.ceil(activeRoles.length / limit),
  };
}

export async function getRolesByFilter(filter: { name?: string; isDefault?: boolean }): Promise<Role[]> {
  const { data: allRoles } = await getRoles({ page: 1, limit: 1000 }); // Get all active roles

  return allRoles.filter(role => {
    let matches = true;
    if (filter.name && role.name !== filter.name) {
      matches = false;
    }
    if (filter.isDefault !== undefined && role.isDefault !== filter.isDefault) {
      matches = false;
    }
    return matches;
  });
}

// Update operation
export async function updateRole(id: string, input: UpdateRoleInput): Promise<Role> {
  // Check if role exists and is not deleted
  const existingRole = await getRoleById(id);
  if (!existingRole) {
    throw new Error('Role not found');
  }

  // Prepare updated role
  const updatedRole: Role = {
    ...existingRole,
    ...input,
    updatedAt: Date.now(),
  };

  // Store updated role data
  const roleKey = getRoleKey(id);
  const roleData = JSON.stringify(updatedRole);
  await redis.set(roleKey, roleData);

  return updatedRole;
}

// Soft-delete operation
export async function softDeleteRole(id: string): Promise<Role> {
  // Check if role exists and is not already deleted
  const existingRole = await getRoleById(id);
  if (!existingRole) {
    throw new Error('Role not found');
  }

  if (existingRole.deletedAt) {
    throw new Error('Role is already deleted');
  }

  // Mark as soft-deleted
  const deletedRole: Role = {
    ...existingRole,
    deletedAt: Date.now(),
    updatedAt: Date.now(),
  };

  const roleKey = getRoleKey(id);
  const roleData = JSON.stringify(deletedRole);
  await redis.set(roleKey, roleData);

  // Remove from active roles list
  const activeRolesKey = getRoleListKey();
  const currentActive = await redis.get(activeRolesKey);
  const activeRoles: string[] = currentActive ? JSON.parse(currentActive as string) : [];
  const updatedActiveRoles = activeRoles.filter(roleId => roleId !== id);
  await redis.set(activeRolesKey, JSON.stringify(updatedActiveRoles));

  return deletedRole;
}

// Restore soft-deleted role
export async function restoreRole(id: string): Promise<Role> {
  const roleKey = getRoleKey(id);

  // Get role data
  const roleDataStr = await redis.get(roleKey);
  if (!roleDataStr) {
    throw new Error('Role data not found');
  }

  const roleData = JSON.parse(roleDataStr as string);

  if (!roleData.deletedAt) {
    throw new Error('Role is not deleted');
  }

  // Restore role
  const restoredRole: Role = {
    ...roleData,
    deletedAt: undefined,
    updatedAt: Date.now(),
  };

  const updatedRoleData = JSON.stringify(restoredRole);
  await redis.set(roleKey, updatedRoleData);

  // Add back to active roles list
  const activeRolesKey = getRoleListKey();
  const currentActive = await redis.get(activeRolesKey);
  const activeRoles: string[] = currentActive ? JSON.parse(currentActive as string) : [];
  if (!activeRoles.includes(id)) {
    activeRoles.push(id);
    await redis.set(activeRolesKey, JSON.stringify(activeRoles));
  }

  return restoredRole;
}

// Hard delete (permanent deletion)
export async function hardDeleteRole(id: string): Promise<void> {
  const roleKey = getRoleKey(id);

  // Check if role exists
  const roleExists = await redis.get(roleKey);
  if (!roleExists) {
    throw new Error('Role not found');
  }

  // Permanently delete
  await redis.del(roleKey);

  // Remove from active roles list if present
  const activeRolesKey = getRoleListKey();
  const currentActive = await redis.get(activeRolesKey);
  const activeRoles: string[] = currentActive ? JSON.parse(currentActive as string) : [];
  const updatedActiveRoles = activeRoles.filter(roleId => roleId !== id);
  await redis.set(activeRolesKey, JSON.stringify(updatedActiveRoles));
}