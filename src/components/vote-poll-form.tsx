'use client'

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { usePollVoting } from "@/lib/hooks/use-poll"
import { showErrorToast } from "@/lib/utils/error-handling"

interface VotePollFormProps {
  poll: {
    id: string
    title: string
    is_multiple_choice: boolean
    poll_options: Array<{
      id: string
      option_text: string
    }>
  }
  userId?: string
}

export function VotePollForm({ poll, userId }: VotePollFormProps) {
  const router = useRouter()
  
  // Use our custom hook to manage voting state and logic
  const {
    selectedOptions,
    isSubmitting,
    handleOptionChange,
    handleSubmit,
  } = usePollVoting(poll, userId)

  // Handle rendering based on user authentication status
  if (!userId) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <p className="mb-4">You need to be logged in to vote on this poll.</p>
          <Button
            type="button"
            className="w-full"
            onClick={() => router.push('/login')}
          >
            Login to Vote
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card className="p-6">
        <div className="space-y-4">
          {poll.poll_options.map((option) => (
            <div key={option.id} className="flex items-center space-x-2">
              <input
                type={poll.is_multiple_choice ? "checkbox" : "radio"}
                id={option.id}
                name="poll-option"
                checked={selectedOptions.includes(option.id)}
                onChange={() => handleOptionChange(option.id)}
                disabled={isSubmitting}
                className="w-4 h-4"
              />
              <Label htmlFor={option.id} className="cursor-pointer">
                {option.option_text}
              </Label>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || selectedOptions.length === 0}
          >
            {isSubmitting ? "Submitting..." : "Submit Vote"}
          </Button>
        </div>
      </Card>
    </form>
  )
}
