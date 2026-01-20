import { Redis } from '@upstash/redis';

// Simple in-memory storage for development when Redis is not available
const mockStorage = new Map<string, any>();

const redis: Redis = process.env.REDIS_URL && process.env.REDIS_TOKEN
  ? new Redis({
      url: process.env.REDIS_URL!,
      token: process.env.REDIS_TOKEN!,
    })
  : {
      get: async (key: string) => mockStorage.get(key),
      set: async (key: string, value: any) => mockStorage.set(key, value),
      del: async (key: string) => mockStorage.delete(key),
      exists: async (key: string) => mockStorage.has(key),
      hgetall: async (key: string) => mockStorage.get(key) || {},
      hmset: async (key: string, data: Record<string, any>) => {
        const existing = mockStorage.get(key) || {};
        mockStorage.set(key, { ...existing, ...data });
      },
      hset: async (key: string, field: string, value: any) => {
        const existing = mockStorage.get(key) || {};
        existing[field] = value;
        mockStorage.set(key, existing);
      },
      hget: async (key: string, field: string) => {
        const existing = mockStorage.get(key) || {};
        return existing[field];
      },
      hdel: async (key: string, field: string) => {
        const existing = mockStorage.get(key) || {};
        delete existing[field];
        mockStorage.set(key, existing);
      },
      sadd: async (key: string, member: string) => {
        const existing = mockStorage.get(key) || new Set();
        existing.add(member);
        mockStorage.set(key, existing);
      },
      srem: async (key: string, member: string) => {
        const existing = mockStorage.get(key) || new Set();
        existing.delete(member);
        mockStorage.set(key, existing);
      },
      sismember: async (key: string, member: string) => {
        const existing = mockStorage.get(key) || new Set();
        return existing.has(member);
      },
      smembers: async (key: string) => {
        const existing = mockStorage.get(key) || new Set();
        return Array.from(existing);
      },
      sdiff: async (...keys: string[]) => {
        const sets = keys.map(key => mockStorage.get(key) || new Set());
        if (sets.length === 0) return [];
        const firstSet = sets[0];
        const result = new Set(firstSet);
        for (let i = 1; i < sets.length; i++) {
          for (const item of result) {
            if (sets[i].has(item)) {
              result.delete(item);
            }
          }
        }
        return Array.from(result);
      },
      incr: async (key: string) => {
        const existing = mockStorage.get(key) || 0;
        const newValue = existing + 1;
        mockStorage.set(key, newValue);
        return newValue;
      },
      multi: () => ({
        hmset: (key: string, data: Record<string, any>) => ({
          sadd: (listKey: string, member: string) => ({
            exec: async () => {
              const existing = mockStorage.get(key) || {};
              mockStorage.set(key, { ...existing, ...data });
              const listExisting = mockStorage.get(listKey) || new Set();
              listExisting.add(member);
              mockStorage.set(listKey, listExisting);
              return [];
            }
          })
        }),
        hset: (key: string, field: string, value: any) => ({
          hset: (key2: string, field2: string, value2: any) => ({
            srem: (listKey: string, member: string) => ({
              sadd: (listKey2: string, member2: string) => ({
                exec: async () => {
                  const existing = mockStorage.get(key) || {};
                  existing[field] = value;
                  mockStorage.set(key, existing);
                  const existing2 = mockStorage.get(key2) || {};
                  existing2[field2] = value2;
                  mockStorage.set(key2, existing2);
                  const listExisting = mockStorage.get(listKey) || new Set();
                  listExisting.delete(member);
                  mockStorage.set(listKey, listExisting);
                  const listExisting2 = mockStorage.get(listKey2) || new Set();
                  listExisting2.add(member2);
                  mockStorage.set(listKey2, listExisting2);
                  return [];
                }
              })
            })
          })
        })
      })
    } as any;

export { redis };