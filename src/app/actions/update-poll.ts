'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { PollService } from '@/lib/services/poll-service'
import { AuthServer } from '@/lib/services/auth-server'
import { type PollFormData } from '@/lib/types'
import { UnauthorizedError } from '@/lib/types'
import { handleError } from '@/lib/utils/error-handling'

/**
 * Server action to update an existing poll
 */
export async function updatePoll(pollId: string, data: PollFormData) {
  try {
    // Get current user (server-side)
    const { data: user, error: userError } = await AuthServer.getCurrentUser()
    
    if (userError || !user) {
      throw new UnauthorizedError()
    }

    // Update poll
    const { data: poll, error: pollError } = await PollService.updatePoll(pollId, data, user.id)
    
    if (pollError) {
      throw pollError
    }
    
    // Invalidate cache
    revalidatePath('/polls')
    
    // Redirect to polls list
    redirect('/polls')
  } catch (error) {
    // Handle and log errors
    const formattedError = handleError(error, { 
      action: 'updatePoll',
      pollId,
      pollData: { title: data.title }
    })
    
    throw formattedError
  }
}
