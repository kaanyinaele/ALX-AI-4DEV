import { serverSupabase } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import { EditPollClientPage } from "@/components/edit-poll-client-page"

export default async function EditPollPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = serverSupabase.getClient()

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Fetch poll with options
  const { data: poll, error: pollError } = await supabase
    .from('polls')
    .select(`
      *,
      poll_options (
        id,
        option_text
      )
    `)
    .eq('id', params.id)
    .single()

  if (pollError || !poll) {
    notFound()
  }

  // Check ownership
  if (poll.created_by !== user.id) {
    redirect('/polls')
  }

  return <EditPollClientPage poll={poll} />
}
