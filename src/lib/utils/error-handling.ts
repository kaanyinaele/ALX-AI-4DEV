/**
 * Error handling utilities
 */
import { toast } from "sonner";
import { 
  ApplicationError, 
  UnauthorizedError, 
  ForbiddenError, 
  NotFoundError 
} from "../types";

/**
 * Maps error types to user-friendly messages
 */
const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: "You must be logged in to perform this action",
  FORBIDDEN: "You don't have permission to perform this action",
  NOT_FOUND: "The requested resource was not found",
  VALIDATION_ERROR: "Please check your input and try again",
  INTERNAL_ERROR: "Something went wrong, please try again later",
  DATABASE_ERROR: "Database operation failed, please try again",
};

/**
 * Handles errors consistently throughout the application
 */
export function handleError(error: unknown, logContext?: Record<string, any>): ApplicationError {
  // Already properly formatted error
  if (error instanceof ApplicationError) {
    logError(error, logContext);
    return error;
  }

  // Format other error types
  const formattedError = formatError(error);
  logError(formattedError, logContext);
  return formattedError;
}

/**
 * Formats an unknown error into an ApplicationError
 */
function formatError(error: unknown): ApplicationError {
  // Handle specific error types
  if (error instanceof Error) {
    const message = error.message || "An error occurred";
    
    // Check for specific error messages to categorize
    if (message.includes("auth") && message.includes("unauthorized")) {
      return new UnauthorizedError(message);
    }
    
    if (message.includes("permission") || message.includes("access")) {
      return new ForbiddenError(message);
    }

    if (message.includes("not found") || message.includes("404")) {
      return new NotFoundError(message);
    }

    // Database constraint errors
    if (message.includes("duplicate") || message.includes("unique constraint")) {
      return new ApplicationError(
        "This record already exists",
        "DATABASE_ERROR",
        400
      );
    }

    return new ApplicationError(
      message,
      "INTERNAL_ERROR",
      500
    );
  }

  // Handle string errors
  if (typeof error === "string") {
    return new ApplicationError(error);
  }

  // Default case
  return new ApplicationError("An unknown error occurred");
}

/**
 * Logs error with appropriate context
 */
function logError(error: ApplicationError, additionalContext?: Record<string, any>): void {
  const logData = {
    message: error.message,
    code: error.code,
    statusCode: error.statusCode,
    stack: error.stack,
    ...error.context,
    ...additionalContext,
  };

  // Log to console in development, could be extended to use a logging service
  console.error("[Error]", logData);
}

/**
 * Shows a user-friendly error toast notification
 */
export function showErrorToast(error: unknown): void {
  let message: string;

  if (error instanceof ApplicationError) {
    message = ERROR_MESSAGES[error.code] || error.message;
  } else if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === "string") {
    message = error;
  } else {
    message = "Something went wrong, please try again";
  }

  toast.error(message);
}

/**
 * Wraps an async function with consistent error handling
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  errorHandler?: (error: ApplicationError) => void
): Promise<{ data: T | null; error: ApplicationError | null }> {
  try {
    const data = await fn();
    return { data, error: null };
  } catch (error) {
    const formattedError = handleError(error);
    
    if (errorHandler) {
      errorHandler(formattedError);
    } else {
      showErrorToast(formattedError);
    }

    return { data: null, error: formattedError };
  }
}
