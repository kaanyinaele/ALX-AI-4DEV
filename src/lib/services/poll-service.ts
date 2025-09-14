/**
 * Poll service - Contains business logic for poll operations
 */
import { 
  serverSupabase, 
  executeWithRetry 
} from "../supabase";
import { handleError, withErrorHandling } from "../utils/error-handling";
import type { 
  ApiResponse, 
  Poll, 
  PollFormData, 
  PollOption, 
  PollWithOptions,
  PollWithVoteCounts,
  UnauthorizedError,
  NotFoundError
} from "../types";

/**
 * Service for poll-related operations
 */
export class PollService {
  /**
   * Creates a new poll
   */
  static async createPoll(data: PollFormData, userId: string): Promise<ApiResponse<Poll>> {
    return await withErrorHandling(async () => {
      const supabase = serverSupabase.getClient();
      
      // Insert poll
      const { data: poll, error: pollError } = await executeWithRetry(() => 
        supabase
          .from("polls")
          .insert({
            title: data.title,
            description: data.description,
            created_by: userId,
            is_multiple_choice: data.isMultipleChoice,
            is_anonymous: data.isAnonymous,
            expires_at: data.expiresAt,
          })
          .select()
          .single()
      );

      if (pollError) throw pollError;
      if (!poll) throw new Error("Failed to create poll");

      // Insert options
      const options = data.options.map(option => ({
        poll_id: poll.id,
        option_text: option,
      }));

      const { error: optionsError } = await executeWithRetry(() => 
        supabase.from("poll_options").insert(options)
      );

      if (optionsError) throw optionsError;

      return poll;
    });
  }

  /**
   * Updates an existing poll
   */
  static async updatePoll(pollId: string, data: PollFormData, userId: string): Promise<ApiResponse<Poll>> {
    return await withErrorHandling(async () => {
      const supabase = serverSupabase.getClient();

      // Verify ownership
      const { data: poll, error: pollError } = await executeWithRetry(() => 
        supabase
          .from("polls")
          .select("created_by")
          .eq("id", pollId)
          .single()
      );

      if (pollError) throw pollError;
      if (!poll) throw new NotFoundError("Poll not found");
      if (poll.created_by !== userId) throw new UnauthorizedError("You don't have permission to update this poll");

      // Update poll
      const { error: updateError } = await executeWithRetry(() => 
        supabase
          .from("polls")
          .update({
            title: data.title,
            description: data.description,
            is_multiple_choice: data.isMultipleChoice,
            is_anonymous: data.isAnonymous,
            expires_at: data.expiresAt,
          })
          .eq("id", pollId)
      );

      if (updateError) throw updateError;

      // Get existing options
      const { data: existingOptions } = await executeWithRetry(() => 
        supabase
          .from("poll_options")
          .select("id, option_text")
          .eq("poll_id", pollId)
      );

      // Delete removed options
      const optionTexts = new Set(data.options);
      const optionsToDelete = existingOptions?.filter(
        option => !optionTexts.has(option.option_text)
      ) || [];

      if (optionsToDelete.length > 0) {
        const { error: deleteError } = await executeWithRetry(() => 
          supabase
            .from("poll_options")
            .delete()
            .in("id", optionsToDelete.map(o => o.id))
        );

        if (deleteError) throw deleteError;
      }

      // Add new options
      const existingTexts = new Set(existingOptions?.map(o => o.option_text) || []);
      const newOptions = data.options
        .filter(text => !existingTexts.has(text))
        .map(option_text => ({
          poll_id: pollId,
          option_text,
        }));

      if (newOptions.length > 0) {
        const { error: insertError } = await executeWithRetry(() => 
          supabase.from("poll_options").insert(newOptions)
        );

        if (insertError) throw insertError;
      }

      // Get updated poll
      const { data: updatedPoll, error: getError } = await executeWithRetry(() => 
        supabase
          .from("polls")
          .select()
          .eq("id", pollId)
          .single()
      );

      if (getError) throw getError;
      return updatedPoll;
    });
  }

