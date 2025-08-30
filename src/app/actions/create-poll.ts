'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@supabase/ssr'
import { type PollFormData } from '@/lib/schemas/poll'

export async function createPoll(data: PollFormData) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Unauthorized')

  const { data: poll, error: pollError } = await supabase
    .from('polls')
    .insert({
      title: data.title,
      description: data.description,
      created_by: user.id,
      is_multiple_choice: data.isMultipleChoice,
      is_anonymous: data.isAnonymous,
      expires_at: data.expiresAt,
    })
    .select()
    .single()

  if (pollError) throw pollError

  const options = data.options.map(option => ({
    poll_id: poll.id,
    option_text: option,
  }))

  const { error: optionsError } = await supabase
    .from('poll_options')
    .insert(options)

  if (optionsError) throw optionsError

  revalidatePath('/polls')
  return { poll }
}
