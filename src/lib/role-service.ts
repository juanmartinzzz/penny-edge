import { Role } from '@/types/role';
import { CreateRoleInput, UpdateRoleInput, createRoleSchema, updateRoleSchema } from './role-validation';
import {
  createRole as createRoleRepo,
  getRoleById as getRoleByIdRepo,
  getRoles as getRolesRepo,
  getRolesByFilter as getRolesByFilterRepo,
  updateRole as updateRoleRepo,
  softDeleteRole as softDeleteRoleRepo,
  restoreRole as restoreRoleRepo,
  hardDeleteRole as hardDeleteRoleRepo,
} from './role-repository';

interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface PaginatedRolesResult {
  data: Role[];
  total: number;
  page: number;
  totalPages: number;
}

export class RoleService {
  async createRole(input: CreateRoleInput): Promise<Role> {
    // Validate input
    const validatedData = createRoleSchema.parse(input);

    // Business logic: Check if role name already exists
    const existingRoles = await getRolesByFilterRepo({ name: validatedData.name });
    if (existingRoles.length > 0) {
      throw new Error('Role name already exists');
    }

    // Business logic: If this is the default role, ensure no other default exists
    if (validatedData.isDefault) {
      const defaultRoles = await getRolesByFilterRepo({ isDefault: true });
      if (defaultRoles.length > 0) {
        throw new Error('A default role already exists');
      }
    }

    return createRoleRepo(validatedData);
  }

  async getRoleById(id: string): Promise<Role | null> {
    return getRoleByIdRepo(id);
  }

  async getRoles(options: PaginationOptions): Promise<PaginatedRolesResult> {
    return getRolesRepo(options);
  }

  async getRolesByFilter(filter: { name?: string; isDefault?: boolean }): Promise<Role[]> {
    return getRolesByFilterRepo(filter);
  }

  async updateRole(id: string, input: UpdateRoleInput): Promise<Role> {
    // Validate input
    const validatedData = updateRoleSchema.parse(input);

    // Business logic: Check if role exists
    const existingRole = await getRoleByIdRepo(id);
    if (!existingRole) {
      throw new Error('Role not found');
    }

    // Business logic: If updating name, check for uniqueness
    if (validatedData.name && validatedData.name !== existingRole.name) {
      const rolesWithSameName = await getRolesByFilterRepo({ name: validatedData.name });
      if (rolesWithSameName.length > 0) {
        throw new Error('Role name already exists');
      }
    }

    // Business logic: If setting as default, ensure no other default exists
    if (validatedData.isDefault && validatedData.isDefault !== existingRole.isDefault) {
      const defaultRoles = await getRolesByFilterRepo({ isDefault: true });
      // Filter out the current role if it's already default
      const otherDefaultRoles = defaultRoles.filter(role => role.id !== id);
      if (otherDefaultRoles.length > 0) {
        throw new Error('A default role already exists');
      }
    }

    // Business logic: Prevent updating default role to non-default if it's the only role
    if (validatedData.isDefault === false && existingRole.isDefault) {
      const allRoles = await getRolesRepo({ page: 1, limit: 1000 });
      if (allRoles.total === 1) {
        throw new Error('Cannot remove default status from the only role');
      }
    }

    return updateRoleRepo(id, validatedData);
  }

  async softDeleteRole(id: string): Promise<Role> {
    // Business logic: Check if role exists
    const role = await getRoleByIdRepo(id);
    if (!role) {
      throw new Error('Role not found');
    }

    // Business logic: Prevent deleting default role if it's the only role
    if (role.isDefault) {
      const allRoles = await getRolesRepo({ page: 1, limit: 1000 });
      if (allRoles.total === 1) {
        throw new Error('Cannot delete the only role');
      }
    }

    return softDeleteRoleRepo(id);
  }

  async restoreRole(id: string): Promise<Role> {
    return restoreRoleRepo(id);
  }

  async hardDeleteRole(id: string): Promise<void> {
    // Business logic: Check if role exists
    const role = await getRoleByIdRepo(id);
    if (!role && !await this.isRoleDeleted(id)) {
      throw new Error('Role not found');
    }

    // Business logic: Prevent hard deleting default role if it would leave no default
    if (role?.isDefault) {
      const allRoles = await getRolesRepo({ page: 1, limit: 1000 });
      const activeRoles = allRoles.data.filter(r => r.id !== id);
      const hasOtherDefault = activeRoles.some(r => r.isDefault);
      if (!hasOtherDefault) {
        throw new Error('Cannot delete the default role without another default role');
      }
    }

    return hardDeleteRoleRepo(id);
  }

  private async isRoleDeleted(id: string): Promise<boolean> {
    // This would need to be implemented in the repository if needed
    // For now, we'll assume the role service checks via getRoleById
    const role = await getRoleByIdRepo(id);
    return role === null;
  }
}

// Export singleton instance
export const roleService = new RoleService();