# User Management Page Implementation Guide

This guide provides step-by-step instructions for creating a user management page following the entity management layout pattern from `guideline-2-entity-manage-page.md`. The page will allow administrators to view, filter, and manage user accounts with proper pagination and expandable details.

## Overview

The user management page provides a comprehensive interface for:
- **User Listing**: Display users in a compact, expandable format
- **Filtering**: Search by name/email and filter by status (active, inactive, pending)
- **Pagination**: Navigate through users with 50 per page default
- **User Actions**: Edit user details and soft-delete accounts
- **Expandable Details**: View comprehensive user information

## Prerequisites

- Next.js project with Tailwind CSS
- Interaction components from `src/components/interaction/` (Button, Input, PillList)
- Lucide icons installed
- User data structure and API endpoints
- Auth setup from previous instructions

## Step 1: Define User Types

Based on the entity management guide, create user-specific types:

```typescript
// Import base types from CRUD operations (instructions-3-crud-operations.md)
interface UserBase {
  id: string;
  email: string;
  createdAt: number; // Unix timestamp
  updatedAt: number;
  deletedAt?: number; // For soft-delete
}

// User entity for management page
interface User extends UserBase {
  name: string;
  role: 'admin' | 'user' | 'moderator';
  status: 'active' | 'inactive' | 'pending';
  emailVerified: boolean;
  lastLoginAt?: number;
  avatar?: string;
}

// User filters for management interface
interface UserFilters {
  search?: string; // Search by name or email
  status?: string[]; // Multiple status selection
  role?: string[]; // Multiple role selection
}

// Pagination state
interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// User row props
interface UserRowProps {
  user: User;
  onEdit: (user: User) => void;
  onSoftDelete: (user: User) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}
```

## Step 2: Create User Row Component

Create `src/components/ui/UserRow.tsx`:

```typescript
import { ChevronDown, ChevronRight, Edit, Trash2, Mail, Shield } from 'lucide-react';
import { Button } from '../interaction';
import { UserRowProps } from './types';

const UserRow: React.FC<UserRowProps> = ({
  user,
  onEdit,
  onSoftDelete,
  isExpanded,
  onToggleExpand,
}) => {
  const statusColors = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    pending: 'bg-yellow-100 text-yellow-800',
  };

  const roleColors = {
    admin: 'bg-red-100 text-red-800',
    moderator: 'bg-blue-100 text-blue-800',
    user: 'bg-gray-100 text-gray-800',
  };

  return (
    <div className="border-b border-[#e2e8f0]">
      {/* Compact Row */}
      <div className="flex items-center justify-between p-4 hover:bg-[#f9fafb] transition-colors">
        <div className="flex items-center space-x-4 flex-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleExpand}
            className="p-1 h-auto"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-[#373f51]" />
            ) : (
              <ChevronRight className="w-4 h-4 text-[#373f51]" />
            )}
          </Button>

          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-medium text-[#14171f]">{user.name}</h3>
              {!user.emailVerified && (
                <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">Unverified</span>
              )}
            </div>
            <div className="flex items-center space-x-2 mt-1">
              <Mail className="w-3 h-3 text-[#373f51]" />
              <p className="text-xs text-[#373f51]">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleColors[user.role]}`}>
              {user.role}
            </span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[user.status]}`}>
              {user.status}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(user)}
            className="p-2 h-auto"
          >
            <Edit className="w-4 h-4 text-[#373f51]" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSoftDelete(user)}
            className="p-2 h-auto hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-4 bg-[#f9fafb] border-t border-[#e2e8f0]">
          <div className="pt-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-[#14171f]">User ID:</span>
                <span className="ml-2 text-[#373f51] font-mono text-xs">{user.id}</span>
              </div>
              <div>
                <span className="font-medium text-[#14171f]">Email Verified:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                  user.emailVerified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {user.emailVerified ? 'Yes' : 'No'}
                </span>
              </div>
              <div>
                <span className="font-medium text-[#14171f]">Role:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${roleColors[user.role]}`}>
                  {user.role}
                </span>
              </div>
              <div>
                <span className="font-medium text-[#14171f]">Status:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${statusColors[user.status]}`}>
                  {user.status}
                </span>
              </div>
              <div>
                <span className="font-medium text-[#14171f]">Created:</span>
                <span className="ml-2 text-[#373f51]">
                  {new Date(user.createdAt).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="font-medium text-[#14171f]">Updated:</span>
                <span className="ml-2 text-[#373f51]">
                  {new Date(user.updatedAt).toLocaleString()}
                </span>
              </div>
              {user.lastLoginAt && (
                <div>
                  <span className="font-medium text-[#14171f]">Last Login:</span>
                  <span className="ml-2 text-[#373f51]">
                    {new Date(user.lastLoginAt).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {user.avatar && (
              <div className="pt-2">
                <span className="font-medium text-[#14171f]">Avatar:</span>
                <div className="mt-2">
                  <img
                    src={user.avatar}
                    alt={`${user.name} avatar`}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserRow;
```

