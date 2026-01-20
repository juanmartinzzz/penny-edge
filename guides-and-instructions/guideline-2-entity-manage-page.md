# Entity Management Page Layout Guide

This guide provides step-by-step instructions for creating a compact entity management page using components from the `/interaction` directory. The layout includes filtering capabilities, pagination, expandable rows for detailed information, and action buttons for editing and soft-deleting entities.

## Overview

The entity management page provides a clean, efficient interface for:
- **Filtering**: Using pill-based selections and manual text input
- **Pagination**: Default 50 entities per page with navigation controls
- **Expandable Rows**: Compact list view with expandable details
- **Actions**: Edit (via slide-out drawer) and soft-delete operations for each entity

## Prerequisites

- Next.js project setup with Tailwind CSS
- Interaction components from `components/interaction/` (Button, Input, PillList)
- Drawer component from `components/ui/` (Drawer)
- Lucide icons installed
- Entity data structure and API endpoints

## Step 1: Define Entity Types

The entity management page builds upon the types defined in `instructions-3-crud-operations.md`. Use the existing `EntityName`, `EntityFilters`, and `PaginationOptions` interfaces, and extend them for the management interface.

First, ensure you have imported or defined the base types from the CRUD operations guide:

```typescript
// Import or reference the EntityName interface from your CRUD operations
// (defined in instructions-3-crud-operations.md)
interface EntityName {
  id: string;
  // Add other required fields based on your entity
  createdAt: number; // Unix timestamp for Redis efficiency
  updatedAt: number;
  deletedAt?: number; // For soft-delete support
}

// Import or reference the EntityFilters interface from CRUD operations
interface EntityFilters {
  // Define filterable fields
  name?: string;
  status?: string;
  // Add other filterable fields
}

// Extend for the management page interface
interface Entity extends EntityName {
  name: string;
  status: 'active' | 'inactive' | 'pending';
  // Include all fields from EntityName plus management-specific fields
}

// Create management-specific filter type that supports multiple selections
interface ManagementFilters extends Omit<EntityFilters, 'status'> {
  status?: string[]; // Override to support multiple status selection
  search?: string;   // Add search capability
}

// Use the PaginationOptions from CRUD operations but create a state version
interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Management page specific types
interface EntityRowProps {
  entity: Entity;
  onEdit: (entity: Entity) => void;
  onSoftDelete: (entity: Entity) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}
```

**Note**: If your `EntityName` interface has different field names (e.g., `title` instead of `name`), you may need to create adapter functions to map between your existing types and the interface expected by the management components.

## Step 2: Create Entity Row Component

Create `components/ui/EntityRow.tsx` for individual entity display:

```typescript
import { ChevronDown, ChevronRight, Edit, Trash2 } from 'lucide-react';
import { Button } from '../interaction';
import { EntityRowProps } from './types';

const EntityRow: React.FC<EntityRowProps> = ({
  entity,
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
            <h3 className="text-sm font-medium text-[#14171f]">{entity.name}</h3>
            <p className="text-xs text-[#373f51]">
              Created {new Date(entity.createdAt).toLocaleDateString()}
            </p>
          </div>

          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[entity.status]}`}>
            {entity.status}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(entity)}
            className="p-2 h-auto"
          >
            <Edit className="w-4 h-4 text-[#373f51]" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSoftDelete(entity)}
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
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-[#14171f]">ID:</span>
                <span className="ml-2 text-[#373f51] font-mono">{entity.id}</span>
              </div>
              <div>
                <span className="font-medium text-[#14171f]">Status:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${statusColors[entity.status]}`}>
                  {entity.status}
                </span>
              </div>
              <div>
                <span className="font-medium text-[#14171f]">Created:</span>
                <span className="ml-2 text-[#373f51]">
                  {new Date(entity.createdAt).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="font-medium text-[#14171f]">Updated:</span>
                <span className="ml-2 text-[#373f51]">
                  {new Date(entity.updatedAt).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Add more entity-specific details here */}
            <div className="pt-2">
              <span className="font-medium text-[#14171f]">Additional Details:</span>
              <p className="mt-1 text-sm text-[#373f51]">
                {/* Render additional entity fields here */}
                Add entity-specific information display
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EntityRow;
```

## Step 3: Create Pagination Component

Create `components/ui/EntityPagination.tsx`:

```typescript
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../interaction';

interface EntityPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const EntityPagination: React.FC<EntityPaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-[#e2e8f0]">
      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex items-center space-x-1"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous</span>
        </Button>
      </div>

      <div className="flex items-center space-x-1">
        {getVisiblePages().map((page, index) => (
          <Button
            key={index}
            variant={page === currentPage ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => typeof page === 'number' && onPageChange(page)}
            disabled={page === '...'}
            className="min-w-[40px] h-9"
          >
            {page}
          </Button>
        ))}
      </div>

      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex items-center space-x-1"
        >
          <span>Next</span>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default EntityPagination;
```

## Step 4: Create Filtering Component

Create `components/ui/EntityFilters.tsx`:

```typescript
import { Search, X } from 'lucide-react';
import { useState } from 'react';
import { Input, PillList } from '../interaction';
import { EntityFilters as EntityFiltersType } from './types';

interface EntityFiltersProps {
  filters: EntityFiltersType;
  onFiltersChange: (filters: EntityFiltersType) => void;
}

const EntityFilters: React.FC<EntityFiltersProps> = ({
  filters,
  onFiltersChange,
}) => {
  const [searchValue, setSearchValue] = useState(filters.search || '');

  const statusOptions = ['active', 'inactive', 'pending'];

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

  const clearFilters = () => {
    setSearchValue('');
    onFiltersChange({});
  };

  const hasActiveFilters = filters.search || (filters.status && filters.status.length > 0);

  return (
    <div className="p-4 bg-white border-b border-[#e2e8f0] space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#373f51]" />
        <Input
          type="text"
          placeholder="Search entities..."
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

export default EntityFilters;
```

## Step 5: Create Main Entity Management Page

Create `pages/entities.tsx` (or `app/entities/page.tsx` for App Router):

```typescript
import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Button, Input, PillList } from '../components/interaction';
import { Drawer } from '../components/ui';
import EntityRow from '../components/ui/EntityRow';
import EntityPagination from '../components/ui/EntityPagination';
import EntityFilters from '../components/ui/EntityFilters';
import { Entity, EntityFilters as EntityFiltersType, PaginationState } from '../components/ui/types';

// Mock data - replace with actual API calls
const mockEntities: Entity[] = [
  {
    id: '1',
    name: 'Sample Entity 1',
    status: 'active',
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 3600000,
  },
  // Add more mock entities...
];

const EntitiesPage: React.FC = () => {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<EntityFiltersType>({});
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Drawer state for editing
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    status: 'active' as 'active' | 'inactive' | 'pending',
  });

  // Fetch entities based on filters and pagination
  useEffect(() => {
    const fetchEntities = async () => {
      setLoading(true);
      try {
        // Replace with actual API call
        const response = await fetch(
          `/api/entities?page=${pagination.page}&limit=${pagination.limit}&filters=${JSON.stringify(filters)}`
        );
        const data = await response.json();

        setEntities(data.entities);
        setPagination(prev => ({
          ...prev,
          total: data.total,
          totalPages: Math.ceil(data.total / prev.limit),
        }));
      } catch (error) {
        console.error('Failed to fetch entities:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEntities();
  }, [filters, pagination.page, pagination.limit]);

  const handleEdit = (entity: Entity) => {
    setEditingEntity(entity);
    setEditFormData({
      name: entity.name,
      status: entity.status,
    });
    setIsDrawerOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingEntity) return;

    try {
      // Replace with actual API call
      const updatedEntity = {
        ...editingEntity,
        ...editFormData,
        updatedAt: Date.now(),
      };

      // Update the entity in the local state
      setEntities(prev =>
        prev.map(entity =>
          entity.id === editingEntity.id ? updatedEntity : entity
        )
      );

      setIsDrawerOpen(false);
      setEditingEntity(null);
    } catch (error) {
      console.error('Failed to update entity:', error);
    }
  };

  const handleCancelEdit = () => {
    setIsDrawerOpen(false);
    setEditingEntity(null);
    setEditFormData({ name: '', status: 'active' });
  };

  const handleSoftDelete = async (entity: Entity) => {
    if (confirm(`Are you sure you want to soft-delete "${entity.name}"?`)) {
      try {
        // Replace with actual API call
        await fetch(`/api/entities/${entity.id}`, {
          method: 'DELETE',
        });

        // Refresh the list
        setEntities(prev => prev.filter(e => e.id !== entity.id));
      } catch (error) {
        console.error('Failed to delete entity:', error);
      }
    }
  };

  const handleToggleExpand = (entityId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(entityId)) {
        newSet.delete(entityId);
      } else {
        newSet.add(entityId);
      }
      return newSet;
    });
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const handleFiltersChange = (newFilters: EntityFiltersType) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  return (
    <div className="min-h-screen bg-[#f9fafb]">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white border-b border-[#e2e8f0]">
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#14171f]">Entity Management</h1>
              <p className="text-sm text-[#373f51] mt-1">
                Manage your entities with filtering, pagination, and bulk actions
              </p>
            </div>
            <Button variant="primary" className="flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>Add Entity</span>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <EntityFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
        />

        {/* Entity List */}
        <div className="bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-[#373f51]">Loading entities...</div>
            </div>
          ) : entities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-[#373f51] mb-4">No entities found</div>
              <Button variant="secondary" size="sm">
                Create your first entity
              </Button>
            </div>
          ) : (
            <div>
              {entities.map((entity) => (
                <EntityRow
                  key={entity.id}
                  entity={entity}
                  onEdit={handleEdit}
                  onSoftDelete={handleSoftDelete}
                  isExpanded={expandedRows.has(entity.id)}
                  onToggleExpand={() => handleToggleExpand(entity.id)}
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

      {/* Edit Entity Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={handleCancelEdit}
        position="right"
        shouldOpenWithBackdrop={true}
        widthClass="w-96"
      >
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-[#14171f]">Edit Entity</h2>
            <p className="text-sm text-[#373f51] mt-1">
              Update the entity details below
            </p>
          </div>

          <div className="space-y-4">
            <Input
              label="Entity Name"
              value={editFormData.name}
              onChange={(value) => setEditFormData(prev => ({ ...prev, name: value }))}
              required
            />

            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#14171f]">
                Status
              </label>
              <PillList
                options={['active', 'inactive', 'pending']}
                selected={[editFormData.status]}
                onChange={(selected) => {
                  if (selected.length > 0) {
                    setEditFormData(prev => ({
                      ...prev,
                      status: selected[0] as 'active' | 'inactive' | 'pending'
                    }));
                  }
                }}
                variant="single"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-[#e2e8f0]">
            <Button
              variant="secondary"
              onClick={handleCancelEdit}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveEdit}
              disabled={!editFormData.name.trim()}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
};

export default EntitiesPage;
```

## Step 6: Create API Routes

Create API endpoints for entity operations:

```typescript
// pages/api/entities/index.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getEntities } from '../../../lib/entity-service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { page = 1, limit = 50, filters } = req.query;
      const parsedFilters = filters ? JSON.parse(filters as string) : {};

      const result = await getEntities({
        page: Number(page),
        limit: Number(limit),
        filters: parsedFilters,
      });

      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch entities' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

// pages/api/entities/[id].ts
import { NextApiRequest, NextApiResponse } from 'next';
import { softDeleteEntity } from '../../../lib/entity-service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'DELETE') {
    try {
      await softDeleteEntity(id as string);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete entity' });
    }
  } else {
    res.setHeader('Allow', ['DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
```

## Step 7: Add Responsive Design

Update the components to be mobile-responsive:

```typescript
// In EntityRow.tsx, add responsive classes
<div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-[#f9fafb] transition-colors">
  <div className="flex items-center space-x-4 flex-1 mb-2 sm:mb-0">
    {/* ... existing content ... */}
  </div>
  <div className="flex items-center space-x-2 ml-auto sm:ml-0">
    {/* ... existing content ... */}
  </div>
</div>

// In EntityFilters.tsx, stack filters on mobile
<div className="p-4 bg-white border-b border-[#e2e8f0] space-y-4">
  <div className="space-y-4 md:flex md:space-y-0 md:space-x-4">
    {/* Search and filters side by side on larger screens */}
  </div>
</div>
```

## Layout Features Summary

- **Compact Design**: Minimal spacing and efficient use of vertical space
- **Expandable Rows**: Click to reveal additional entity details
- **Dual Filtering**: Pill-based status filters plus text search
- **Pagination**: 50 entities per page with smart page navigation
- **Action Buttons**: Edit and soft-delete actions per row
- **Edit Drawer**: Slide-out drawer for editing entities with form validation
- **Responsive**: Mobile-first design with adaptive layouts
- **Loading States**: Proper loading indicators and empty states
- **Accessibility**: Proper focus management and keyboard navigation

This layout provides an efficient interface for managing large numbers of entities while maintaining usability and following the established design system.