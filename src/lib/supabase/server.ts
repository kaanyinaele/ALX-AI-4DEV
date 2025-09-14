/**
 * Server-only Supabase utilities. Safe to import in server actions, Route Handlers, and Server Components.
 */
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { SupabaseService } from './shared'

export function createServerSupabase() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          try {
            const store = await (cookies as any)()
            return store.get(name)?.value
          } catch {
            return undefined
          }
        },
        async set(name: string, value: string, options: CookieOptions) {
          try {
            const store = await (cookies as any)()
            store.set({ name, value, ...options })
          } catch {
            // ignore
          }
        },
        async remove(name: string, options: CookieOptions) {
          try {
            const store = await (cookies as any)()
            store.set({ name, value: '', ...options })
          } catch {
            // ignore
          }
        },
      },
    }
  )
}

export const serverSupabase = {
  getClient: createServerSupabase,
  getService: () => new SupabaseService(createServerSupabase()),
}