  /**
   * Gets a poll by ID with options
   */
  static async getPollById(pollId: string): Promise<ApiResponse<PollWithOptions>> {
    return await withErrorHandling(async () => {
      const supabase = serverSupabase.getClient();
      
      const { data: poll, error } = await executeWithRetry(() => 
        supabase
          .from("polls")
          .select(`
            *,
            poll_options (
              id,
              option_text
            )
          `)
          .eq("id", pollId)
          .single()
      );

      if (error) throw error;
      if (!poll) throw new NotFoundError("Poll not found");
      
      return poll;
    });
  }

  /**
   * Gets a poll by ID with options and votes
   */
  static async getPollWithVotes(pollId: string): Promise<ApiResponse<PollWithVoteCounts>> {
    return await withErrorHandling(async () => {
      const supabase = serverSupabase.getClient();
      
      const { data: poll, error } = await executeWithRetry(() => 
        supabase
          .from("polls")
          .select(`
            *,
            poll_options (
              id,
              option_text,
              votes (count)
            )
          `)
          .eq("id", pollId)
          .single()
      );

      if (error) throw error;
      if (!poll) throw new NotFoundError("Poll not found");
      
      return poll;
    });
  }

  /**
   * Gets all polls for display in a list
   */
  static async getAllPolls(userId: string): Promise<ApiResponse<Poll[]>> {
    return await withErrorHandling(async () => {
      const supabase = serverSupabase.getClient();
      
      const { data: polls, error } = await executeWithRetry(() => 
        supabase
          .from("polls")
          .select(`
            *,
            poll_options (count),
            votes (count)
          `)
          .order("created_at", { ascending: false })
      );

      if (error) throw error;
      
      return polls || [];
    });
  }

  /**
   * Deletes a poll
   */
  static async deletePoll(pollId: string, userId: string): Promise<ApiResponse<boolean>> {
    return await withErrorHandling(async () => {
      const supabase = serverSupabase.getClient();

      // Verify ownership
      const { data: poll, error: pollError } = await executeWithRetry(() => 
        supabase
          .from("polls")
          .select("created_by")
          .eq("id", pollId)
          .single()
      );

      if (pollError) throw pollError;
      if (!poll) throw new NotFoundError("Poll not found");
      if (poll.created_by !== userId) throw new UnauthorizedError("You don't have permission to delete this poll");

      // Delete poll (will cascade delete options and votes)
      const { error } = await executeWithRetry(() => 
        supabase
          .from("polls")
          .delete()
          .eq("id", pollId)
      );

      if (error) throw error;
      
      return true;
    });
  }

  /**
   * Submits votes for a poll
   */
  static async submitVote(
    pollId: string, 
    optionIds: string[], 
    userId: string
  ): Promise<ApiResponse<boolean>> {
    return await withErrorHandling(async () => {
      const supabase = serverSupabase.getClient();
      
      // Check if user already voted
      const { data: existingVotes, error: checkError } = await executeWithRetry(() => 
        supabase
          .from("votes")
          .select("id")
          .eq("poll_id", pollId)
          .eq("voter_id", userId)
          .limit(1)
      );

      if (checkError) throw checkError;
      
      if (existingVotes && existingVotes.length > 0) {
        throw new Error("You have already voted on this poll");
      }

      // Submit votes
      const votes = optionIds.map(optionId => ({
        poll_id: pollId,
        option_id: optionId,
        voter_id: userId,
      }));

      const { error } = await executeWithRetry(() => 
        supabase.from("votes").insert(votes)
      );

      if (error) throw error;
      
      return true;
    });
  }

  /**
   * Checks if a user has already voted on a poll
   */
  static async hasUserVoted(pollId: string, userId: string): Promise<ApiResponse<boolean>> {
    return await withErrorHandling(async () => {
      const supabase = serverSupabase.getClient();
      
      const { data: votes, error } = await executeWithRetry(() => 
        supabase
          .from("votes")
          .select("id")
          .eq("poll_id", pollId)
          .eq("voter_id", userId)
          .limit(1)
      );

      if (error) throw error;
      
      return Boolean(votes && votes.length > 0);
    });
  }
}
