import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { notFound } from "next/navigation"
import { VotePollForm } from "@/components/vote-poll-form"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

interface PollOption {
  id: string
  option_text: string
  votes: Array<{ count: number }>
}

interface Poll {
  id: string
  title: string
  description: string | null
  is_multiple_choice: boolean
  poll_options: PollOption[]
}

export default async function PollPage({
  params,
}: {
  params: { id: string }
}) {
  const cookieStore = cookies()
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // Fetch poll with options and vote count
  const { data: poll, error: pollError } = await supabase
    .from('polls')
    .select(`
      *,
      poll_options (
        id,
        option_text,
        votes (count)
      )
    `)
    .eq('id', params.id)
    .single()

  if (pollError || !poll) {
    notFound()
  }

  // Check if user has already voted
  let hasVoted = false
  if (user) {
    const { data: votes } = await supabase
      .from('votes')
      .select('id')
      .eq('poll_id', params.id)
      .eq('voter_id', user.id)
      .limit(1)

    hasVoted = Boolean(votes && votes.length > 0)
  }

  // Calculate total votes
  const totalVotes = poll.poll_options.reduce((sum: number, option: PollOption) => 
    sum + (option.votes?.[0]?.count || 0), 0
  )

  return (
    <div className="max-w-2xl mx-auto py-8">
      <nav className="mb-8">
        <Button 
          variant="outline" 
          size="default" 
          asChild 
          className="hover:bg-muted"
        >
          <Link href="/polls" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Polls
          </Link>
        </Button>
      </nav>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{poll.title}</h1>
          {poll.description && (
            <p className="text-muted-foreground mt-2">{poll.description}</p>
          )}
        </div>

        {hasVoted ? (
          <div>
            <h2 className="text-xl font-semibold mb-4">Results</h2>
            <div className="space-y-4">
              {poll.poll_options.map((option) => {
                const voteCount = option.votes?.[0]?.count || 0
                const percentage = totalVotes > 0 
                  ? Math.round((voteCount / totalVotes) * 100) 
                  : 0

                return (
                  <div key={option.id} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{option.option_text}</span>
                      <span>{voteCount} votes ({percentage}%)</span>
                    </div>
                    <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
              <p className="text-sm text-muted-foreground mt-4">
                Total votes: {totalVotes}
              </p>
            </div>
          </div>
        ) : (
          <VotePollForm
            poll={poll}
            userId={user?.id}
          />
        )}
      </div>
    </div>
  )
}
