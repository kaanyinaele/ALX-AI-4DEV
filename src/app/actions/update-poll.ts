'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@supabase/ssr'
import { type PollFormData } from '@/lib/schemas/poll'
import { redirect } from 'next/navigation'

export async function updatePoll(pollId: string, data: PollFormData) {
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

  // Verify ownership
  const { data: poll, error: pollError } = await supabase
    .from('polls')
    .select('created_by')
    .eq('id', pollId)
    .single()

  if (pollError || !poll) throw new Error('Poll not found')
  if (poll.created_by !== user.id) throw new Error('Unauthorized')

  // Update poll
  const { error: updateError } = await supabase
    .from('polls')
    .update({
      title: data.title,
      description: data.description,
      is_multiple_choice: data.isMultipleChoice,
      is_anonymous: data.isAnonymous,
      expires_at: data.expiresAt,
    })
    .eq('id', pollId)

  if (updateError) throw updateError

  // Get existing options
  const { data: existingOptions } = await supabase
    .from('poll_options')
    .select('id, option_text')
    .eq('poll_id', pollId)

  // Delete removed options
  const optionTexts = new Set(data.options)
  const optionsToDelete = existingOptions?.filter(
    option => !optionTexts.has(option.option_text)
  ) || []

  if (optionsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('poll_options')
      .delete()
      .in('id', optionsToDelete.map(o => o.id))

    if (deleteError) throw deleteError
  }

  // Add new options
  const existingTexts = new Set(existingOptions?.map(o => o.option_text) || [])
  const newOptions = data.options
    .filter(text => !existingTexts.has(text))
    .map(option_text => ({
      poll_id: pollId,
      option_text,
    }))

  if (newOptions.length > 0) {
    const { error: insertError } = await supabase
      .from('poll_options')
      .insert(newOptions)

    if (insertError) throw insertError
  }

  revalidatePath('/polls')
  redirect('/polls')
}
