# Next.js Application Setup Guide

This guide provides step-by-step instructions for creating a new Next.js application with authentication and file storage, deployed on Vercel, using Tailwind CSS, Framer Motion, Lucide Icons, Supabase for authentication and database storage, and Supabase Storage for file uploads.

## Step 1: Create Next.js Application

```bash
npx create-next-app@latest my-nextjs-app --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd my-nextjs-app
```

## Step 2: Install Required Dependencies

```bash
npm install @supabase/supabase-js @supabase/ssr framer-motion lucide-react
```

For development:
```bash
npm install -D @types/node
```

## Step 3: Set up Environment Variables

Copy the `.env.example` file to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Update the following variables in `.env.local` (these match Vercel's Supabase integration):
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL (found in your Supabase dashboard under Settings > API)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous/public key (found in your Supabase dashboard under Settings > API)
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (keep this secret, only use server-side)
- `SUPABASE_TABLE_PREFIX`: A prefix for your database tables (useful when multiple projects share the same database)

Note: Vercel provides additional variables like `SUPABASE_SECRET_KEY` and `SUPABASE_JWT_SECRET` which you can use if needed for advanced configurations.

## Step 4: Configure Tailwind CSS with Custom Theme

Update your `tailwind.config.js` file with the custom color palette from `theme-colors.md`:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Add your custom colors here from theme-colors.md
        primary: { /* ... */ },
        secondary: { /* ... */ },
        accent: { /* ... */ },
        success: { /* ... */ },
        error: { /* ... */ },
        warning: { /* ... */ },
        info: { /* ... */ },
      },
    },
  },
  plugins: [],
}
```

## Step 5: Set up Supabase Configuration

Create `src/lib/supabase.ts` for client-side Supabase client:

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

Create `src/lib/supabase-server.ts` for server-side Supabase client:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
```

Create `src/lib/supabase-admin.ts` for admin operations:

```typescript
import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
```

Create `src/lib/database.ts` for database operations:

```typescript
import { supabaseAdmin } from './supabase-admin'

export class DatabaseService {
  private tablePrefix: string

  constructor() {
    this.tablePrefix = process.env.SUPABASE_TABLE_PREFIX || ''
  }

  private getTableName(table: string): string {
    return `${this.tablePrefix}${table}`
  }

  // Example methods - extend as needed
  async createUser(userData: { email: string; name: string; role?: string }) {
    const { data, error } = await supabaseAdmin
      .from(this.getTableName('users'))
      .insert([{
        ...userData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getUserById(id: string) {
    const { data, error } = await supabaseAdmin
      .from(this.getTableName('users'))
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }

  async getUserByEmail(email: string) {
    const { data, error } = await supabaseAdmin
      .from(this.getTableName('users'))
      .select('*')
      .eq('email', email)
      .single()

    if (error) throw error
    return data
  }
}

export const databaseService = new DatabaseService()
```

## Step 6: Create API Routes

