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
// API Gateway - Primary endpoint, 29-second timeout (sufficient for most requests)
export const AIBUDDY_API_GATEWAY_URL = 'https://i6f81wuqo0.execute-api.us-east-2.amazonaws.com/dev'
// Lambda Function URL - For future use when timeout issues are resolved
export const AIBUDDY_LAMBDA_URL = 'https://ipekyj4amaxaiguqtyyq2zjxse0rwwlk.lambda-url.us-east-2.on.aws'

// Use API Gateway for all requests (Lambda URL has auth issues currently)
export const AIBUDDY_API_BASE_URL = AIBUDDY_API_GATEWAY_URL
export const AIBUDDY_API_INFERENCE_URL = `${AIBUDDY_API_GATEWAY_URL}/v1/inference`
export const AIBUDDY_API_VALIDATE_KEY_URL = `${AIBUDDY_API_GATEWAY_URL}/v1/inference`  // Use inference endpoint for validation

// Documentation
export const AIBUDDY_DOCS_URL = 'https://aibuddy.life/docs'

// Support
export const AIBUDDY_SUPPORT_EMAIL = 'support@aibuddy.life'

// GitHub
export const AIBUDDY_GITHUB_URL = 'https://github.com/ThomasWDev/aibuddy-desktop'
export const AIBUDDY_RELEASES_URL = 'https://github.com/ThomasWDev/aibuddy-desktop/releases'

// Desktop download page
export const AIBUDDY_DESKTOP_DOWNLOAD_URL = 'https://denvermobileappdeveloper.com/aibuddy-desktop'

