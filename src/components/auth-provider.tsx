"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { browserSupabase } from "@/lib/supabase/browser";
import { AuthService } from "@/lib/services/auth-service";
import { showErrorToast } from "@/lib/utils/error-handling";
import type { User } from "@/lib/types";

/**
 * Authentication context interface
 */
interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<boolean>;
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAuthenticated: false,
  signIn: async () => false,
  signUp: async () => false,
  signOut: async () => false,
});

/**
 * Authentication provider component
 */
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  
  // Initialize auth state on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const supabase = browserSupabase.getClient();
        
        // Get initial user
        const { data } = await supabase.auth.getUser();
        setUser(data.user);

        // Set up auth state change listener
        const { data: authListener } = supabase.auth.onAuthStateChange(
          (_event, session) => {
            setUser(session?.user ?? null);
          }
        );

        return () => {
          authListener.subscription.unsubscribe();
        };
      } catch (error) {
        console.error("Auth initialization error:", error);
        showErrorToast(error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  /**
   * Sign in with email and password
   */
  const signIn = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      const { data, error } = await AuthService.signInWithPassword(email, password);
      
      if (error) throw error;
      
      toast.success("Signed in successfully!");
      router.push("/polls");
      return true;
    } catch (error) {
      showErrorToast(error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sign up with email and password
   */
  const signUp = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      const { data, error } = await AuthService.signUp(email, password);
      
      if (error) throw error;
      
      toast.success("Please check your email to confirm your account");
      return true;
    } catch (error) {
      showErrorToast(error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sign out the current user
   */
  const signOut = async (): Promise<boolean> => {
    try {
      setLoading(true);
      const { error } = await AuthService.signOut();
      
      if (error) throw error;
      
      toast.success("Signed out successfully");
      router.push("/login");
      return true;
    } catch (error) {
      showErrorToast(error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Provide auth context to child components
  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAuthenticated: !!user,
      signIn,
      signUp,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook to access authentication context
 */
export const useAuth = () => useContext(AuthContext);