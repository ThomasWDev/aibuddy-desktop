/**
 * AIBuddy URL Constants
 * 
 * Central place for all AIBuddy URLs used throughout the app.
 * Update these when URLs change.
 * 
 * IMPORTANT: When changing URLs, only update this file!
 * All other files import from here.
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

// Buy credits page - This is where users purchase AIBuddy credits
// UPDATE THIS URL when the pricing page changes
export const AIBUDDY_BUY_CREDITS_URL = 'https://aibuddy.life/pricing'

// API endpoints
// AWS Application Load Balancer - PRIMARY (HTTP, NO timeout limit)
// Same endpoint the VS Code extension uses - supports Claude Opus 4.5 long responses
// IMPORTANT: Use DNS name, not IP - ALB IPs can change!
export const AIBUDDY_ALB_URL = 'http://aibuddy-api-alb-90164252.us-east-2.elb.amazonaws.com'
// API Gateway - BACKUP (HTTPS, 29-second timeout - only for quick validation)
export const AIBUDDY_API_GATEWAY_URL = 'https://i6f81wuqo0.execute-api.us-east-2.amazonaws.com/dev'
// Lambda Function URL - DISABLED (403 Forbidden issue - AWS IAM auth required)
export const AIBUDDY_LAMBDA_URL = 'https://x6s3kwugl426vmsnv4evh6p2se0kbmke.lambda-url.us-east-2.on.aws'

// Use ALB for inference (NO timeout limit - same as VS Code extension)
// This is the fix for Claude Opus 4.5 timeout issues
// Note: Dev mode uses webSecurity: false in Electron to bypass CORS
export const AIBUDDY_API_BASE_URL = AIBUDDY_ALB_URL
export const AIBUDDY_API_INFERENCE_URL = `${AIBUDDY_ALB_URL}/`
// Use ALB for validation too (consistent with inference)
export const AIBUDDY_API_VALIDATE_KEY_URL = `${AIBUDDY_ALB_URL}/`

// Documentation
export const AIBUDDY_DOCS_URL = 'https://aibuddy.life/docs'

// Support
export const AIBUDDY_SUPPORT_EMAIL = 'support@aibuddy.life'

// GitHub
export const AIBUDDY_GITHUB_URL = 'https://github.com/ThomasWDev/aibuddy-desktop'
export const AIBUDDY_RELEASES_URL = 'https://github.com/ThomasWDev/aibuddy-desktop/releases'

// Desktop download page
export const AIBUDDY_DESKTOP_DOWNLOAD_URL = 'https://denvermobileappdeveloper.com/aibuddy-desktop'

