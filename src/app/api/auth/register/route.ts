import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { Redis } from '@upstash/redis'

// Simple in-memory storage for development when Redis is not available
const mockStorage = new Map<string, string>()

const redis: Redis = process.env.REDIS_URL && process.env.REDIS_TOKEN
  ? new Redis({
      url: process.env.REDIS_URL!,
      token: process.env.REDIS_TOKEN!,
    })
  : {
      get: async (key: string) => mockStorage.get(key),
      set: async (key: string, value: string) => mockStorage.set(key, value),
    } as any

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json()

    // Check if user already exists
    const existingUser = await redis.get(`user:${email}`)
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user object
    const user = {
      id: crypto.randomUUID(),
      email,
      name,
      password: hashedPassword,
      role: 'USER',
      createdAt: new Date().toISOString(),
    }

    // Store user in Redis
    await redis.set(`user:${email}`, JSON.stringify(user))

    // Remove password from response
    const { password, ...userWithoutPassword } = user

    return NextResponse.json({ user: userWithoutPassword })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}