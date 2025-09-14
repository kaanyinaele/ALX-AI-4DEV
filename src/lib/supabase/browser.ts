'use client'

/**
 * Client-only Supabase utilities. Safe to import in Client Components and hooks.
 */
import { createBrowserClient } from '@supabase/ssr'
import { SupabaseService } from './shared'

export function createBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export const browserSupabase = {
  getClient: createBrowserSupabase,
  getService: () => new SupabaseService(createBrowserSupabase()),
}
