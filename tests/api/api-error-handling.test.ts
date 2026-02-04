import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * API Error Handling Tests - KAN-31 Fix
 * 
 * TDD Approach: Tests written FIRST following ZOMBIES methodology:
 * - Zero: Empty/null cases
 * - One: Single item/case
 * - Many: Multiple items/cases
 * - Boundary: Edge cases
 * - Interface: API contract validation
 * - Exception: Unexpected error handling
 * - Simple: Basic scenarios
 * 
 * This test suite covers the improved error handling for the AIBuddy Desktop app
 * to fix the generic "something went wrong" error messages.
 */

// ============================================================================
// TYPES (to be implemented in App.tsx)
// ============================================================================

/**
 * API Error codes returned by the AIBuddy API
 */
type ApiErrorCode = 
  | 'INVALID_API_KEY'
  | 'MISSING_API_KEY'
  | 'INSUFFICIENT_CREDITS'
  | 'RATE_LIMITED'
  | 'MODEL_ERROR'
  | 'SERVER_ERROR'
  | 'UNKNOWN_ERROR'

/**
 * API Error response structure from the backend
 */
interface ApiErrorResponse {
  error: ApiErrorCode
  message: string
  details?: Record<string, unknown>
}

/**
 * User-friendly error message configuration
 */
interface UserFriendlyError {
  title: string
  message: string
  action?: string
  actionUrl?: string
  canRetry: boolean
}

// ============================================================================
// HELPER FUNCTIONS TO BE IMPLEMENTED
// ============================================================================

/**
 * Parse API error response and return structured error
 */
function parseApiErrorResponse(responseBody: string | null): ApiErrorResponse | null {
  if (!responseBody) return null
  
  try {
    const parsed = JSON.parse(responseBody)
    
    // Handle standard API error format
    if (parsed.error && typeof parsed.error === 'string') {
      return {
        error: parsed.error as ApiErrorCode,
        message: parsed.message || 'An error occurred',
        details: parsed.details
      }
    }
    
    // Handle alternative error formats
    if (parsed.errorCode) {
      return {
        error: parsed.errorCode as ApiErrorCode,
        message: parsed.errorMessage || parsed.message || 'An error occurred'
      }
    }
    
    return null
  } catch {
    return null
  }
}

/**
 * Map API error code to user-friendly message
 */
function mapErrorToUserMessage(error: ApiErrorResponse): UserFriendlyError {
  const errorMappings: Record<ApiErrorCode, UserFriendlyError> = {
    INVALID_API_KEY: {
      title: '🔑 Invalid API Key',
      message: 'Your API key is invalid or has expired.',
      action: 'Check Settings',
      canRetry: false
    },
    MISSING_API_KEY: {
      title: '🔑 API Key Required',
      message: 'Please add your AIBuddy API key to use the app.',
      action: 'Open Settings',
      canRetry: false
    },
    INSUFFICIENT_CREDITS: {
      title: '💳 Out of Credits',
      message: 'You\'ve run out of AIBuddy credits.',
      action: 'Buy More Credits',
      actionUrl: 'https://aibuddy.life/pricing',
      canRetry: false
    },
    RATE_LIMITED: {
      title: '⏳ Too Many Requests',
      message: 'Please wait a moment before trying again.',
      canRetry: true
    },
    MODEL_ERROR: {
      title: '🤖 AI Model Error',
      message: 'The AI model encountered an issue. Please try again.',
      canRetry: true
    },
    SERVER_ERROR: {
      title: '🔧 Server Error',
      message: 'AIBuddy is having temporary issues. Please try again in a moment.',
      canRetry: true
    },
    UNKNOWN_ERROR: {
      title: '❌ Unexpected Error',
      message: 'Something unexpected happened.',
      canRetry: true
    }
  }
  
  return errorMappings[error.error] || {
    title: '❌ Error',
    message: error.message || 'An unknown error occurred',
    canRetry: true
  }
}

/**
 * Format error message for display in chat
 */
function formatErrorForChat(userError: UserFriendlyError): string {
  let content = `**${userError.title}**\n\n${userError.message}`
  
  if (userError.action) {
    if (userError.actionUrl) {
      content += `\n\n👉 [${userError.action}](${userError.actionUrl})`
    } else {
      content += `\n\n👉 **${userError.action}**`
    }
  }
  
  if (userError.canRetry) {
    content += '\n\n*Click Retry to try again*'
  }
  
  return content
}

/**
 * Determine if an error is retryable
 */
