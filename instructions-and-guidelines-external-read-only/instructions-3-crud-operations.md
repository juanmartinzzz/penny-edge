# Redis CRUD Operations Implementation Guide

This guide provides step-by-step instructions for implementing Create, Read, Update, and Soft-Delete (CRUD) operations for a new entity using Redis as the data store.

## Overview

CRUD operations in Redis differ from traditional relational databases. This guide covers:
- **Create**: Storing new records using Redis data structures
- **Read**: Retrieving records with Redis GET/HGET operations
- **Update**: Modifying existing records with Redis SET/HSET
- **Soft-Delete**: Marking records as deleted without permanent removal

## Prerequisites

Before implementing CRUD operations, ensure you have:
1. Redis client configured (ioredis, redis, etc.)
2. Entity interface/model defined
3. Key naming convention established
4. Basic project structure set up

## Step 1: Define the Entity Interface

Create a TypeScript interface that describes the entity's structure:

```typescript
interface EntityName {
  id: string;
  // Add other required fields based on user description
  createdAt: number; // Unix timestamp for Redis efficiency
  updatedAt: number;
  deletedAt?: number; // For soft-delete support
}
```

## Step 2: Establish Redis Key Patterns

Define consistent key patterns for your entity:

```typescript
// Key patterns for the entity
const ENTITY_KEY = 'entity:{id}';           // Hash for entity data
const ENTITY_LIST_KEY = 'entities';         // Set for all active entity IDs
const ENTITY_DELETED_KEY = 'entities:deleted'; // Set for soft-deleted entity IDs
const ENTITY_INDEX_KEY = 'entities:index:{field}'; // Sorted sets for indexing

// Helper functions for key generation
function getEntityKey(id: string): string {
  return `entity:${id}`;
}

function getEntityListKey(): string {
  return 'entities';
}

function getEntityIndexKey(field: string): string {
  return `entities:index:${field}`;
}
```

## Step 3: Implement Create Operation

### Step 3.1: Define Input Validation

Create a schema for validating create input:

```typescript
import { z } from 'zod';

const createEntitySchema = z.object({
  // Define validation schema based on entity fields
  // Example: name: z.string().min(1).max(100),
});

type CreateEntityInput = z.infer<typeof createEntitySchema>;
```

### Step 3.2: Implement Create Method

```typescript
import { redis } from './redis-client'; // Your Redis client instance

async function createEntity(input: CreateEntityInput): Promise<EntityName> {
  // Validate input
  const validatedData = createEntitySchema.parse(input);

  // Generate unique ID (you can use UUID, nanoid, or Redis INCR)
  const id = generateId(); // Implement this based on your ID strategy

  // Create entity object
  const entity: EntityName = {
    id,
    ...validatedData,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  // Store in Redis using Hash
  const entityKey = getEntityKey(id);
  const entityData = {
    ...validatedData,
    createdAt: entity.createdAt.toString(),
    updatedAt: entity.updatedAt.toString(),
  };

  // Use Redis transaction (MULTI/EXEC) for atomicity
  const pipeline = redis.multi();

  // Store entity data
  pipeline.hmset(entityKey, entityData);

  // Add to active entities set
  pipeline.sadd(getEntityListKey(), id);

  // Add to any indexes you want to maintain
  // pipeline.zadd(getEntityIndexKey('createdAt'), entity.createdAt, id);

  await pipeline.exec();

  return entity;
}
```

## Step 4: Implement Read Operations

### Step 4.1: Find by ID

```typescript
async function getEntityById(id: string): Promise<EntityName | null> {
  const entityKey = getEntityKey(id);

  // Check if entity exists and is not soft-deleted
  const isDeleted = await redis.sismember(getEntityDeletedKey(), id);
  if (isDeleted) {
    return null;
  }

  // Get entity data from hash
  const entityData = await redis.hgetall(entityKey);

  if (!entityData || Object.keys(entityData).length === 0) {
    return null;
  }

  // Convert string values back to appropriate types
  return {
    id,
    ...entityData,
    createdAt: parseInt(entityData.createdAt),
    updatedAt: parseInt(entityData.updatedAt),
    deletedAt: entityData.deletedAt ? parseInt(entityData.deletedAt) : undefined,
  } as EntityName;
}
```

### Step 4.2: Find All with Pagination

