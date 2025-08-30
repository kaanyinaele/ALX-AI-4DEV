import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createClient() {
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
        set(name: string, value: string) {
          try {
            cookieStore.set(name, value);
          } catch {
            // Ignore set errors in middleware
          }
        },
        remove(name: string) {
          try {
            cookieStore.delete(name);
          } catch {
            // Ignore delete errors in middleware
          }
        },
      },
    }
  );
}