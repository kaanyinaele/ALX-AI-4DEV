'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { PollService } from '@/lib/services/poll-service'
import { AuthService } from '@/lib/services/auth-service'
import { type PollFormData } from '@/lib/types'
import { UnauthorizedError, NotFoundError } from '@/lib/types'
import { handleError } from '@/lib/utils/error-handling'

/**
 * Server action to update an existing poll
 */
export async function updatePoll(pollId: string, data: PollFormData) {
  try {
    // Get current user
    const { data: user, error: userError } = await AuthService.getCurrentUser()
    
    if (userError || !user) {
      throw new UnauthorizedError('You must be logged in to update a poll')
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
