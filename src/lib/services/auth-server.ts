/**
 * Server-side authentication service
 */
import { serverSupabase } from "../supabase/server";
import { executeWithRetry } from "../supabase/shared";
import { withErrorHandling } from "../utils/error-handling";
import type { ApiResponse, User } from "../types";

export class AuthServer {
  /**
   * Gets the currently logged-in user (server-side)
   */
  static async getCurrentUser(): Promise<ApiResponse<User | null>> {
    return await withErrorHandling(async () => {
      const supabase = serverSupabase.getClient();

      const { data, error } = await executeWithRetry(() => supabase.auth.getUser());
      if (error) throw error;

      return data?.user ?? null;
    });
  }
}
