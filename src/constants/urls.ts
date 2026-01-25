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
// Lambda Function URL - No timeout limit (up to 15 min), better for long AI requests
export const AIBUDDY_LAMBDA_URL = 'https://2urax4awsopj522tuij6dyo4ce0kvaoh.lambda-url.us-east-2.on.aws'
// API Gateway - Has 29-second timeout limit, use for quick requests only
export const AIBUDDY_API_GATEWAY_URL = 'https://i6f81wuqo0.execute-api.us-east-2.amazonaws.com/dev'

// Use Lambda Function URL for inference (no timeout issues)
export const AIBUDDY_API_BASE_URL = AIBUDDY_LAMBDA_URL
export const AIBUDDY_API_INFERENCE_URL = AIBUDDY_LAMBDA_URL  // Lambda URL handles /v1/inference at root
export const AIBUDDY_API_VALIDATE_KEY_URL = `${AIBUDDY_API_GATEWAY_URL}/v1/validate-key`  // Quick validation can use API Gateway

// Documentation
export const AIBUDDY_DOCS_URL = 'https://aibuddy.life/docs'

// Support
export const AIBUDDY_SUPPORT_EMAIL = 'support@aibuddy.life'

// GitHub
export const AIBUDDY_GITHUB_URL = 'https://github.com/ThomasWDev/aibuddy-desktop'
export const AIBUDDY_RELEASES_URL = 'https://github.com/ThomasWDev/aibuddy-desktop/releases'

// Desktop download page
export const AIBUDDY_DESKTOP_DOWNLOAD_URL = 'https://denvermobileappdeveloper.com/aibuddy-desktop'

