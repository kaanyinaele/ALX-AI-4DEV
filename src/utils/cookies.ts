import { cookies } from 'next/headers'

export async function getCookies() {
  return await cookies()
}

export async function createCookieClient() {
  const cookieStore = await getCookies()
  return {
    get: (name: string) => cookieStore.get(name)?.value,
    set: (name: string, value: string, options?: any) => {
      try {
        cookieStore.set(name, value)
      } catch {
        // Ignore set errors in middleware
      }
    },
    remove: (name: string, options?: any) => {
      try {
        cookieStore.delete(name)
      } catch {
        // Ignore delete errors in middleware
      }
    },
  }
}