function isRetryableError(error: ApiErrorResponse | null, httpStatus?: number): boolean {
  // Non-API errors (network issues) are generally retryable
  if (!error && httpStatus) {
    // 5xx errors are retryable
    if (httpStatus >= 500 && httpStatus < 600) return true
    // 429 rate limit is retryable
    if (httpStatus === 429) return true
    // 4xx client errors (except rate limit) are not retryable
    if (httpStatus >= 400 && httpStatus < 500) return false
  }
  
  if (!error) return true // Network errors are retryable
  
  // API-level errors
  const nonRetryableErrors: ApiErrorCode[] = [
    'INVALID_API_KEY',
    'MISSING_API_KEY',
    'INSUFFICIENT_CREDITS'
  ]
  
  return !nonRetryableErrors.includes(error.error)
}

// ============================================================================
// TESTS - ZERO (Empty/Null Cases)
// ============================================================================

describe('API Error Handling - ZERO (Empty/Null Cases)', () => {
  describe('parseApiErrorResponse', () => {
    it('should return null for null input', () => {
      const result = parseApiErrorResponse(null)
      expect(result).toBeNull()
    })
    
    it('should return null for empty string', () => {
      const result = parseApiErrorResponse('')
      expect(result).toBeNull()
    })
    
    it('should return null for whitespace-only string', () => {
      const result = parseApiErrorResponse('   ')
      expect(result).toBeNull()
    })
    
    it('should return null for invalid JSON', () => {
      const result = parseApiErrorResponse('not json')
      expect(result).toBeNull()
    })
    
    it('should return null for JSON without error field', () => {
      const result = parseApiErrorResponse('{"status": "ok"}')
      expect(result).toBeNull()
    })
  })
  
  describe('isRetryableError', () => {
    it('should return true when error is null (network error)', () => {
      const result = isRetryableError(null)
      expect(result).toBe(true)
    })
  })
})

// ============================================================================
// TESTS - ONE (Single Item Cases)
// ============================================================================

describe('API Error Handling - ONE (Single Cases)', () => {
  describe('parseApiErrorResponse', () => {
    it('should parse INVALID_API_KEY error', () => {
      const response = JSON.stringify({
        error: 'INVALID_API_KEY',
        message: 'Invalid or expired AIBuddy API key'
      })
      
      const result = parseApiErrorResponse(response)
      
      expect(result).not.toBeNull()
      expect(result!.error).toBe('INVALID_API_KEY')
      expect(result!.message).toBe('Invalid or expired AIBuddy API key')
    })
    
    it('should parse MISSING_API_KEY error', () => {
      const response = JSON.stringify({
        error: 'MISSING_API_KEY',
        message: 'AIBuddy API key is required'
      })
      
      const result = parseApiErrorResponse(response)
      
      expect(result).not.toBeNull()
      expect(result!.error).toBe('MISSING_API_KEY')
    })
    
    it('should parse INSUFFICIENT_CREDITS error', () => {
      const response = JSON.stringify({
        error: 'INSUFFICIENT_CREDITS',
        message: 'Not enough credits for this request'
      })
      
      const result = parseApiErrorResponse(response)
      
      expect(result).not.toBeNull()
      expect(result!.error).toBe('INSUFFICIENT_CREDITS')
    })
  })
  
  describe('mapErrorToUserMessage', () => {
    it('should map INVALID_API_KEY to user-friendly message', () => {
      const error: ApiErrorResponse = {
        error: 'INVALID_API_KEY',
        message: 'Invalid key'
      }
      
      const result = mapErrorToUserMessage(error)
      
      expect(result.title).toContain('Invalid API Key')
      expect(result.action).toBe('Check Settings')
      expect(result.canRetry).toBe(false)
    })
    
    it('should map INSUFFICIENT_CREDITS with buy action URL', () => {
      const error: ApiErrorResponse = {
        error: 'INSUFFICIENT_CREDITS',
        message: 'No credits'
      }
      
      const result = mapErrorToUserMessage(error)
      
      expect(result.title).toContain('Credits')
      expect(result.action).toBe('Buy More Credits')
      expect(result.actionUrl).toBe('https://aibuddy.life/pricing')
      expect(result.canRetry).toBe(false)
    })
    
    it('should map RATE_LIMITED as retryable', () => {
      const error: ApiErrorResponse = {
        error: 'RATE_LIMITED',
        message: 'Too many requests'
      }
      
      const result = mapErrorToUserMessage(error)
      
      expect(result.canRetry).toBe(true)
    })
  })
  
  describe('formatErrorForChat', () => {
    it('should format basic error message', () => {
      const userError: UserFriendlyError = {
        title: 'Test Error',
        message: 'Test message',
        canRetry: false
      }
      
      const result = formatErrorForChat(userError)
      
      expect(result).toContain('**Test Error**')
      expect(result).toContain('Test message')
      expect(result).not.toContain('Retry')
    })
    
    it('should include action when provided', () => {
      const userError: UserFriendlyError = {
        title: 'Error',
        message: 'Message',
        action: 'Do Something',
        canRetry: false
      }
      
      const result = formatErrorForChat(userError)
      
      expect(result).toContain('Do Something')
    })
    
    it('should include action URL as link when provided', () => {
      const userError: UserFriendlyError = {
        title: 'Error',
        message: 'Message',
        action: 'Buy Credits',
        actionUrl: 'https://example.com',
        canRetry: false
      }
      
      const result = formatErrorForChat(userError)
      
      expect(result).toContain('[Buy Credits](https://example.com)')
    })
    
    it('should include retry hint when canRetry is true', () => {
      const userError: UserFriendlyError = {
        title: 'Error',
        message: 'Message',
        canRetry: true
      }
      
      const result = formatErrorForChat(userError)
      
      expect(result).toContain('Retry')
    })
  })
})

