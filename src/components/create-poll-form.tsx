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
import { createPoll } from '@/app/actions/create-poll'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export function CreatePollForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [options, setOptions] = useState(['', ''])
  const router = useRouter()
  
  const form = useForm<PollFormData>({
    resolver: zodResolver(pollSchema),
    defaultValues: {
      title: '',
      description: '',
      options: ['', ''],
      isMultipleChoice: false,
      isAnonymous: false,
    },
  })

  async function onSubmit(data: PollFormData) {
    try {
      setIsSubmitting(true)
      await createPoll(data)
      toast.success('Poll created successfully!')
      router.push('/polls')
    } catch (error) {
      toast.error('Failed to create poll')
      console.error('Failed to create poll:', error)
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

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Creating...' : 'Create Poll'}
        </Button>
      </form>
    </Card>
  )
}
