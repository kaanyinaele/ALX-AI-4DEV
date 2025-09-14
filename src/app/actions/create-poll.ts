'use server'

import { revalidatePath } from 'next/cache'
import { PollService } from '@/lib/services/poll-service'
import { AuthServer } from '@/lib/services/auth-server'
import { type PollFormData } from '@/lib/types'
import { UnauthorizedError } from '@/lib/types'
import { handleError } from '@/lib/utils/error-handling'

/**
 * Server action to create a new poll
 */
export async function createPoll(data: PollFormData) {
  try {
    // Get current user (server-side)
    const { data: user, error: userError } = await AuthServer.getCurrentUser()
    
    if (userError || !user) {
      throw new UnauthorizedError()
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