Create `src/app/api/auth/callback/route.ts` for Supabase auth callback:

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          },
        },
      }
    )
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
      const isLocalEnv = process.env.NODE_ENV === 'development'
      if (isLocalEnv) {
        // We can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
```

Create `src/app/api/auth/register/route.ts` for user registration:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { databaseService } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json()

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Email, password, and name are required' }, { status: 400 })
    }

    // Check if user already exists
    try {
      await databaseService.getUserByEmail(email)
      return NextResponse.json({ error: 'User already exists' }, { status: 400 })
    } catch (error) {
      // User doesn't exist, continue with registration
    }

    // Create user in database
    const user = await databaseService.createUser({
      email,
      name,
      role: 'user',
    })

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      }
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

## Step 7: Create Authentication Pages

Create `src/app/auth/signin/page.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        alert(error.message)
      } else {
        router.push('/')
      }
    } catch (error) {
      console.error('Sign in error:', error)
      alert('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignInWithProvider = async (provider: 'google' | 'github') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        alert(error.message)
      }
    } catch (error) {
      console.error('OAuth sign in error:', error)
      alert('An unexpected error occurred')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-50 text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleSignInWithProvider('google')}
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
              >
                Google
              </button>
              <button
                type="button"
                onClick={() => handleSignInWithProvider('github')}
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
              >
                GitHub
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
```

Create `src/app/auth/signup/page.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function SignUp() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
          },
        },
      })

      if (error) {
        alert(error.message)
      } else {
        alert('Check your email for the confirmation link')
        router.push('/auth/signin')
      }
    } catch (error) {
      console.error('Registration error:', error)
      alert('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {isLoading ? 'Creating account...' : 'Sign up'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

## Step 8: Set up Supabase Provider

Update `src/app/layout.tsx`:

```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { SupabaseProvider } from '@/components/SupabaseProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'My Next.js App',
  description: 'Next.js app with Supabase authentication',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SupabaseProvider>
          {children}
        </SupabaseProvider>
      </body>
    </html>
  )
}
```

Create `src/components/SupabaseProvider.tsx`:

```tsx
'use client'

import { createClient } from '@/lib/supabase'
import { SessionContextProvider } from '@supabase/auth-helpers-react'

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient()

  return (
    <SessionContextProvider supabaseClient={supabase}>
      {children}
    </SessionContextProvider>
  )
}
```

Update your `src/lib/supabase.ts` to export the client for the provider:

```typescript
import { createBrowserClient } from '@supabase/ssr'

let supabase: ReturnType<typeof createBrowserClient>

export function createClient() {
  // Create a singleton instance
  if (!supabase) {
    supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return supabase
}

export { supabase }
```

## Step 9: Create Protected Routes and Role-Based Access

Create `src/components/ProtectedRoute.tsx`:

```tsx
'use client'

import { useUser } from '@supabase/auth-helpers-react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { databaseService } from '@/lib/database'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: string
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const user = useUser()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (user === undefined) return // Still loading

    if (!user) {
      router.push('/auth/signin')
      return
    }

    // Check user role if required
    if (requiredRole) {
      const checkUserRole = async () => {
        try {
          const userData = await databaseService.getUserById(user.id)
          if (userData.role !== requiredRole) {
            router.push('/unauthorized')
          }
        } catch (error) {
          console.error('Error checking user role:', error)
          router.push('/unauthorized')
        }
      }
      checkUserRole()
    }
  }, [user, router, requiredRole])

  if (user === undefined) {
    return <div>Loading...</div>
  }

  if (!user) {
    return null
  }

  return <>{children}</>
}
```

## Step 10: Add Framer Motion Animations

Create `src/components/AnimatedComponent.tsx`:

```tsx
'use client'

import { motion } from 'framer-motion'

interface AnimatedComponentProps {
  children: React.ReactNode
  delay?: number
}

export function AnimatedComponent({ children, delay = 0 }: AnimatedComponentProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      {children}
    </motion.div>
  )
}
```

## Step 11: Add Lucide Icons

Create `src/components/Icon.tsx`:

```tsx
import {
  User,
  Settings,
  Home,
  LogOut,
  type LucideIcon,
} from 'lucide-react'

const icons = {
  user: User,
  settings: Settings,
  home: Home,
  logout: LogOut,
}

interface IconProps {
  name: keyof typeof icons
  size?: number
  className?: string
}

export function Icon({ name, size = 24, className }: IconProps) {
  const IconComponent = icons[name]
  return <IconComponent size={size} className={className} />
}
```

## Step 12: Update Main Page

Update `src/app/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { databaseService } from '@/lib/database'

export default async function Home() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/signin')
  }

  // Get additional user data from database
  const userData = await databaseService.getUserById(user.id)

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome, {userData.name}!
          </h1>
          <p className="mt-2 text-gray-600">
            Your role: {userData.role}
          </p>
          <p className="mt-2 text-gray-600">
            Email: {user.email}
          </p>
        </div>
      </div>
    </main>
  )
}
```

## Step 13: Set up Supabase Database

1. Create a new Supabase project at https://supabase.com
2. Go to the SQL Editor in your Supabase dashboard
3. Run the following SQL to create your tables (replace `your_table_prefix` with your actual prefix):

```sql
-- Create users table with prefix
CREATE TABLE your_table_prefix_users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
  avatar TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create profiles table (optional, for additional user data)
CREATE TABLE your_table_prefix_profiles (
  id UUID REFERENCES your_table_prefix_users(id) PRIMARY KEY,
  bio TEXT,
  website TEXT,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE your_table_prefix_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE your_table_prefix_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can view their own profile" ON your_table_prefix_users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON your_table_prefix_users
  FOR UPDATE USING (auth.uid() = id);

-- Allow admins to view all users
CREATE POLICY "Admins can view all users" ON your_table_prefix_users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM your_table_prefix_users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO your_table_prefix_users (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

4. Update your environment variables with your Supabase project details

## Step 14: Configure Vercel Deployment

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
   - `SUPABASE_TABLE_PREFIX`: Your table prefix

## Step 15: Test the Application

```bash
npm run dev
```

Visit `http://localhost:3000` and test:
- User registration
- User login
- Protected routes
- Role-based access

## Additional Config

### Environment Variables for Production
Make sure to set all environment variables in your Vercel project settings.

### Supabase Storage Setup (Optional)
If you need file storage, create a storage bucket in your Supabase dashboard:

1. Go to Storage in your Supabase dashboard
2. Create a new bucket (e.g., "avatars", "uploads")
3. Set up appropriate policies for access control

## Security Considerations

1. **Supabase RLS**: Row Level Security is enabled on all tables
2. **Service Role Key**: Keep the service role key secure, only use server-side
3. **Table Prefix**: Use prefixes to avoid conflicts when sharing databases
4. **Input Validation**: Add proper validation for user inputs
5. **Rate Limiting**: Supabase has built-in rate limiting, but consider additional measures for auth endpoints