```typescript
interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string; // Should match your index fields
  sortOrder?: 'asc' | 'desc';
}

async function getEntities(options: PaginationOptions): Promise<{
  data: EntityName[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const { page, limit, sortBy = 'createdAt', sortOrder = 'desc' } = options;
  const offset = (page - 1) * limit;

  // Get active entity IDs (excluding soft-deleted)
  const activeEntityIds = await redis.sdiff(getEntityListKey(), getEntityDeletedKey());

  let sortedIds: string[];

  if (sortBy === 'createdAt') {
    // If you maintain a sorted set index for createdAt
    const indexKey = getEntityIndexKey('createdAt');
    const start = sortOrder === 'desc' ? '+inf' : '-inf';
    const end = sortOrder === 'desc' ? '-inf' : '+inf';

    sortedIds = await redis.zrangebyscore(
      indexKey,
      start,
      end,
      'LIMIT',
      offset,
      limit
    );
  } else {
    // Simple pagination without sorting (less efficient)
    sortedIds = activeEntityIds.slice(offset, offset + limit);
  }

  // Fetch entity data for each ID
  const entities = await Promise.all(
    sortedIds.map(id => getEntityById(id))
  );

  // Filter out nulls (shouldn't happen but safety check)
  const validEntities = entities.filter((entity): entity is EntityName => entity !== null);

  return {
    data: validEntities,
    total: activeEntityIds.length,
    page,
    totalPages: Math.ceil(activeEntityIds.length / limit),
  };
}
```

### Step 4.3: Find with Filters

```typescript
interface EntityFilters {
  // Define filterable fields
  name?: string;
  status?: string;
  // Add other filterable fields
}

async function getEntitiesWithFilters(filters: EntityFilters): Promise<EntityName[]> {
  // For simple filters, you might need to scan through entities
  // For better performance, maintain secondary indexes

  const activeEntityIds = await redis.sdiff(getEntityListKey(), getEntityDeletedKey());

  const entities: EntityName[] = [];

  for (const id of activeEntityIds) {
    const entity = await getEntityById(id);
    if (!entity) continue;

    // Apply filters (this is inefficient for large datasets)
    let matches = true;
    for (const [key, value] of Object.entries(filters)) {
      if (entity[key as keyof EntityName] !== value) {
        matches = false;
        break;
      }
    }

    if (matches) {
      entities.push(entity);
    }
  }

  return entities;
}
```

### Step 4.4: Advanced Filtering with Redis Indexes

```typescript
// For better performance with filters, maintain secondary indexes
async function createEntityWithIndexes(input: CreateEntityInput): Promise<EntityName> {
  const entity = await createEntity(input);

  // Add to secondary indexes if needed
  const pipeline = redis.multi();

  if (entity.name) {
    pipeline.zadd(getEntityIndexKey('name'), 0, `${entity.name}:${entity.id}`);
  }

  if (entity.status) {
    pipeline.sadd(getEntityIndexKey(`status:${entity.status}`), entity.id);
  }

  await pipeline.exec();

  return entity;
}

async function getEntitiesByStatus(status: string): Promise<EntityName[]> {
  const entityIds = await redis.smembers(getEntityIndexKey(`status:${status}`));
  const entities = await Promise.all(entityIds.map(id => getEntityById(id)));
  return entities.filter((entity): entity is EntityName => entity !== null);
}
```

## Step 5: Implement Update Operation

### Step 5.1: Define Update Validation

```typescript
const updateEntitySchema = z.object({
  // Define partial validation schema for updates
}).partial();

type UpdateEntityInput = z.infer<typeof updateEntitySchema>;
```

### Step 5.2: Implement Update Method

```typescript
async function updateEntity(id: string, input: UpdateEntityInput): Promise<EntityName> {
  // Validate input
  const validatedData = updateEntitySchema.parse(input);

  // Check if entity exists and is not deleted
  const existingEntity = await getEntityById(id);
  if (!existingEntity) {
    throw new Error('Entity not found');
  }

  // Prepare updated entity
  const updatedEntity: EntityName = {
    ...existingEntity,
    ...validatedData,
    updatedAt: Date.now(),
  };

  // Update in Redis using transaction for atomicity
  const pipeline = redis.multi();
  const entityKey = getEntityKey(id);

  // Update the hash fields
  const updateData: Record<string, string> = {
    updatedAt: updatedEntity.updatedAt.toString(),
  };

  // Only update fields that were provided
  Object.entries(validatedData).forEach(([key, value]) => {
    updateData[key] = String(value);
  });

  pipeline.hmset(entityKey, updateData);

  // Update any secondary indexes that may have changed
  // This depends on what fields you're indexing
  if (validatedData.name && validatedData.name !== existingEntity.name) {
    // Remove old index entry and add new one
    pipeline.zrem(getEntityIndexKey('name'), `${existingEntity.name}:${id}`);
    pipeline.zadd(getEntityIndexKey('name'), 0, `${validatedData.name}:${id}`);
  }

  if (validatedData.status && validatedData.status !== existingEntity.status) {
    // Remove from old status set and add to new one
    if (existingEntity.status) {
      pipeline.srem(getEntityIndexKey(`status:${existingEntity.status}`), id);
    }
    pipeline.sadd(getEntityIndexKey(`status:${validatedData.status}`), id);
  }

  await pipeline.exec();

  return updatedEntity;
}
```

