/**
 * Authentication-related React hooks
 */
import { useState, useEffect } from "react";
import { browserSupabase } from "../supabase";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { User } from "../types";

/**
 * Hook for handling authentication state
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const supabase = browserSupabase.getClient();
        
        // Get initial user
        const { data } = await supabase.auth.getUser();
        setUser(data.user);

        // Listen for auth changes
        const { data: authListener } = supabase.auth.onAuthStateChange(
          (event, session) => {
            setUser(session?.user || null);
          }
        );

        return () => {
          authListener.subscription.unsubscribe();
        };
      } catch (error) {
        console.error("Auth error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const signIn = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      const supabase = browserSupabase.getClient();
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      toast.success("Signed in successfully!");
      router.push("/polls");
      return true;
    } catch (error) {
      console.error("Sign in error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to sign in");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      const supabase = browserSupabase.getClient();
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirect: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
      
      toast.success("Please check your email to confirm your account");
      return true;
    } catch (error) {
      console.error("Sign up error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to sign up");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async (): Promise<boolean> => {
    try {
      setLoading(true);
      const supabase = browserSupabase.getClient();
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast.success("Signed out successfully");
      router.push("/login");
      return true;
    } catch (error) {
      console.error("Sign out error:", error);
      toast.error("Failed to sign out");
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut,
  };
}
