import { NextResponse } from "next/server";
import { AppError } from "./app-error";
import { ZodError } from "zod";

/**
 * Centralized error handler for API routes
 * Converts various error types into consistent API responses
 */
export function handleApiError(error: unknown): NextResponse {
  // Custom application errors
  if (error instanceof AppError) {
    return NextResponse.json(error.toJSON(), { status: error.statusCode });
  }

  // Zod validation errors
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: error.errors.map((err) => ({
          path: err.path.join("."),
          message: err.message,
        })),
      },
      { status: 400 }
    );
  }

  // MySQL specific errors
  if (error && typeof error === "object" && "code" in error) {
    const errCode = String((error as any).code);
    if (errCode === "ER_DUP_ENTRY" || errCode === "P2002") {
      return NextResponse.json(
        {
          error: "A record with this unique value already exists",
          code: "DUPLICATE_RECORD",
        },
        { status: 409 }
      );
    }
    if (errCode === "ER_NO_REFERENCED_ROW" || errCode === "ER_NO_REFERENCED_ROW_2" || errCode === "P2003") {
      return NextResponse.json(
        {
          error: "Related record not found",
          code: "FOREIGN_KEY_CONSTRAINT",
        },
        { status: 400 }
      );
    }
  }

  // Generic Error objects
  if (error instanceof Error) {
    const statusCode = (error as any).status || (error as any).statusCode || 500;
    
    const message =
      process.env.NODE_ENV === "production"
        ? "An unexpected error occurred"
        : error.message;

    return NextResponse.json(
      {
        error: message,
        code: "INTERNAL_SERVER_ERROR",
      },
      { status: statusCode }
    );
  }

  // Unknown error types
  return NextResponse.json(
    {
      error: "An unexpected error occurred",
      code: "UNKNOWN_ERROR",
    },
    { status: 500 }
  );
}

/**
 * Async error wrapper for API route handlers
 */
export function asyncHandler(
  handler: (req: Request, context?: any) => Promise<NextResponse>
) {
  return async (req: Request, context?: any) => {
    try {
      return await handler(req, context);
    } catch (error) {
      return handleApiError(error);
    }
  };
}
