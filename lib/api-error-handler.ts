/**
 * Centralized API Error Handler
 * Provides consistent error responses across all API routes
 */

import { NextResponse } from 'next/server'
import { logger } from './logger'
import { ZodError } from 'zod'

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export interface ErrorResponse {
  error: {
    message: string
    code?: string
    statusCode: number
    details?: any
    timestamp: string
    path?: string
  }
}

/**
 * Handle errors and return appropriate response
 */
export function handleApiError(
  error: unknown,
  path?: string
): NextResponse<ErrorResponse> {
  // Log error for monitoring
  logger.error('API Error', error, { path })

  // Handle known error types
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: {
          message: error.message,
          code: error.code,
          statusCode: error.statusCode,
          details: error.details,
          timestamp: new Date().toISOString(),
          path,
        },
      },
      { status: error.statusCode }
    )
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          statusCode: 400,
          details: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
          timestamp: new Date().toISOString(),
          path,
        },
      },
      { status: 400 }
    )
  }

  // Handle MongoDB errors
  if (error && typeof error === 'object' && 'code' in error) {
    const mongoError = error as any

    // Duplicate key error
    if (mongoError.code === 11000) {
      const field = Object.keys(mongoError.keyPattern || {})[0] || 'field'
      return NextResponse.json(
        {
          error: {
            message: `Duplicate value for ${field}`,
            code: 'DUPLICATE_ERROR',
            statusCode: 409,
            timestamp: new Date().toISOString(),
            path,
          },
        },
        { status: 409 }
      )
    }

    // Validation error
    if (mongoError.name === 'ValidationError') {
      return NextResponse.json(
        {
          error: {
            message: 'Database validation failed',
            code: 'DB_VALIDATION_ERROR',
            statusCode: 400,
            details: Object.values(mongoError.errors || {}).map((err: any) => ({
              field: err.path,
              message: err.message,
            })),
            timestamp: new Date().toISOString(),
            path,
          },
        },
        { status: 400 }
      )
    }
  }

  // Handle JWT errors
  if (error instanceof Error) {
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json(
        {
          error: {
            message: 'Invalid token',
            code: 'INVALID_TOKEN',
            statusCode: 401,
            timestamp: new Date().toISOString(),
            path,
          },
        },
        { status: 401 }
      )
    }

    if (error.name === 'TokenExpiredError') {
      return NextResponse.json(
        {
          error: {
            message: 'Token expired',
            code: 'TOKEN_EXPIRED',
            statusCode: 401,
            timestamp: new Date().toISOString(),
            path,
          },
        },
        { status: 401 }
      )
    }
  }

  // Default error response (500 Internal Server Error)
  const message = error instanceof Error ? error.message : 'Internal server error'

  return NextResponse.json(
    {
      error: {
        message: process.env.NODE_ENV === 'production'
          ? 'Internal server error'
          : message,
        code: 'INTERNAL_ERROR',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        path,
      },
    },
    { status: 500 }
  )
}

/**
 * Common error factories
 */
export const ApiErrors = {
  notFound: (resource: string = 'Resource') =>
    new ApiError(404, `${resource} not found`, 'NOT_FOUND'),

  unauthorized: (message: string = 'Unauthorized') =>
    new ApiError(401, message, 'UNAUTHORIZED'),

  forbidden: (message: string = 'Forbidden') =>
    new ApiError(403, message, 'FORBIDDEN'),

  badRequest: (message: string = 'Bad request', details?: any) =>
    new ApiError(400, message, 'BAD_REQUEST', details),

  conflict: (message: string = 'Conflict') =>
    new ApiError(409, message, 'CONFLICT'),

  tooManyRequests: (message: string = 'Too many requests') =>
    new ApiError(429, message, 'RATE_LIMIT_EXCEEDED'),

  internal: (message: string = 'Internal server error') =>
    new ApiError(500, message, 'INTERNAL_ERROR'),

  serviceUnavailable: (message: string = 'Service unavailable') =>
    new ApiError(503, message, 'SERVICE_UNAVAILABLE'),
}

/**
 * Async error wrapper for API routes
 */
export function asyncHandler<T extends any[], R>(
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R | NextResponse<ErrorResponse>> => {
    try {
      return await fn(...args)
    } catch (error) {
      return handleApiError(error)
    }
  }
}

