/**
 * Client-side poll helpers. Safe to import in client components/hooks.
 *
 * Provides:
 * - castVoteClient: cast one or more votes for a poll (auth required)
 * - getPollResultsClient: fetch poll option vote counts for a poll
 */
import { browserSupabase } from "../supabase/browser";
import type { ApiResponse } from "../types";
import { UnauthorizedError } from "../types";
import { withErrorHandling } from "../utils/error-handling";

export type PollOptionResult = {
  id: string;
  option_text: string;
  count: number;
};

/**
 * Cast a vote for an existing poll (client-side).
 *
 * Inputs:
 * - pollId: ID of the poll to vote on
 * - optionIds: array of selected option IDs (supports single or multiple choice)
 * - userId: optional current user ID; if omitted, reads from Supabase auth session
 * - checkDuplicate: when true (default), prevents duplicate voting per user per poll
 *
 * Returns: ApiResponse<{ success: true }>
 */
export async function castVoteClient(
  pollId: string,
  optionIds: string[],
  userId?: string,
  { checkDuplicate = true }: { checkDuplicate?: boolean } = {}
): Promise<ApiResponse<{ success: true }>> {
  return withErrorHandling(async () => {
    if (!pollId) throw new Error("pollId is required");
    if (!optionIds || optionIds.length === 0) throw new Error("At least one option must be selected");

    const supabase = browserSupabase.getClient();

    // Resolve authenticated user if not provided
    if (!userId) {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) throw new UnauthorizedError();
      userId = data.user.id as string;
    } else {
      // Optional: ensure provided userId matches session user
      const { data } = await supabase.auth.getUser();
      if (!data?.user || data.user.id !== userId) throw new UnauthorizedError();
    }

    // Optional duplicate vote check
    if (checkDuplicate) {
      const { data: existingVotes, error: checkError } = await supabase
        .from("votes")
        .select("id")
        .eq("poll_id", pollId)
        .eq("voter_id", userId)
        .limit(1);

      if (checkError) throw checkError;
      if (existingVotes && existingVotes.length > 0) {
        throw new Error("You have already voted on this poll");
      }
    }

    const votes = optionIds.map((optionId) => ({
      poll_id: pollId,
      option_id: optionId,
      voter_id: userId!,
    }));

    const { error } = await supabase.from("votes").insert(votes);
    if (error) throw error;

    return { success: true } as const;
  });
}

/**
 * Retrieve poll results (option vote counts) on the client.
 *
 * Inputs:
 * - pollId: ID of the poll to fetch results for
 *
 * Returns: ApiResponse<{ pollId: string; options: PollOptionResult[] }>
 */
export async function getPollResultsClient(
  pollId: string
): Promise<ApiResponse<{ pollId: string; options: PollOptionResult[] }>> {
  return withErrorHandling(async () => {
    if (!pollId) throw new Error("pollId is required");

    const supabase = browserSupabase.getClient();

    const { data, error } = await supabase
      .from("polls")
      .select(`
        id,
        poll_options (
          id,
          option_text,
          votes (count)
        )
      `)
      .eq("id", pollId)
      .single();

    if (error) throw error;
    if (!data) throw new Error("Poll not found");

    const options: PollOptionResult[] = (data.poll_options || []).map((opt: any) => ({
      id: opt.id,
      option_text: opt.option_text,
      count: Array.isArray(opt.votes) && opt.votes[0] ? Number(opt.votes[0].count || 0) : 0,
    }));

    return { pollId: data.id, options };
  });
}
