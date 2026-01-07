/**
 * Centralized Error Handling Utility
 * Provides consistent error handling across the application
 */

/**
 * Parse API error response
 * @param {Error} error - Axios error object
 * @returns {string} User-friendly error message
 */
export function parseApiError(error) {
  if (!error.response) {
    // Network error
    return 'Network error. Please check your internet connection.';
  }

  const { status, data } = error.response;

  // Extract error message from standardized backend format
  // Backend now returns: { success: false, error: { message, code } }
  const errorMessage = data?.error?.message || data?.error || data?.message;
  const errorCode = data?.error?.code;

  // Handle specific HTTP status codes
  switch (status) {
    case 400:
      return errorMessage || 'Invalid request. Please check your input.';
    case 401:
      // Use backend message for token expiry, fallback for generic auth errors
      return errorMessage || 'Your session has expired. Please login again.';
    case 403:
      return errorMessage || 'You do not have permission to perform this action.';
    case 404:
      return errorMessage || 'The requested resource was not found.';
    case 409:
      // Backend provides specific duplicate entry messages
      return errorMessage || 'This action conflicts with existing data.';
    case 422:
      return errorMessage || 'Validation error. Please check your input.';
    case 429:
      return errorMessage || 'Too many requests. Please try again later.';
    case 500:
      return errorMessage || 'Server error. Please try again later or contact support.';
    case 503:
      return errorMessage || 'Service temporarily unavailable. Please try again later.';
    default:
      return errorMessage || `An error occurred (${status})`;
  }
}

/**
 * Get error code from API response
 * @param {Error} error - Axios error object
 * @returns {string|null} Error code from backend
 */
export function getErrorCode(error) {
  return error.response?.data?.error?.code || null;
}

/**
 * Handle API errors with toast notifications
 * @param {Error} error - Axios error object
 * @param {Function} addToast - Toast notification function
 * @param {string} defaultMessage - Default message if parsing fails
 */
export function handleApiError(error, addToast, defaultMessage = 'An error occurred') {
  const message = parseApiError(error);
  addToast(message, 'error');

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('API Error:', error);
  }

  // TODO: Send to error logging service in production
  // if (process.env.NODE_ENV === 'production') {
  //   logErrorToService(error);
  // }
}

/**
 * Retry failed API calls with exponential backoff
 * @param {Function} apiCall - Function that returns a Promise
 * @param {number} maxRetries - Maximum number of retry attempts
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {Promise} Result of the API call
 */
export async function retryApiCall(apiCall, maxRetries = 3, baseDelay = 1000) {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error;

      // Don't retry on client errors (4xx)
      if (error.response?.status >= 400 && error.response?.status < 500) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries - 1) {
        throw error;
      }

      // Exponential backoff: 1s, 2s, 4s, etc.
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Validate form data
 * @param {Object} data - Form data to validate
 * @param {Object} rules - Validation rules
 * @returns {Object} { isValid: boolean, errors: Object }
 */
export function validateForm(data, rules) {
  const errors = {};

  for (const [field, validators] of Object.entries(rules)) {
    const value = data[field];

    for (const validator of validators) {
      const error = validator(value, field);
      if (error) {
        errors[field] = error;
        break; // Stop at first error for this field
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Common validators
 */
export const validators = {
  required: (value, fieldName) => {
    if (value === null || value === undefined || value === '') {
      return `${fieldName} is required`;
    }
    return null;
  },

  email: (value) => {
    if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return 'Invalid email format';
    }
    return null;
  },

  phone: (value) => {
    if (value && !/^\d{10}$/.test(value.replace(/[-\s]/g, ''))) {
      return 'Invalid phone number (10 digits required)';
    }
    return null;
  },

  minLength: (min) => (value) => {
    if (value && value.length < min) {
      return `Minimum ${min} characters required`;
    }
    return null;
  },

  maxLength: (max) => (value) => {
    if (value && value.length > max) {
      return `Maximum ${max} characters allowed`;
    }
    return null;
  },

  numeric: (value) => {
    if (value && isNaN(value)) {
      return 'Must be a number';
    }
    return null;
  },

  positive: (value) => {
    if (value && Number(value) <= 0) {
      return 'Must be a positive number';
    }
    return null;
  }
};

/**
 * Log error to external service (placeholder)
 * @param {Error} error - Error object
 * @param {Object} context - Additional context
 */
export function logErrorToService(error, context = {}) {
  // TODO: Implement actual error logging
  // Example with Sentry:
  // Sentry.captureException(error, { extra: context });

  if (process.env.NODE_ENV === 'development') {
    console.error('Would log to service:', error, context);
  }
}

/**
 * Safe JSON parse with fallback
 * @param {string} jsonString - JSON string to parse
 * @param {*} fallback - Fallback value if parsing fails
 * @returns {*} Parsed object or fallback
 */
export function safeJsonParse(jsonString, fallback = null) {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('JSON parse failed:', error);
    }
    return fallback;
  }
}