## Step 3: Create User Filters Component

Create `src/components/ui/UserFilters.tsx`:

```typescript
import { Search, X } from 'lucide-react';
import { useState } from 'react';
import { Input, PillList } from '../interaction';
import { UserFilters as UserFiltersType } from './types';

interface UserFiltersProps {
  filters: UserFiltersType;
  onFiltersChange: (filters: UserFiltersType) => void;
}

const UserFilters: React.FC<UserFiltersProps> = ({
  filters,
  onFiltersChange,
}) => {
  const [searchValue, setSearchValue] = useState(filters.search || '');

  const statusOptions = ['active', 'inactive', 'pending'];
  const roleOptions = ['admin', 'moderator', 'user'];

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    onFiltersChange({
      ...filters,
      search: value || undefined,
    });
  };

  const handleStatusChange = (selected: string[]) => {
    onFiltersChange({
      ...filters,
      status: selected.length > 0 ? selected : undefined,
    });
  };

  const handleRoleChange = (selected: string[]) => {
    onFiltersChange({
      ...filters,
      role: selected.length > 0 ? selected : undefined,
    });
  };

  const clearFilters = () => {
    setSearchValue('');
    onFiltersChange({});
  };

  const hasActiveFilters = filters.search ||
    (filters.status && filters.status.length > 0) ||
    (filters.role && filters.role.length > 0);

  return (
    <div className="p-4 bg-white border-b border-[#e2e8f0] space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#373f51]" />
        <Input
          type="text"
          placeholder="Search users by name or email..."
          value={searchValue}
          onChange={handleSearchChange}
          className="pl-10"
        />
      </div>

      {/* Status Pills */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-[#14171f]">
          Filter by Status
        </label>
        <PillList
          options={statusOptions}
          selected={filters.status || []}
          onChange={handleStatusChange}
          variant="multiple"
        />
      </div>

      {/* Role Pills */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-[#14171f]">
          Filter by Role
        </label>
        <PillList
          options={roleOptions}
          selected={filters.role || []}
          onChange={handleRoleChange}
          variant="multiple"
        />
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <div className="flex justify-end">
          <button
            onClick={clearFilters}
            className="flex items-center space-x-1 text-sm text-[#373f51] hover:text-[#14171f] transition-colors"
          >
            <X className="w-4 h-4" />
            <span>Clear filters</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default UserFilters;
```

## Step 4: Create Main User Management Page

Create `pages/admin/users.tsx` (or `app/admin/users/page.tsx` for App Router):

