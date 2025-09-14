'use client'

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatDistanceToNow } from 'date-fns'
import Link from "next/link"
import { toast } from "sonner"
import { browserSupabase } from "@/lib/supabase/browser"

interface PollProps {
  id: string
  title: string
  description?: string | null
  createdAt: string
  isOwner: boolean
  optionsCount: number
  votesCount: number
}

export function Poll({ id, title, description, createdAt, isOwner, optionsCount, votesCount }: PollProps) {
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this poll?')) return

    const supabase = browserSupabase.getClient()
    const { error } = await supabase
      .from('polls')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Failed to delete poll')
      return
    }

    toast.success('Poll deleted successfully')
    window.location.reload()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <Link href={`/polls/${id}`} className="hover:underline">
            {title}
          </Link>
        </CardTitle>
        <CardDescription>
          Created {formatDistanceToNow(new Date(createdAt))} ago
        </CardDescription>
      </CardHeader>
      <CardContent>
        {description && <p className="text-sm text-gray-500 mb-4">{description}</p>}
        <div className="flex gap-4 text-sm text-gray-500">
          <span>{optionsCount} options</span>
          <span>•</span>
          <span>{votesCount} votes</span>
        </div>
      </CardContent>
      {isOwner && (
        <CardFooter className="flex gap-2 justify-end">
          <Button variant="outline" asChild>
            <Link href={`/polls/${id}/edit`}>Edit</Link>
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            Delete
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
