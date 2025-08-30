'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createClient } from "@/utils/supabase/client"

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
  const [selectedOptions, setSelectedOptions] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const handleOptionChange = (optionId: string) => {
    if (poll.is_multiple_choice) {
      setSelectedOptions(prev => 
        prev.includes(optionId)
          ? prev.filter(id => id !== optionId)
          : [...prev, optionId]
      )
    } else {
      setSelectedOptions([optionId])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (selectedOptions.length === 0) {
      toast.error("Please select an option")
      return
    }

    if (!userId) {
      toast.error("Please log in to vote")
      return
    }

    setIsSubmitting(true)

    try {
      const supabase = createClient()
      const votes = selectedOptions.map(optionId => ({
        poll_id: poll.id,
        option_id: optionId,
        voter_id: userId,
      }))

      const { error } = await supabase
        .from('votes')
        .insert(votes)

      if (error) throw error

      toast.success("Vote submitted successfully!")
      router.refresh()
    } catch (error) {
      console.error("Error submitting vote:", error)
      toast.error("Failed to submit vote")
    } finally {
      setIsSubmitting(false)
    }
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
          {userId ? (
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || selectedOptions.length === 0}
            >
              {isSubmitting ? "Submitting..." : "Submit Vote"}
            </Button>
          ) : (
            <Button
              type="button"
              className="w-full"
              onClick={() => router.push('/login')}
            >
              Login to Vote
            </Button>
          )}
        </div>
      </Card>
    </form>
  )
}
