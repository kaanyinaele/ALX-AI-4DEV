'use server'

import { revalidatePath } from 'next/cache'
import { PollService } from '@/lib/services/poll-service'
import { AuthService } from '@/lib/services/auth-service'
import { type PollFormData } from '@/lib/types'
import { UnauthorizedError } from '@/lib/types'
import { handleError } from '@/lib/utils/error-handling'

/**
 * Server action to create a new poll
 */
export async function createPoll(data: PollFormData) {
  try {
    // Get current user
    const { data: user, error: userError } = await AuthService.getCurrentUser()
    
    if (userError || !user) {
      throw new UnauthorizedError('You must be logged in to create a poll')
    }
    
    // Create poll
    const { data: poll, error: pollError } = await PollService.createPoll(data, user.id)
    
    if (pollError) {
      throw pollError
    }
    
    // Invalidate cache
    revalidatePath('/polls')
    
    return { poll }
  } catch (error) {
    // Handle and log errors
    const formattedError = handleError(error, { 
      action: 'createPoll',
      pollData: { title: data.title }
    })
    
    throw formattedError
  }
}
