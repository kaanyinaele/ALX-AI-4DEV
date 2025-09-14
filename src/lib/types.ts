/**
 * Application-wide type definitions
 */
import { z } from "zod";
import { pollSchema } from "./schemas/poll";

/**
 * Poll type definitions
 */
export type PollFormData = z.infer<typeof pollSchema>;

export interface Poll {
  id: string;
  title: string;
  description: string | null;
  created_by: string;
  created_at: string;
  is_multiple_choice: boolean;
  is_anonymous: boolean;
  expires_at: string | null;
}

export interface PollOption {
  id: string;
  poll_id: string;
  option_text: string;
  votes?: PollVoteCount[];
}

export interface PollVoteCount {
  count: number;
}

export interface PollWithOptions extends Poll {
  poll_options: PollOption[];
}

export interface PollWithVoteCounts extends Poll {
  poll_options: Array<PollOption & { votes: PollVoteCount[] }>;
}

export interface PollSummary {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  created_by: string;
  poll_options: { count: number }[];
  votes: { count: number }[];
}

export interface Vote {
  id: string;
  poll_id: string;
  option_id: string;
  voter_id: string;
  created_at: string;
}

/**
 * User type definitions (aligned with Supabase)
 */
export interface User {
  id: string;
  email?: string;
}

export interface AuthResponse {
  user: User | null;
  error: string | null;
}

/**
 * Error definitions
 */
export class ApplicationError extends Error {
  constructor(
    message: string,
    public readonly code: string = 'INTERNAL_ERROR',
    public readonly statusCode: number = 500,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApplicationError';
  }
}

export class UnauthorizedError extends ApplicationError {
  constructor(message = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends ApplicationError {
  constructor(message = 'Forbidden') {
    super(message, 'FORBIDDEN', 403);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends ApplicationError {
  constructor(message = 'Not found') {
    super(message, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

/**
 * API response type definitions
 */
export interface ApiResponse<T> {
  data: T | null;
  error: ApplicationError | null;
}
