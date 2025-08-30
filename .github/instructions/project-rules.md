---
description: Core architectural guidelines and patterns for the AI-First Development Platform
globs:
  - "**/*.{ts,tsx}"
alwaysApply: true
---

## Project Overview: AI-First Development Platform
This is a Next.js application that leverages AI capabilities for software development assistance, featuring authentication, real-time collaboration, and AI-powered code generation.

## Technology Stack & Architecture

### Core Technologies
- **Framework**: Next.js 15.x with App Router
- **Database/Auth**: Supabase for authentication and data storage
- **UI Components**: shadcn/ui + Tailwind CSS
- **Form Management**: react-hook-form with zod validation
- **AI Integration**: OpenAI API via server-side implementations

### Directory Structure
```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── signup/
│   ├── api/
│   │   └── ai/
│   └── workspace/
├── components/
│   ├── ui/
│   └── forms/
└── utils/
    ├── supabase/
    └── ai/
```

## Code Patterns & Standards

### 1. Authentication & Authorization
```typescript
// Always use the Supabase SSR client for auth
import { createServerClient } from "@supabase/ssr"

export async function getUser() {
  const supabase = createServerClient(...)
  return await supabase.auth.getUser()
}
```

### 2. Form Implementations
```typescript
// Use react-hook-form with zod validation
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

const formSchema = z.object({
  // Define schema
})

export function MyForm() {
  const form = useForm({
    resolver: zodResolver(formSchema)
  })
}
```

### 3. Database Operations
```typescript
// Use Server Actions for mutations
export async function createWorkspace(data: WorkspaceData) {
  'use server'
  const supabase = createServerClient(...)
  return await supabase
    .from('workspaces')
    .insert(data)
}
```

## Key Rules & Conventions

1. **Authentication Flow**
   - All auth operations must use Supabase SSR methods
   - Protected routes must be under authenticated layouts
   - Use middleware for route protection

2. **Data Fetching**
   - Prefer Server Components for data fetching
   - Use real-time subscriptions for collaborative features
   - Cache strategies must be implemented for AI responses

3. **UI Components**
   - Follow shadcn/ui component patterns
   - Maintain consistent form layouts using Form.tsx
   - Use skeleton loading states for async operations

## Environment Setup
Required environment variables:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
```

## Verification Checklist
- [ ] Server Components used for data fetching
- [ ] Protected routes properly authenticated
- [ ] Form validation implemented with zod
- [ ] Error boundaries present for AI operations
- [ ] Real-time subscriptions properly cleaned up