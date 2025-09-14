/**
 * Poll-related React hooks
 */
import { useState, useEffect } from "react";
import { browserSupabase } from "../supabase";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { 
  Poll, 
  PollOption, 
  PollFormData, 
  PollWithOptions 
} from "../types";

/**
 * Hook for managing poll voting functionality
 */
export function usePollVoting(poll: {
  id: string;
  is_multiple_choice: boolean;
  poll_options: Array<{ id: string; option_text: string }>;
}, userId?: string) {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleOptionChange = (optionId: string) => {
    if (poll.is_multiple_choice) {
      setSelectedOptions(prev => 
        prev.includes(optionId)
          ? prev.filter(id => id !== optionId)
          : [...prev, optionId]
      );
    } else {
      setSelectedOptions([optionId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedOptions.length === 0) {
      toast.error("Please select an option");
      return;
    }

    if (!userId) {
      toast.error("Please log in to vote");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = browserSupabase.getClient();
      
      // Check if user already voted
      const { data: existingVotes } = await supabase
        .from("votes")
        .select("id")
        .eq("poll_id", poll.id)
        .eq("voter_id", userId)
        .limit(1);
        
      if (existingVotes && existingVotes.length > 0) {
        toast.error("You've already voted on this poll");
        setIsSubmitting(false);
        return;
      }
      
      // Submit votes
      const votes = selectedOptions.map(optionId => ({
        poll_id: poll.id,
        option_id: optionId,
        voter_id: userId,
      }));

      const { error } = await supabase
        .from("votes")
        .insert(votes);

      if (error) throw error;

      toast.success("Vote submitted successfully!");
      router.refresh();
    } catch (error) {
      console.error("Error submitting vote:", error);
      toast.error("Failed to submit vote");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    selectedOptions,
    isSubmitting,
    handleOptionChange,
    handleSubmit,
  };
}

/**
 * Hook for managing poll form functionality
 */
export function usePollForm(
  initialData?: PollWithOptions,
  onSuccess?: (poll: Poll) => void
) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [options, setOptions] = useState<string[]>(
    initialData 
      ? initialData.poll_options.map(o => o.option_text)
      : ["", ""]
  );
  const router = useRouter();

  const addOption = () => {
    setOptions(prev => [...prev, ""]);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) return;
    setOptions(prev => {
      const newOptions = [...prev];
      newOptions.splice(index, 1);
      return newOptions;
    });
  };

  const updateOption = (index: number, value: string) => {
    setOptions(prev => {
      const newOptions = [...prev];
      newOptions[index] = value;
      return newOptions;
    });
  };

  return {
    options,
    isSubmitting,
    setIsSubmitting,
    addOption,
    removeOption,
    updateOption,
  };
}

/**
 * Hook for fetching poll data
 */
export function usePollData(pollId: string) {
  const [poll, setPoll] = useState<PollWithOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchPoll = async () => {
      try {
        setLoading(true);
        const supabase = browserSupabase.getClient();
        
        const { data, error } = await supabase
          .from("polls")
          .select(`
            *,
            poll_options (
              id,
              option_text
            )
          `)
          .eq("id", pollId)
          .single();

        if (error) throw error;
        setPoll(data);
      } catch (err) {
        console.error("Error fetching poll:", err);
        setError(err instanceof Error ? err : new Error("Failed to fetch poll"));
      } finally {
        setLoading(false);
      }
    };

    fetchPoll();
  }, [pollId]);

  return { poll, loading, error };
}