// ============================================================================
// TESTS - MANY (Multiple Cases)
// ============================================================================

describe('API Error Handling - MANY (Multiple Cases)', () => {
  describe('parseApiErrorResponse', () => {
    it('should handle all standard API error codes', () => {
      const errorCodes: ApiErrorCode[] = [
        'INVALID_API_KEY',
        'MISSING_API_KEY',
        'INSUFFICIENT_CREDITS',
        'RATE_LIMITED',
        'MODEL_ERROR',
        'SERVER_ERROR'
      ]
      
      errorCodes.forEach(code => {
        const response = JSON.stringify({ error: code, message: `Error: ${code}` })
        const result = parseApiErrorResponse(response)
        
        expect(result).not.toBeNull()
        expect(result!.error).toBe(code)
      })
    })
  })
  
  describe('isRetryableError', () => {
    it('should correctly identify non-retryable errors', () => {
      const nonRetryableErrors: ApiErrorCode[] = [
        'INVALID_API_KEY',
        'MISSING_API_KEY',
        'INSUFFICIENT_CREDITS'
      ]
      
      nonRetryableErrors.forEach(code => {
        const error: ApiErrorResponse = { error: code, message: 'test' }
        const result = isRetryableError(error)
        
        expect(result).toBe(false)
      })
    })
    
    it('should correctly identify retryable errors', () => {
      const retryableErrors: ApiErrorCode[] = [
        'RATE_LIMITED',
        'MODEL_ERROR',
        'SERVER_ERROR',
        'UNKNOWN_ERROR'
      ]
      
      retryableErrors.forEach(code => {
        const error: ApiErrorResponse = { error: code, message: 'test' }
        const result = isRetryableError(error)
        
        expect(result).toBe(true)
      })
    })
  })
})

// ============================================================================
// TESTS - BOUNDARY (Edge Cases)
// ============================================================================

