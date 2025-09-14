/**
 * Centralized Supabase client module
 * Provides consistent client creation with error handling and retries
 */
import { createBrowserClient } from "@supabase/ssr";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CookieOptions } from '@supabase/ssr';

// Maximum number of retries for database operations
const MAX_RETRIES = 3;
const RETRY_DELAY = 300; // ms

/**
 * Creates a Supabase client for server components and server actions
 */
export function createServerSupabase() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          try {
            return cookieStore.get(name)?.value;
          } catch {
            return undefined;
          }
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Handle cookie error
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // Handle cookie error
          }
        },
      },
    }
  );
}

/**
 * Creates a Supabase client for client components
 */
export function createBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * Execute a Supabase query with retry logic for better reliability
 * @param queryFn - Function that performs the Supabase query
 * @param retries - Number of retry attempts
 */
export async function executeWithRetry<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>, 
  retries = MAX_RETRIES
): Promise<{ data: T | null; error: any }> {
  let attempt = 0;
  
  while (attempt < retries) {
    const result = await queryFn();
    
    if (!result.error || !isRetryableError(result.error)) {
      return result;
    }
    
    // Exponential backoff
    const delay = RETRY_DELAY * Math.pow(2, attempt);
    await new Promise(resolve => setTimeout(resolve, delay));
    attempt++;
  }
  
  // Last attempt
  return await queryFn();
}

/**
 * Determines if an error is retryable
 */
function isRetryableError(error: any): boolean {
  // Network errors, rate limits, and connection issues should be retried
  const retryableErrors = [
    'connection error',
    'timeout',
    'rate limit',
    'network error',
    '5xx', // Server errors
    'pool timeout'
  ];
  
  const errorString = String(error).toLowerCase();
  return retryableErrors.some(e => errorString.includes(e));
}

/**
 * Service class for database operations with error handling
 */
export class SupabaseService {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  /**
   * Fetch data with proper error handling
   */
  async fetchData<T>(
    tableName: string, 
    query: (from: any) => any
  ): Promise<{ data: T | null; error: Error | null }> {
    try {
      const result = await executeWithRetry(() => 
        query(this.client.from(tableName))
      );
      
      if (result.error) {
        console.error(`Error fetching from ${tableName}:`, result.error);
        return { data: null, error: new Error(result.error.message) };
      }
      
      return { data: result.data as T, error: null };
    } catch (error) {
      console.error(`Exception in ${tableName} fetch:`, error);
      return { data: null, error: error as Error };
    }
  }
}

// Export singleton instances for client and server
export const serverSupabase = {
  getClient: createServerSupabase,
  getService: () => new SupabaseService(createServerSupabase())
};

export const browserSupabase = {
  getClient: createBrowserSupabase,
  getService: () => new SupabaseService(createBrowserSupabase())
};
