import { CreatePollForm } from '@/components/create-poll-form'

export default function CreatePollPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Create a New Poll</h1>
      <CreatePollForm />
    </div>
  )
}