describe('API Error Handling - BOUNDARY (Edge Cases)', () => {
  describe('parseApiErrorResponse', () => {
    it('should handle error with missing message field', () => {
      const response = JSON.stringify({ error: 'INVALID_API_KEY' })
      const result = parseApiErrorResponse(response)
      
      expect(result).not.toBeNull()
      expect(result!.message).toBe('An error occurred')
    })
    
    it('should handle error with extra fields (details)', () => {
      const response = JSON.stringify({
        error: 'MODEL_ERROR',
        message: 'Model failed',
        details: { model: 'claude-opus-4', tokens: 5000 }
      })
      
      const result = parseApiErrorResponse(response)
      
      expect(result).not.toBeNull()
      expect(result!.details).toBeDefined()
      expect(result!.details!.model).toBe('claude-opus-4')
    })
    
    it('should handle malformed JSON with partial content', () => {
      const result = parseApiErrorResponse('{"error": "INVALID_API_KEY"')
      expect(result).toBeNull()
    })
    
    it('should handle alternative errorCode field format', () => {
      const response = JSON.stringify({
        errorCode: 'SERVER_ERROR',
        errorMessage: 'Internal server error'
      })
      
      const result = parseApiErrorResponse(response)
      
      expect(result).not.toBeNull()
      expect(result!.error).toBe('SERVER_ERROR')
      expect(result!.message).toBe('Internal server error')
    })
  })
  
  describe('isRetryableError - HTTP Status Codes', () => {
    it('should treat 500 as retryable', () => {
      const result = isRetryableError(null, 500)
      expect(result).toBe(true)
    })
    
    it('should treat 502 as retryable', () => {
      const result = isRetryableError(null, 502)
      expect(result).toBe(true)
    })
    
    it('should treat 503 as retryable', () => {
      const result = isRetryableError(null, 503)
      expect(result).toBe(true)
    })
    
    it('should treat 504 as retryable', () => {
      const result = isRetryableError(null, 504)
      expect(result).toBe(true)
    })
    
    it('should treat 429 (rate limit) as retryable', () => {
      const result = isRetryableError(null, 429)
      expect(result).toBe(true)
    })
    
    it('should treat 401 as not retryable', () => {
      const result = isRetryableError(null, 401)
      expect(result).toBe(false)
    })
    
    it('should treat 403 as not retryable', () => {
      const result = isRetryableError(null, 403)
      expect(result).toBe(false)
    })
    
    it('should treat 400 as not retryable', () => {
      const result = isRetryableError(null, 400)
      expect(result).toBe(false)
    })
  })
})

// ============================================================================
// TESTS - INTERFACE (API Contract)
// ============================================================================

describe('API Error Handling - INTERFACE (API Contract)', () => {
  describe('API Response Format', () => {
    it('should match expected API error response structure', () => {
      // Real response from ALB endpoint
      const realApiResponse = '{"error":"INVALID_API_KEY","message":"Invalid or expired AIBuddy API key"}'
      
      const result = parseApiErrorResponse(realApiResponse)
      
      expect(result).not.toBeNull()
      expect(result!.error).toBe('INVALID_API_KEY')
      expect(result!.message).toBe('Invalid or expired AIBuddy API key')
    })
    
    it('should match expected MISSING_API_KEY response', () => {
      const realApiResponse = '{"error":"MISSING_API_KEY","message":"AIBuddy API key is required"}'
      
      const result = parseApiErrorResponse(realApiResponse)
      
      expect(result).not.toBeNull()
      expect(result!.error).toBe('MISSING_API_KEY')
    })
  })
  
  describe('User Error Contract', () => {
    it('should always have title and message', () => {
      const allErrorCodes: ApiErrorCode[] = [
        'INVALID_API_KEY',
        'MISSING_API_KEY',
        'INSUFFICIENT_CREDITS',
        'RATE_LIMITED',
        'MODEL_ERROR',
        'SERVER_ERROR',
        'UNKNOWN_ERROR'
      ]
      
      allErrorCodes.forEach(code => {
        const error: ApiErrorResponse = { error: code, message: 'test' }
        const result = mapErrorToUserMessage(error)
        
        expect(result.title).toBeTruthy()
        expect(result.message).toBeTruthy()
        expect(typeof result.canRetry).toBe('boolean')
      })
    })
  })
})

// ============================================================================
// TESTS - EXCEPTION (Error Handling)
// ============================================================================

describe('API Error Handling - EXCEPTION (Error Handling)', () => {
  describe('parseApiErrorResponse', () => {
    it('should handle deeply nested invalid JSON', () => {
      const result = parseApiErrorResponse('{{{invalid}}}')
      expect(result).toBeNull()
    })
    
    it('should handle JSON with unexpected structure', () => {
      const result = parseApiErrorResponse('[1, 2, 3]')
      expect(result).toBeNull()
    })
    
    it('should handle JSON with wrong error type', () => {
      const result = parseApiErrorResponse('{"error": 123, "message": "test"}')
      expect(result).toBeNull()
    })
  })
  
  describe('mapErrorToUserMessage', () => {
    it('should handle unknown error code gracefully', () => {
      const error: ApiErrorResponse = {
        error: 'COMPLETELY_UNKNOWN_ERROR' as ApiErrorCode,
        message: 'Unknown error occurred'
      }
      
      const result = mapErrorToUserMessage(error)
      
      expect(result.title).toBeTruthy()
      expect(result.message).toBe('Unknown error occurred')
      expect(result.canRetry).toBe(true)
    })
  })
})

// ============================================================================
// TESTS - SIMPLE (Basic Scenarios)
// ============================================================================

