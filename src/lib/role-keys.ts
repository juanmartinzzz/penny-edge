// Key patterns for Role entity

// Helper functions for key generation
export function getRoleKey(id: string): string {
  return `role:${id}`;
}

export function getRoleListKey(): string {
  return 'roles';
}

export function getRoleDeletedKey(): string {
  return 'roles:deleted';
}

export function getRoleIndexKey(field: string): string {
  return `roles:index:${field}`;
}

// Key patterns object for reference
export const roleKeyPatterns = {
  role: 'role:{id}',              // Hash containing role data
  roles: 'roles',               // Set of active role IDs
  roles_deleted: 'roles:deleted', // Set of soft-deleted role IDs
  roles_index: 'roles:index:{field}', // Sorted set for field-based indexing
  roles_counter: 'roles:counter', // String counter for ID generation
};