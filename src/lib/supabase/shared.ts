/**
 * Shared Supabase utilities safe for both server and client bundles
 */
import type { SupabaseClient } from '@supabase/supabase-js'

// Maximum number of retries for database operations
const MAX_RETRIES = 3
const RETRY_DELAY = 300 // ms

/**
 * Execute a Supabase query with retry logic for better reliability
 * @param queryFn - Function that performs the Supabase query
 * @param retries - Number of retry attempts
 */
export async function executeWithRetry<R = any>(
  queryFn: () => any,
  retries = MAX_RETRIES
): Promise<R> {
  let attempt = 0

  while (attempt < retries) {
    const result: any = await Promise.resolve(queryFn())

    if (!result?.error || !isRetryableError(result.error)) {
      return result as R
    }

    // Exponential backoff
    const delay = RETRY_DELAY * Math.pow(2, attempt)
    await new Promise((resolve) => setTimeout(resolve, delay))
    attempt++
  }

  // Last attempt
  return (await Promise.resolve(queryFn())) as R
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
    'pool timeout',
  ]

  const errorString = String(error).toLowerCase()
  return retryableErrors.some((e) => errorString.includes(e))
}

/**
 * Service class for database operations with error handling
 */
export class SupabaseService {
  private client: SupabaseClient

  constructor(client: SupabaseClient) {
    this.client = client
  }

  /**
   * Fetch data with proper error handling
   */
  async fetchData<T>(
    tableName: string,
    query: (from: any) => any
  ): Promise<{ data: T | null; error: Error | null }> {
    try {
      const result = await executeWithRetry(() => query(this.client.from(tableName)))

      if (result.error) {
        console.error(`Error fetching from ${tableName}:`, result.error)
        return { data: null, error: new Error(result.error.message) }
      }

      return { data: result.data as T, error: null }
    } catch (error) {
      console.error(`Exception in ${tableName} fetch:`, error)
      return { data: null, error: error as Error }
    }
  }
}
