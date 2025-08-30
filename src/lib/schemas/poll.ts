import { z } from "zod"

export const pollSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  options: z.array(z.string()).min(2, "At least 2 options are required"),
  isMultipleChoice: z.boolean().default(false),
  isAnonymous: z.boolean().default(false),
  expiresAt: z.date().optional(),
})

export type PollFormData = z.input<typeof pollSchema>
