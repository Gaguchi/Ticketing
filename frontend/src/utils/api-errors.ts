/**
 * API Error Handling Utilities
 * 
 * Provides helpers for parsing API errors and generating user-friendly messages
 */

import type { ErrorResponse } from "../types/api";

/**
 * Standard error structure from the API
 * @internal Used for type documentation only
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface ApiError {
  response?: {
    status: number;
    data?: ErrorResponse | any;
  };
  message?: string;
}

/**
 * Parse API error and return user-friendly message
 */
export const parseApiError = (error: any): string => {
  if (!error) {
    return "An unknown error occurred";
  }

  // Handle network errors
  if (!error.response) {
    if (error.message === "Network Error") {
      return "Network error. Please check your internet connection.";
    }
    return error.message || "Connection error. Please try again.";
  }

  const { status, data } = error.response;

  // Handle specific status codes
  switch (status) {
    case 400:
      return parseValidationError(data) || "Invalid request. Please check your input.";
    
    case 401:
      return "You are not authenticated. Please log in.";
    
    case 403:
      return "You don't have permission to perform this action.";
    
    case 404:
      return "The requested resource was not found.";
    
    case 409:
      return data?.error || data?.detail || "A conflict occurred. The resource may already exist.";
    
    case 422:
      return parseValidationError(data) || "Validation failed. Please check your input.";
    
    case 429:
      return "Too many requests. Please wait a moment and try again.";
    
    case 500:
      return "Server error. Please try again later.";
    
    case 502:
    case 503:
    case 504:
      return "Service temporarily unavailable. Please try again later.";
    
    default:
      return data?.error || data?.detail || data?.message || `Error ${status}: Something went wrong.`;
  }
};

/**
 * Parse validation errors from API response
 */
const parseValidationError = (data: any): string | null => {
  if (!data) return null;

  // Handle Django REST framework validation errors
  if (typeof data === "object") {
    // Single error message
    if (data.error || data.detail || data.message) {
      return data.error || data.detail || data.message;
    }

    // Field-specific errors
    const fieldErrors: string[] = [];
    for (const [field, errors] of Object.entries(data)) {
      if (Array.isArray(errors)) {
        fieldErrors.push(`${field}: ${errors.join(", ")}`);
      } else if (typeof errors === "string") {
        fieldErrors.push(`${field}: ${errors}`);
      }
    }

    if (fieldErrors.length > 0) {
      return fieldErrors.join("; ");
    }
  }

  return null;
};

/**
 * Get status code from error
 */
export const getErrorStatus = (error: any): number | null => {
  return error?.response?.status || null;
};

/**
 * Check if error is authentication error
 */
export const isAuthError = (error: any): boolean => {
  const status = getErrorStatus(error);
  return status === 401 || status === 403;
};

/**
 * Check if error is validation error
 */
export const isValidationError = (error: any): boolean => {
  const status = getErrorStatus(error);
  return status === 400 || status === 422;
};

/**
 * Check if error is not found error
 */
export const isNotFoundError = (error: any): boolean => {
  return getErrorStatus(error) === 404;
};

/**
 * Check if error is server error
 */
export const isServerError = (error: any): boolean => {
  const status = getErrorStatus(error);
  return status ? status >= 500 : false;
};

/**
 * Check if error is network error
 */
export const isNetworkError = (error: any): boolean => {
  return !error.response && error.message === "Network Error";
};

/**
 * Format error for logging
 */
export const formatErrorForLog = (error: any, context?: string): string => {
  const status = getErrorStatus(error);
  const message = parseApiError(error);
  const contextStr = context ? `[${context}] ` : "";
  
  return `${contextStr}Error ${status || "NETWORK"}: ${message}`;
};

/**
 * Extract field errors from validation error
 */
export const getFieldErrors = (error: any): Record<string, string[]> => {
  const data = error?.response?.data;
  if (!data || typeof data !== "object") {
    return {};
  }

  const fieldErrors: Record<string, string[]> = {};
  
  for (const [field, errors] of Object.entries(data)) {
    if (Array.isArray(errors)) {
      fieldErrors[field] = errors.map(e => String(e));
    } else if (typeof errors === "string") {
      fieldErrors[field] = [errors];
    }
  }

  return fieldErrors;
};

/**
 * Get user-friendly message for common operations
 */
export const getOperationErrorMessage = (
  operation: "create" | "update" | "delete" | "fetch",
  resourceType: string,
  error: any
): string => {
  const baseMessage = parseApiError(error);
  
  // If we have a specific message, use it
  if (!baseMessage.startsWith("Error")) {
    return baseMessage;
  }

  // Otherwise, provide context-specific message
  switch (operation) {
    case "create":
      return `Failed to create ${resourceType}. ${baseMessage}`;
    case "update":
      return `Failed to update ${resourceType}. ${baseMessage}`;
    case "delete":
      return `Failed to delete ${resourceType}. ${baseMessage}`;
    case "fetch":
      return `Failed to load ${resourceType}. ${baseMessage}`;
    default:
      return baseMessage;
  }
};

/**
 * Retry helper for failed requests
 */
export const shouldRetry = (error: any, attemptNumber: number, maxAttempts = 3): boolean => {
  if (attemptNumber >= maxAttempts) {
    return false;
  }

  const status = getErrorStatus(error);
  
  // Retry on network errors
  if (isNetworkError(error)) {
    return true;
  }

  // Retry on server errors (500+)
  if (isServerError(error)) {
    return true;
  }

  // Retry on rate limiting
  if (status === 429) {
    return true;
  }

  // Retry on service unavailable
  if (status === 503 || status === 504) {
    return true;
  }

  return false;
};

/**
 * Calculate retry delay with exponential backoff
 */
export const getRetryDelay = (attemptNumber: number, baseDelay = 1000): number => {
  return Math.min(baseDelay * Math.pow(2, attemptNumber - 1), 10000);
};
