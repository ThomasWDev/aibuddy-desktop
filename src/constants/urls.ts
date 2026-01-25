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
// AWS Application Load Balancer - PRIMARY (NO timeout limit, can wait for Lambda's full 5-minute timeout)
export const AIBUDDY_ALB_URL = 'http://3.136.220.194'
// API Gateway - BACKUP (has 29-second timeout limit)
export const AIBUDDY_API_GATEWAY_URL = 'https://i6f81wuqo0.execute-api.us-east-2.amazonaws.com/dev'
// Lambda Function URL - DISABLED (403 Forbidden issue - AWS bug)
export const AIBUDDY_LAMBDA_URL = 'https://x6s3kwugl426vmsnv4evh6p2se0kbmke.lambda-url.us-east-2.on.aws'

// Use ALB for inference (no timeout issues)
export const AIBUDDY_API_BASE_URL = AIBUDDY_ALB_URL
export const AIBUDDY_API_INFERENCE_URL = AIBUDDY_ALB_URL  // ALB handles requests at root
export const AIBUDDY_API_VALIDATE_KEY_URL = `${AIBUDDY_API_GATEWAY_URL}/v1/inference`  // API Gateway for quick validation

// Documentation
export const AIBUDDY_DOCS_URL = 'https://aibuddy.life/docs'

// Support
export const AIBUDDY_SUPPORT_EMAIL = 'support@aibuddy.life'

// GitHub
export const AIBUDDY_GITHUB_URL = 'https://github.com/ThomasWDev/aibuddy-desktop'
export const AIBUDDY_RELEASES_URL = 'https://github.com/ThomasWDev/aibuddy-desktop/releases'

// Desktop download page
export const AIBUDDY_DESKTOP_DOWNLOAD_URL = 'https://denvermobileappdeveloper.com/aibuddy-desktop'

