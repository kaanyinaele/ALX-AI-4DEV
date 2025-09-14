/**
 * Auth service - Contains business logic for authentication operations
 */
import { browserSupabase } from "../supabase/browser";
import { executeWithRetry } from "../supabase/shared";
import { withErrorHandling } from "../utils/error-handling";
import type { ApiResponse, AuthResponse, User } from "../types";

/**
 * Service for authentication-related operations
 */
export class AuthService {
  /**
   * Gets the currently logged-in user (client-side)
   */
  static async getClientUser(): Promise<ApiResponse<User | null>> {
    return await withErrorHandling(async () => {
      const supabase = browserSupabase.getClient();
      const { data, error } = await executeWithRetry(() => supabase.auth.getUser());
      if (error) throw error;
      const u = data?.user ? { id: data.user.id, email: data.user.email ?? undefined } : null;
      return u;
    });
  }

  /**
   * Signs in with email and password
   */
  static async signInWithPassword(
    email: string,
    password: string
  ): Promise<ApiResponse<AuthResponse>> {
    return await withErrorHandling(async () => {
      const supabase = browserSupabase.getClient();
      const { data, error } = await executeWithRetry(() =>
        supabase.auth.signInWithPassword({
          email,
          password,
        })
      );
      if (error) throw error;
      const user = data?.user ? { id: data.user.id, email: data.user.email ?? undefined } : null;
      return { user, error: null };
    });
  }

  /**
   * Signs up with email and password
   */
  static async signUp(
    email: string,
    password: string
  ): Promise<ApiResponse<AuthResponse>> {
    return await withErrorHandling(async () => {
      const supabase = browserSupabase.getClient();
      const { data, error } = await executeWithRetry(() =>
        supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })
      );
      if (error) throw error;
      const user = data?.user ? { id: data.user.id, email: data.user.email ?? undefined } : null;
      return { user, error: null };
    });
  }

  /**
   * Signs out the current user
   */
  static async signOut(): Promise<ApiResponse<boolean>> {
    return await withErrorHandling(async () => {
      const supabase = browserSupabase.getClient();
      const { error } = await executeWithRetry(() => supabase.auth.signOut());
      if (error) throw error;
      return true;
    });
  }
}