## Step 6: Implement Soft-Delete Operation

### Step 6.1: Soft Delete Method

```typescript
function getEntityDeletedKey(): string {
  return 'entities:deleted';
}

async function softDeleteEntity(id: string): Promise<EntityName> {
  // Check if entity exists and is not already deleted
  const existingEntity = await getEntityById(id);
  if (!existingEntity) {
    throw new Error('Entity not found');
  }

  if (existingEntity.deletedAt) {
    throw new Error('Entity is already deleted');
  }

  // Mark as soft-deleted using Redis transaction
  const pipeline = redis.multi();
  const entityKey = getEntityKey(id);

  // Update the hash with deletion timestamp
  pipeline.hset(entityKey, 'deletedAt', Date.now().toString());
  pipeline.hset(entityKey, 'updatedAt', Date.now().toString());

  // Move from active set to deleted set
  pipeline.srem(getEntityListKey(), id);
  pipeline.sadd(getEntityDeletedKey(), id);

  // Remove from any secondary indexes
  // pipeline.zrem(getEntityIndexKey('name'), `${existingEntity.name}:${id}`);
  // pipeline.srem(getEntityIndexKey(`status:${existingEntity.status}`), id);

  await pipeline.exec();

  return {
    ...existingEntity,
    deletedAt: Date.now(),
    updatedAt: Date.now(),
  };
}
```

### Step 6.2: Restore Soft-Deleted Entity (Optional)

```typescript
async function restoreEntity(id: string): Promise<EntityName> {
  const entityKey = getEntityKey(id);

  // Check if entity exists in deleted set
  const isDeleted = await redis.sismember(getEntityDeletedKey(), id);
  if (!isDeleted) {
    throw new Error('Entity is not deleted');
  }

  // Get entity data
  const entityData = await redis.hgetall(entityKey);
  if (!entityData || Object.keys(entityData).length === 0) {
    throw new Error('Entity data not found');
  }

  // Restore using Redis transaction
  const pipeline = redis.multi();

  // Remove deletedAt timestamp
  pipeline.hdel(entityKey, 'deletedAt');
  pipeline.hset(entityKey, 'updatedAt', Date.now().toString());

  // Move back to active set
  pipeline.sadd(getEntityListKey(), id);
  pipeline.srem(getEntityDeletedKey(), id);

  // Re-add to secondary indexes if needed
  // const entity = reconstructEntity(id, entityData);
  // pipeline.zadd(getEntityIndexKey('name'), 0, `${entity.name}:${id}`);

  await pipeline.exec();

  return {
    id,
    ...entityData,
    createdAt: parseInt(entityData.createdAt),
    updatedAt: Date.now(),
    deletedAt: undefined,
  } as EntityName;
}
```

### Step 6.3: Permanently Delete (Optional - Use with Caution)

```typescript
async function hardDeleteEntity(id: string): Promise<void> {
  // Check if entity exists (either active or deleted)
  const activeExists = await redis.sismember(getEntityListKey(), id);
  const deletedExists = await redis.sismember(getEntityDeletedKey(), id);

  if (!activeExists && !deletedExists) {
    throw new Error('Entity not found');
  }

  // Permanently delete using Redis transaction
  const pipeline = redis.multi();
  const entityKey = getEntityKey(id);

  // Remove the hash
  pipeline.del(entityKey);

  // Remove from any sets
  pipeline.srem(getEntityListKey(), id);
  pipeline.srem(getEntityDeletedKey(), id);

  // Remove from all secondary indexes
  // This would require knowing all index keys or maintaining a list of them

  await pipeline.exec();
}
```

## Step 7: Add API Routes/Controllers

Create RESTful API endpoints for the CRUD operations:

```typescript
// POST /api/entities - Create
app.post('/api/entities', async (req, res) => {
  try {
    const entity = await createEntity(req.body);
    res.status(201).json(entity);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/entities - Read all with pagination
app.get('/api/entities', async (req, res) => {
  try {
    const { page = 1, limit = 10, sortBy, sortOrder } = req.query;
    const result = await getEntities({
      page: Number(page),
      limit: Number(limit),
      sortBy,
      sortOrder,
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/entities/:id - Read by ID
app.get('/api/entities/:id', async (req, res) => {
  try {
    const entity = await getEntityById(req.params.id);
    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' });
    }
    res.json(entity);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/entities/:id - Update
app.put('/api/entities/:id', async (req, res) => {
  try {
    const entity = await updateEntity(req.params.id, req.body);
    res.json(entity);
  } catch (error) {
    if (error.message === 'Entity not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
});

// DELETE /api/entities/:id - Soft delete
app.delete('/api/entities/:id', async (req, res) => {
  try {
    await softDeleteEntity(req.params.id);
    res.status(204).send();
  } catch (error) {
    if (error.message === 'Entity not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});
```

## Step 8: Add Error Handling and Validation Middleware

```typescript
// Middleware for input validation
const validateCreateEntity = (req, res, next) => {
  try {
    createEntitySchema.parse(req.body);
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid input', details: error.errors });
  }
};

const validateUpdateEntity = (req, res, next) => {
  try {
    updateEntitySchema.parse(req.body);
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid input', details: error.errors });
  }
};

// Middleware for entity existence check
const checkEntityExists = async (req, res, next) => {
  try {
    const entity = await getEntityById(req.params.id);
    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' });
    }
    req.entity = entity; // Attach entity to request for later use
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

## Redis-Specific Considerations

### Data Structures for CRUD Operations

- **Hashes (HSET/HGET)**: Store entity data as field-value pairs
- **Sets (SADD/SREM)**: Track collections of entity IDs (active, deleted, by status, etc.)
- **Sorted Sets (ZADD/ZREM)**: Maintain ordered indexes (by creation time, name, etc.)
- **Strings**: Simple key-value storage for metadata or counters

### Key Naming Conventions

```typescript
// Consistent key patterns
const patterns = {
  entity: 'entity:{id}',              // Hash containing entity data
  entities: 'entities',               // Set of active entity IDs
  entities_deleted: 'entities:deleted', // Set of soft-deleted entity IDs
  entities_index: 'entities:index:{field}', // Sorted set for field-based indexing
  entities_by_status: 'entities:status:{status}', // Set for status-based filtering
  entities_counter: 'entities:counter', // String counter for ID generation
};
```

### ID Generation

```typescript
// Option 1: Redis INCR for sequential IDs
async function generateSequentialId(): Promise<string> {
  const counter = await redis.incr('entities:counter');
  return counter.toString();
}
```

### Handling Redis Connection Issues

```typescript
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: 3,
});

redis.on('error', (error) => {
  console.error('Redis connection error:', error);
});

redis.on('connect', () => {
  console.log('Connected to Redis');
});
```

## Redis-Specific Best Practices

1. **Use Redis Transactions (MULTI/EXEC)**: Wrap multi-step operations in Redis transactions for atomicity
2. **Implement Key Expiration**: Use TTL for temporary data and cache invalidation
3. **Choose Appropriate Data Structures**: Use Hashes for objects, Sets for unique collections, Sorted Sets for ordered data
4. **Maintain Secondary Indexes**: Create sorted sets and sets for efficient filtering and sorting
5. **Implement Connection Pooling**: Use Redis connection pooling for better performance
6. **Handle Redis Failures**: Implement circuit breakers and retry logic for Redis operations
7. **Use Redis Pipelining**: Batch multiple operations to reduce network round trips
8. **Monitor Memory Usage**: Redis is memory-bound, so monitor and manage memory effectively
9. **Implement Data Serialization**: Properly serialize complex objects for Redis storage
10. **Use Redis Pub/Sub**: Leverage Redis pub/sub for real-time features when needed
11. **Implement Backup Strategy**: Regular Redis backups and data export capabilities
12. **Add Request Logging**: Log all Redis operations for debugging and monitoring
13. **Use Environment Variables**: Keep Redis connection details secure
14. **Implement Health Checks**: Monitor Redis connectivity and memory usage
15. **Add Metrics**: Track Redis performance, hit rates, and error rates
16. **Implement Data Persistence**: Configure Redis persistence (RDB/AOF) based on your durability needs
17. **Plan for Scaling**: Consider Redis Cluster for horizontal scaling when needed
18. **Use Redis Streams**: For audit logging and event sourcing requirements

### Service Layer Pattern

```typescript
class EntityService {
  constructor(private repository: EntityRepository) {}

  async createEntity(input: CreateEntityInput): Promise<EntityName> {
    // Business logic, validation, etc.
    return this.repository.create(input);
  }

  // Other methods...
}
```

This implementation provides a solid foundation for CRUD operations that can be adapted to specific entity requirements and scaled as needed.