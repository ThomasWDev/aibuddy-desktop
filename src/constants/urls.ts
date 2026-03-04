/**
 * AIBuddy URL Constants
 * 
 * Central place for all AIBuddy URLs used throughout the app.
 * 
 * SECURITY (KAN-193): All AWS infrastructure URLs are loaded from
 * environment variables. Never hardcode raw execute-api, lambda-url,
 * or ELB URLs in source code.
 * 
 * Required env vars (set in .env.local or Electron builder config):
 *   AIBUDDY_ALB_URL        — AWS ALB endpoint (primary, no timeout)
 *   AIBUDDY_APIGW_URL      — API Gateway endpoint (backup, 29s timeout)
 *   AIBUDDY_LAMBDA_URL     — Lambda Function URL (IAM auth)
 *   AIBUDDY_STREAM_URL     — Lambda streaming Function URL
 * 
 * API Architecture (same as VS Code extension):
 * - ALB: HTTP, NO timeout limit (PRIMARY - supports Claude Opus 4.5)
 * - API Gateway: HTTPS, 29-second timeout (BACKUP - for validation only)
 * - Lambda URL: HTTPS, no timeout (403 Forbidden - AWS IAM issue)
 * 
 * The ALB is allowed via CSP in electron/main.ts
 */

// Main website
export const AIBUDDY_WEBSITE = 'https://aibuddy.life'

// Buy credits page
export const AIBUDDY_BUY_CREDITS_URL = 'https://aibuddy.life/pricing'

// API endpoints — loaded from environment variables at build/runtime
// Fallback to empty string forces explicit configuration
const ENV_ALB_URL = process.env.AIBUDDY_ALB_URL || process.env.VITE_AIBUDDY_ALB_URL || ''
const ENV_APIGW_URL = process.env.AIBUDDY_APIGW_URL || process.env.VITE_AIBUDDY_APIGW_URL || ''
const ENV_LAMBDA_URL = process.env.AIBUDDY_LAMBDA_URL || process.env.VITE_AIBUDDY_LAMBDA_URL || ''
const ENV_STREAM_URL = process.env.AIBUDDY_STREAM_URL || process.env.VITE_AIBUDDY_STREAM_URL || ''

export const AIBUDDY_ALB_URL = ENV_ALB_URL
export const AIBUDDY_API_GATEWAY_URL = ENV_APIGW_URL
export const AIBUDDY_LAMBDA_URL = ENV_LAMBDA_URL
export const AIBUDDY_API_STREAM_URL = ENV_STREAM_URL

// Use ALB for inference (NO timeout limit - same as VS Code extension)
export const AIBUDDY_API_BASE_URL = AIBUDDY_ALB_URL
export const AIBUDDY_API_INFERENCE_URL = AIBUDDY_ALB_URL ? `${AIBUDDY_ALB_URL}/` : ''
export const AIBUDDY_API_VALIDATE_KEY_URL = AIBUDDY_ALB_URL ? `${AIBUDDY_ALB_URL}/` : ''
export const AIBUDDY_API_TRANSCRIBE_URL = AIBUDDY_ALB_URL ? `${AIBUDDY_ALB_URL}/` : ''

// Documentation
export const AIBUDDY_DOCS_URL = 'https://aibuddy.life/docs'

// Support
export const AIBUDDY_SUPPORT_EMAIL = 'support@aibuddy.life'

// GitHub
export const AIBUDDY_GITHUB_URL = 'https://github.com/ThomasWDev/aibuddy-desktop'
export const AIBUDDY_RELEASES_URL = 'https://github.com/ThomasWDev/aibuddy-desktop/releases'

// Desktop download page
export const AIBUDDY_DESKTOP_DOWNLOAD_URL = 'https://denvermobileappdeveloper.com/aibuddy-desktop'