```typescript
import { useState, useEffect } from 'react';
import { Plus, Users } from 'lucide-react';
import { Button } from '../../../src/components/interaction';
import UserRow from '../../../src/components/ui/UserRow';
import EntityPagination from '../../../src/components/ui/EntityPagination';
import UserFilters from '../../../src/components/ui/UserFilters';
import { User, UserFilters as UserFiltersType, PaginationState } from '../../../src/components/ui/types';

// Mock data - replace with actual API calls
const mockUsers: User[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'admin',
    status: 'active',
    emailVerified: true,
    createdAt: Date.now() - 86400000 * 30,
    updatedAt: Date.now() - 3600000,
    lastLoginAt: Date.now() - 3600000,
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    role: 'user',
    status: 'pending',
    emailVerified: false,
    createdAt: Date.now() - 86400000 * 7,
    updatedAt: Date.now() - 86400000 * 7,
  },
  // Add more mock users...
];

const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<UserFiltersType>({});
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Fetch users based on filters and pagination
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        // Replace with actual API call
        const response = await fetch(
          `/api/admin/users?page=${pagination.page}&limit=${pagination.limit}&filters=${JSON.stringify(filters)}`
        );
        const data = await response.json();

        setUsers(data.users);
        setPagination(prev => ({
          ...prev,
          total: data.total,
          totalPages: Math.ceil(data.total / prev.limit),
        }));
      } catch (error) {
        console.error('Failed to fetch users:', error);
        // Fallback to mock data for development
        setUsers(mockUsers);
        setPagination(prev => ({
          ...prev,
          total: mockUsers.length,
          totalPages: Math.ceil(mockUsers.length / prev.limit),
        }));
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [filters, pagination.page, pagination.limit]);

  const handleEdit = (user: User) => {
    // Implement edit logic - open drawer, navigate to edit page, etc.
    console.log('Edit user:', user);
  };

  const handleSoftDelete = async (user: User) => {
    if (confirm(`Are you sure you want to soft-delete user "${user.name}"?`)) {
      try {
        // Replace with actual API call
        await fetch(`/api/admin/users/${user.id}`, {
          method: 'DELETE',
        });

        // Refresh the list
        setUsers(prev => prev.filter(u => u.id !== user.id));
        setPagination(prev => ({ ...prev, total: prev.total - 1 }));
      } catch (error) {
        console.error('Failed to delete user:', error);
      }
    }
  };

  const handleToggleExpand = (userId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const handleFiltersChange = (newFilters: UserFiltersType) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  return (
    <div className="min-h-screen bg-[#f9fafb]">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white border-b border-[#e2e8f0]">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Users className="w-6 h-6 text-[#373f51]" />
              <div>
                <h1 className="text-2xl font-bold text-[#14171f]">User Management</h1>
                <p className="text-sm text-[#373f51] mt-1">
                  Manage user accounts, roles, and permissions
                </p>
              </div>
            </div>
            <Button variant="primary" className="flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>Add User</span>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <UserFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
        />

        {/* User List */}
        <div className="bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-[#373f51]">Loading users...</div>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Users className="w-12 h-12 text-[#373f51] mb-4" />
              <div className="text-[#373f51] mb-4">No users found</div>
              <Button variant="secondary" size="sm">
                Invite your first user
              </Button>
            </div>
          ) : (
            <div>
              {users.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  onEdit={handleEdit}
                  onSoftDelete={handleSoftDelete}
                  isExpanded={expandedRows.has(user.id)}
                  onToggleExpand={() => handleToggleExpand(user.id)}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          <EntityPagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      </div>
    </div>
  );
};

export default UserManagementPage;
```

## Step 5: Create API Routes

Create API endpoints for user management:

```typescript
// pages/api/admin/users/index.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getUsers } from '../../../../lib/user-service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { page = 1, limit = 50, filters } = req.query;
      const parsedFilters = filters ? JSON.parse(filters as string) : {};

      const result = await getUsers({
        page: Number(page),
        limit: Number(limit),
        filters: parsedFilters,
      });

      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

// pages/api/admin/users/[id].ts
import { NextApiRequest, NextApiResponse } from 'next';
import { softDeleteUser } from '../../../../lib/user-service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'DELETE') {
    try {
      await softDeleteUser(id as string);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete user' });
    }
  } else {
    res.setHeader('Allow', ['DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
```

## Step 6: Add Navigation

Add the user management page to your navigation. Update your navigation component or routing to include:

```typescript
// Example navigation item
{
  label: 'User Management',
  href: '/admin/users',
  icon: Users,
  adminOnly: true,
}
```

## Step 7: Implement User Service

Create `lib/user-service.ts` with user management functions:

```typescript
import { User, UserFilters, PaginationOptions } from '../../../src/components/ui/types';

export async function getUsers(options: PaginationOptions & { filters?: UserFilters }): Promise<{
  users: User[];
  total: number;
}> {
  // Implement user fetching logic with filters and pagination
  // This would connect to your database/auth provider
  return {
    users: [],
    total: 0,
  };
}

export async function softDeleteUser(userId: string): Promise<void> {
  // Implement soft delete logic
  // Mark user as deleted without actually removing from database
}

export async function updateUser(userId: string, updates: Partial<User>): Promise<User> {
  // Implement user update logic
  throw new Error('Not implemented');
}
```

## Features Summary

- **User Listing**: Compact rows with expandable details showing email verification status, roles, and activity
- **Advanced Filtering**: Search by name/email, filter by status (active/inactive/pending) and role (admin/moderator/user)
- **Pagination**: 50 users per page with smart navigation controls
- **User Actions**: Edit and soft-delete functionality
- **Responsive Design**: Mobile-friendly layout
- **Loading States**: Proper indicators and empty states
- **Security**: Admin-only access with role-based permissions

The user management page follows the established design patterns and provides a comprehensive interface for managing user accounts in your application.