'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { useState } from 'react'
import { pollSchema, type PollFormData } from '@/lib/schemas/poll'
import { updatePoll } from '@/app/actions/update-poll'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface EditPollFormProps {
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

export function EditPollForm({ poll }: EditPollFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [options, setOptions] = useState(poll.poll_options.map(o => o.option_text))
  const router = useRouter()
  
  const form = useForm<PollFormData>({
    resolver: zodResolver(pollSchema),
    defaultValues: {
      title: poll.title,
      description: poll.description || '',
      options: poll.poll_options.map(o => o.option_text),
      isMultipleChoice: poll.is_multiple_choice,
      isAnonymous: poll.is_anonymous,
      expiresAt: poll.expires_at ? new Date(poll.expires_at) : undefined,
    },
  })

  async function onSubmit(data: PollFormData) {
    try {
      setIsSubmitting(true)
      await updatePoll(poll.id, data)
      toast.success('Poll updated successfully!')
      router.push('/polls')
    } catch (error) {
      toast.error('Failed to update poll')
      console.error('Failed to update poll:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="p-6">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            placeholder="Enter poll title"
            {...form.register('title')}
          />
          {form.formState.errors.title && (
            <p className="text-sm text-red-500">{form.formState.errors.title.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea
            id="description"
            placeholder="Enter poll description"
            {...form.register('description')}
          />
        </div>

        <div className="space-y-4">
          <Label>Options</Label>
          {options.map((_, index) => (
            <div key={index} className="flex gap-2">
              <Input
                placeholder={`Option ${index + 1}`}
                {...form.register(`options.${index}`)}
              />
              {index >= 2 && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    const newOptions = [...options]
                    newOptions.splice(index, 1)
                    setOptions(newOptions)
                    form.setValue('options', newOptions)
                  }}
                >
                  Remove
                </Button>
              )}
            </div>
          ))}
          {form.formState.errors.options && (
            <p className="text-sm text-red-500">{form.formState.errors.options.message}</p>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setOptions([...options, ''])
              form.setValue(`options.${options.length}`, '')
            }}
          >
            Add Option
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <input
            type="checkbox"
            id="isMultipleChoice"
            {...form.register('isMultipleChoice')}
          />
          <Label htmlFor="isMultipleChoice">Allow multiple choices</Label>
        </div>

        <div className="flex items-center gap-4">
          <input
            type="checkbox"
            id="isAnonymous"
            {...form.register('isAnonymous')}
          />
          <Label htmlFor="isAnonymous">Anonymous voting</Label>
        </div>

        <div className="flex gap-4 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/polls')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