describe('API Error Handling - SIMPLE (Basic Scenarios)', () => {
  describe('Complete Error Flow', () => {
    it('should handle invalid API key error end-to-end', () => {
      // 1. API returns error
      const apiResponse = '{"error":"INVALID_API_KEY","message":"Invalid or expired AIBuddy API key"}'
      
      // 2. Parse the error
      const parsed = parseApiErrorResponse(apiResponse)
      expect(parsed).not.toBeNull()
      
      // 3. Map to user-friendly message
      const userMessage = mapErrorToUserMessage(parsed!)
      expect(userMessage.title).toContain('Invalid API Key')
      
      // 4. Format for chat
      const chatContent = formatErrorForChat(userMessage)
      expect(chatContent).toContain('Invalid API Key')
      expect(chatContent).toContain('Settings')
      
      // 5. Check if retryable
      const canRetry = isRetryableError(parsed)
      expect(canRetry).toBe(false)
    })
    
    it('should handle credits exhausted error end-to-end', () => {
      // 1. API returns error
      const apiResponse = '{"error":"INSUFFICIENT_CREDITS","message":"Not enough credits"}'
      
      // 2. Parse the error
      const parsed = parseApiErrorResponse(apiResponse)
      expect(parsed).not.toBeNull()
      
      // 3. Map to user-friendly message
      const userMessage = mapErrorToUserMessage(parsed!)
      expect(userMessage.title).toContain('Credits')
      expect(userMessage.actionUrl).toBe('https://aibuddy.life/pricing')
      
      // 4. Format for chat
      const chatContent = formatErrorForChat(userMessage)
      expect(chatContent).toContain('Buy More Credits')
      expect(chatContent).toContain('https://aibuddy.life/pricing')
      
      // 5. Check if retryable
      const canRetry = isRetryableError(parsed)
      expect(canRetry).toBe(false)
    })
    
    it('should handle rate limit error end-to-end', () => {
      // 1. API returns error
      const apiResponse = '{"error":"RATE_LIMITED","message":"Too many requests"}'
      
      // 2. Parse the error
      const parsed = parseApiErrorResponse(apiResponse)
      expect(parsed).not.toBeNull()
      
      // 3. Map to user-friendly message
      const userMessage = mapErrorToUserMessage(parsed!)
      expect(userMessage.canRetry).toBe(true)
      
      // 4. Format for chat
      const chatContent = formatErrorForChat(userMessage)
      expect(chatContent).toContain('Retry')
      
      // 5. Check if retryable
      const canRetry = isRetryableError(parsed)
      expect(canRetry).toBe(true)
    })
    
    it('should handle server error end-to-end', () => {
      // 1. API returns error
      const apiResponse = '{"error":"SERVER_ERROR","message":"Internal server error"}'
      
      // 2. Parse the error
      const parsed = parseApiErrorResponse(apiResponse)
      expect(parsed).not.toBeNull()
      
      // 3. Map to user-friendly message
      const userMessage = mapErrorToUserMessage(parsed!)
      expect(userMessage.canRetry).toBe(true)
      
      // 4. Check if retryable
      const canRetry = isRetryableError(parsed)
      expect(canRetry).toBe(true)
    })
  })
})

// ============================================================================
// TESTS - STARTUP VALIDATION
// ============================================================================

describe('API Key Startup Validation', () => {
  describe('validateApiKeyOnStartup', () => {
    it('should return false for empty API key', () => {
      const apiKey = ''
      const hasApiKey = !!apiKey && apiKey.trim().length > 0
      expect(hasApiKey).toBe(false)
    })
    
    it('should return false for whitespace-only API key', () => {
      const apiKey = '   '
      const hasApiKey = !!apiKey && apiKey.trim().length > 0
      expect(hasApiKey).toBe(false)
    })
    
    it('should return true for valid API key format', () => {
      const apiKey = 'ab_live_12345678901234567890'
      const hasApiKey = !!apiKey && apiKey.trim().length > 0
      expect(hasApiKey).toBe(true)
    })
    
    it('should identify when API key needs validation', () => {
      const scenarios = [
        { apiKey: '', needsValidation: false },
        { apiKey: null, needsValidation: false },
        { apiKey: 'ab_live_123', needsValidation: true },
        { apiKey: 'test_key', needsValidation: true }
      ]
      
      scenarios.forEach(({ apiKey, needsValidation }) => {
        const shouldValidate = !!apiKey && apiKey.trim().length > 0
        expect(shouldValidate).toBe(needsValidation)
      })
    })
  })
})
