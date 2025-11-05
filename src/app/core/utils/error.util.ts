import { HttpErrorResponse } from '@angular/common/http';

/**
 * Error handling utilities for consistent error handling across the application.
 * Provides type-safe error checking and formatted error messages.
 */

export interface ApiError {
  statusCode?: number;
  messages?: string[];
  error?: any;
}

/**
 * Checks if an error is a network error (no response from server)
 */
export function isNetworkError(error: any): boolean {
  return !error?.status || 
         error.status === 0 || 
         error.message?.includes('fetch failed') ||
         error.message?.includes('NetworkError') ||
         error.name === 'NetworkError';
}

/**
 * Checks if an error is a timeout error
 */
export function isTimeoutError(error: any): boolean {
  return error?.name === 'TimeoutError' || 
         error?.status === 408 ||
         error?.error?.StatusCode === 408;
}

/**
 * Checks if an error is a client error (4xx status codes)
 */
export function isClientError(error: any): boolean {
  const status = getErrorStatus(error);
  return status >= 400 && status < 500;
}

/**
 * Checks if an error is a server error (5xx status codes)
 */
export function isServerError(error: any): boolean {
  const status = getErrorStatus(error);
  return status >= 500 && status < 600;
}

/**
 * Checks if an error is a "not found" error (404)
 */
export function isNotFoundError(error: any): boolean {
  return getErrorStatus(error) === 404 ||
         error?.error?.StatusCode === 404 ||
         error?.error?.Messages?.some((msg: string) => 
           msg?.toLowerCase().includes('not found')
         );
}

/**
 * Gets the HTTP status code from an error
 * Checks multiple possible error object structures to handle transformed errors
 */
export function getErrorStatus(error: any): number {
  if (error instanceof HttpErrorResponse) {
    return error.status;
  }
  // Check status from multiple possible locations
  if (error?.status) {
    return error.status;
  }
  if (error?.error?.StatusCode) {
    return error.error.StatusCode;
  }
  if (error?.error?.status) {
    return error.error.status;
  }
  // Check if error has status property directly
  if (typeof error === 'object' && 'status' in error) {
    return (error as any).status;
  }
  return 0;
}

/**
 * Gets user-friendly error messages from an error
 */
export function getErrorMessages(error: any): string[] {
  // Handle API error format
  if (error?.error?.Messages && Array.isArray(error.error.Messages)) {
    return error.error.Messages;
  }
  
  // Handle standard error messages
  if (error?.error?.message) {
    return [error.error.message];
  }
  
  if (error?.message) {
    return [error.message];
  }
  
  // Fallback messages based on error type
  if (isNetworkError(error)) {
    return ['Unable to connect to the server. Please check your internet connection.'];
  }
  
  if (isTimeoutError(error)) {
    return ['Request timed out. Please try again.'];
  }
  
  if (isNotFoundError(error)) {
    return ['The requested resource was not found.'];
  }
  
  if (isClientError(error)) {
    return ['Invalid request. Please check your input and try again.'];
  }
  
  if (isServerError(error)) {
    return ['Server error occurred. Please try again later.'];
  }
  
  return ['An unexpected error occurred. Please try again.'];
}

/**
 * Gets a single error message (first message or concatenated)
 */
export function getErrorMessage(error: any): string {
  const messages = getErrorMessages(error);
  return messages.join(' ') || 'An error occurred';
}

/**
 * Formats error for logging
 */
export function formatErrorForLogging(error: any, context?: string): string {
  const status = getErrorStatus(error);
  const messages = getErrorMessages(error);
  const errorType = isNetworkError(error) ? 'Network' :
                    isTimeoutError(error) ? 'Timeout' :
                    isClientError(error) ? 'Client' :
                    isServerError(error) ? 'Server' : 'Unknown';
  
  const contextPrefix = context ? `[${context}] ` : '';
  const statusInfo = status ? ` (Status: ${status})` : '';
  const messagesInfo = messages.length > 0 ? ` - ${messages.join(', ')}` : '';
  
  return `${contextPrefix}${errorType} Error${statusInfo}${messagesInfo}`;
}

/**
 * Checks if an error should trigger a retry
 * Network errors and 5xx errors are typically retryable
 */
export function isRetryableError(error: any): boolean {
  // Don't retry client errors (4xx)
  if (isClientError(error) && !isTimeoutError(error)) {
    return false;
  }
  
  // Retry network errors, timeouts, and server errors
  return isNetworkError(error) || isTimeoutError(error) || isServerError(error);
}

