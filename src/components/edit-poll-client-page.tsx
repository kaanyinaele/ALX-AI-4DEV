'use client'

import { EditPollForm } from "@/components/edit-poll-form"

interface EditPollClientPageProps {
  poll: {
    id: string
    title: string
    description: string | null
    is_multiple_choice: boolean
    is_anonymous: boolean
    expires_at: string | null
    poll_options: Array<{
      id: string
      option_text: string
    }>
  }
}

export function EditPollClientPage({ poll }: EditPollClientPageProps) {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Edit Poll</h1>
      <EditPollForm poll={poll} />
    </div>
  )
}
