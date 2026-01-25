/**
 * AIBuddy URL Constants
 * 
 * Central place for all AIBuddy URLs used throughout the app.
 * Update these when URLs change.
 * 
 * IMPORTANT: When changing URLs, only update this file!
 * All other files import from here.
 */

// Main website
export const AIBUDDY_WEBSITE = 'https://aibuddy.life'

// Buy credits page - This is where users purchase AIBuddy credits
// UPDATE THIS URL when the pricing page changes
export const AIBUDDY_BUY_CREDITS_URL = 'https://aibuddy.life/pricing'

// API endpoints
// API Gateway - PRIMARY (HTTPS, works with CSP, 29-second timeout)
export const AIBUDDY_API_GATEWAY_URL = 'https://i6f81wuqo0.execute-api.us-east-2.amazonaws.com/dev'
// AWS Application Load Balancer - BACKUP (HTTP only, blocked by CSP in Electron)
export const AIBUDDY_ALB_URL = 'http://3.136.220.194'
// Lambda Function URL - DISABLED (403 Forbidden issue - AWS bug)
export const AIBUDDY_LAMBDA_URL = 'https://x6s3kwugl426vmsnv4evh6p2se0kbmke.lambda-url.us-east-2.on.aws'

// Use API Gateway for inference (HTTPS, works with CSP)
// Note: API Gateway has 29-second timeout, but most requests complete faster
export const AIBUDDY_API_BASE_URL = AIBUDDY_API_GATEWAY_URL
export const AIBUDDY_API_INFERENCE_URL = `${AIBUDDY_API_GATEWAY_URL}/v1/inference`
export const AIBUDDY_API_VALIDATE_KEY_URL = `${AIBUDDY_API_GATEWAY_URL}/v1/inference`

// Documentation
export const AIBUDDY_DOCS_URL = 'https://aibuddy.life/docs'

// Support
export const AIBUDDY_SUPPORT_EMAIL = 'support@aibuddy.life'

// GitHub
export const AIBUDDY_GITHUB_URL = 'https://github.com/ThomasWDev/aibuddy-desktop'
export const AIBUDDY_RELEASES_URL = 'https://github.com/ThomasWDev/aibuddy-desktop/releases'

// Desktop download page
export const AIBUDDY_DESKTOP_DOWNLOAD_URL = 'https://denvermobileappdeveloper.com/aibuddy-desktop'

