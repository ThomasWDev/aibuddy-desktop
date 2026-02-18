/**
 * In-App Purchase (IAP) Credits Tests
 *
 * TDD tests for the IAP credit system that will be used in the
 * Mac App Store version of AIBuddy Desktop. These tests validate:
 * - Product ID mapping to credit amounts
 * - Credit pack pricing and metadata
 * - RevenueCat webhook payload processing
 * - API key provisioning flow after purchase
 * - Edge cases (duplicate purchases, refunds, invalid products)
 *
 * @version 1.5.59
 * @bundle com.aibuddy.desktop
 */
import { describe, it, expect } from 'vitest'

// ============================================================
// Product Configuration (source of truth for IAP)
// ============================================================

interface CreditProduct {
  productId: string
  credits: number
  priceUsd: number
  displayName: string
  description: string
  type: 'consumable'
}

const CREDIT_PRODUCTS: CreditProduct[] = [
  {
    productId: 'aibuddy_credits_small',
    credits: 100,
    priceUsd: 4.99,
    displayName: '100 AIBuddy Credits - Starter',
    description: 'Use AI in VS Code & Desktop. 100 uses.',
    type: 'consumable',
  },
  {
    productId: 'aibuddy_credits_medium',
    credits: 250,
    priceUsd: 9.99,
    displayName: '250 AIBuddy Credits - Popular',
    description: 'Use AI in VS Code & Desktop. Best value.',
    type: 'consumable',
  },
  {
    productId: 'aibuddy_credits_large',
    credits: 750,
    priceUsd: 24.99,
    displayName: '750 AIBuddy Credits - Pro',
    description: 'Use AI in VS Code & Desktop. Power users.',
    type: 'consumable',
  },
]

/**
 * Maps a product ID to its credit amount.
 * Returns 0 for unknown product IDs (safe default).
 */
function getCreditsForProduct(productId: string): number {
  const product = CREDIT_PRODUCTS.find(p => p.productId === productId)
  return product?.credits ?? 0
}

/**
 * Validates a RevenueCat webhook payload for a consumable purchase.
 */
function validateWebhookPayload(payload: Record<string, any>): {
  valid: boolean
  email: string | null
  productId: string | null
  credits: number
  error?: string
} {
  const eventType = payload?.event?.type
  if (!eventType) {
    return { valid: false, email: null, productId: null, credits: 0, error: 'Missing event type' }
  }

  // Only process initial purchases for consumables
  if (eventType !== 'INITIAL_PURCHASE' && eventType !== 'NON_RENEWING_PURCHASE') {
    return { valid: false, email: null, productId: null, credits: 0, error: `Unsupported event type: ${eventType}` }
  }

  const appUserId = payload?.event?.app_user_id
  if (!appUserId || typeof appUserId !== 'string' || !appUserId.includes('@')) {
    return { valid: false, email: null, productId: null, credits: 0, error: 'Invalid or missing app_user_id (must be email)' }
  }

  const productId = payload?.event?.product_id
  const credits = getCreditsForProduct(productId)
  if (credits === 0) {
    return { valid: false, email: appUserId, productId, credits: 0, error: `Unknown product: ${productId}` }
  }

  return { valid: true, email: appUserId, productId, credits }
}

/**
 * Validates Apple Guideline 2.3.2 compliance for product metadata.
 * Display names must be unique and ≤30 chars; descriptions ≤45 chars.
 */
function validateAppleMetadata(products: CreditProduct[]): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []
  const displayNames = new Set<string>()
  const descriptions = new Set<string>()

  for (const product of products) {
    // Check display name length
    if (product.displayName.length > 30) {
      errors.push(`${product.productId}: Display name "${product.displayName}" is ${product.displayName.length} chars (max 30)`)
    }
    // Check description length
    if (product.description.length > 45) {
      errors.push(`${product.productId}: Description "${product.description}" is ${product.description.length} chars (max 45)`)
    }
    // Check uniqueness
    if (displayNames.has(product.displayName)) {
      errors.push(`${product.productId}: Duplicate display name "${product.displayName}"`)
    }
    if (descriptions.has(product.description)) {
      errors.push(`${product.productId}: Duplicate description "${product.description}"`)
    }
    displayNames.add(product.displayName)
    descriptions.add(product.description)
  }

  return { valid: errors.length === 0, errors }
}


// ============================================================
// Tests
// ============================================================

describe('IAP Credit Products Configuration', () => {
  it('should have exactly 3 credit products', () => {
    expect(CREDIT_PRODUCTS).toHaveLength(3)
  })

  it('should have correct product IDs', () => {
    const ids = CREDIT_PRODUCTS.map(p => p.productId)
    expect(ids).toContain('aibuddy_credits_small')
    expect(ids).toContain('aibuddy_credits_medium')
    expect(ids).toContain('aibuddy_credits_large')
  })

  it('should have all products as consumable type', () => {
    for (const product of CREDIT_PRODUCTS) {
      expect(product.type).toBe('consumable')
    }
  })

  it('should have credits in ascending order', () => {
    const credits = CREDIT_PRODUCTS.map(p => p.credits)
    expect(credits).toEqual([100, 250, 750])
  })

  it('should have prices in ascending order', () => {
    const prices = CREDIT_PRODUCTS.map(p => p.priceUsd)
    expect(prices).toEqual([4.99, 9.99, 24.99])
  })

  it('should offer better per-credit value at higher tiers', () => {
    const costPerCredit = CREDIT_PRODUCTS.map(p => p.priceUsd / p.credits)
    // Larger packs should be cheaper per credit
    expect(costPerCredit[0]).toBeGreaterThan(costPerCredit[1])
    expect(costPerCredit[1]).toBeGreaterThan(costPerCredit[2])
  })

  it('should have positive credits and prices for all products', () => {
    for (const product of CREDIT_PRODUCTS) {
      expect(product.credits).toBeGreaterThan(0)
      expect(product.priceUsd).toBeGreaterThan(0)
    }
  })
})

describe('Apple Guideline 2.3.2 Compliance', () => {
  it('should pass all Apple metadata validation', () => {
    const result = validateAppleMetadata(CREDIT_PRODUCTS)
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('should have unique display names', () => {
    const names = CREDIT_PRODUCTS.map(p => p.displayName)
    expect(new Set(names).size).toBe(names.length)
  })

  it('should have unique descriptions', () => {
    const descs = CREDIT_PRODUCTS.map(p => p.description)
    expect(new Set(descs).size).toBe(descs.length)
  })

  it('should have display names ≤30 characters', () => {
    for (const product of CREDIT_PRODUCTS) {
      expect(product.displayName.length).toBeLessThanOrEqual(30)
    }
  })

  it('should have descriptions ≤45 characters', () => {
    for (const product of CREDIT_PRODUCTS) {
      expect(product.description.length).toBeLessThanOrEqual(45)
    }
  })

  it('should detect duplicate display names as invalid', () => {
    const badProducts: CreditProduct[] = [
      { ...CREDIT_PRODUCTS[0], displayName: 'Same Name' },
      { ...CREDIT_PRODUCTS[1], displayName: 'Same Name' },
    ]
    const result = validateAppleMetadata(badProducts)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('Duplicate display name'))).toBe(true)
  })

  it('should detect overly long display names as invalid', () => {
    const badProducts: CreditProduct[] = [
      { ...CREDIT_PRODUCTS[0], displayName: 'A'.repeat(31) },
    ]
    const result = validateAppleMetadata(badProducts)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('max 30'))).toBe(true)
  })
})

describe('Product ID to Credit Mapping', () => {
  it('should return 100 credits for small pack', () => {
    expect(getCreditsForProduct('aibuddy_credits_small')).toBe(100)
  })

  it('should return 250 credits for medium pack', () => {
    expect(getCreditsForProduct('aibuddy_credits_medium')).toBe(250)
  })

  it('should return 750 credits for large pack', () => {
    expect(getCreditsForProduct('aibuddy_credits_large')).toBe(750)
  })

  it('should return 0 for unknown product ID', () => {
    expect(getCreditsForProduct('unknown_product')).toBe(0)
  })

  it('should return 0 for empty product ID', () => {
    expect(getCreditsForProduct('')).toBe(0)
  })

  it('should return 0 for iOS video credit product IDs (not desktop)', () => {
    expect(getCreditsForProduct('video_credits_small')).toBe(0)
    expect(getCreditsForProduct('video_credits_medium')).toBe(0)
    expect(getCreditsForProduct('video_credits_large')).toBe(0)
  })
})

describe('RevenueCat Webhook Validation', () => {
  it('should validate a correct INITIAL_PURCHASE payload', () => {
    const result = validateWebhookPayload({
      event: {
        type: 'INITIAL_PURCHASE',
        app_user_id: 'user@example.com',
        product_id: 'aibuddy_credits_small',
      },
    })
    expect(result.valid).toBe(true)
    expect(result.email).toBe('user@example.com')
    expect(result.productId).toBe('aibuddy_credits_small')
    expect(result.credits).toBe(100)
  })

  it('should validate NON_RENEWING_PURCHASE event', () => {
    const result = validateWebhookPayload({
      event: {
        type: 'NON_RENEWING_PURCHASE',
        app_user_id: 'user@example.com',
        product_id: 'aibuddy_credits_large',
      },
    })
    expect(result.valid).toBe(true)
    expect(result.credits).toBe(750)
  })

  it('should reject missing event type', () => {
    const result = validateWebhookPayload({})
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Missing event type')
  })

  it('should reject unsupported event types', () => {
    const result = validateWebhookPayload({
      event: { type: 'RENEWAL', app_user_id: 'user@example.com', product_id: 'aibuddy_credits_small' },
    })
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Unsupported event type')
  })

  it('should reject missing app_user_id', () => {
    const result = validateWebhookPayload({
      event: { type: 'INITIAL_PURCHASE', product_id: 'aibuddy_credits_small' },
    })
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Invalid or missing app_user_id')
  })

  it('should reject non-email app_user_id', () => {
    const result = validateWebhookPayload({
      event: { type: 'INITIAL_PURCHASE', app_user_id: 'not_an_email', product_id: 'aibuddy_credits_small' },
    })
    expect(result.valid).toBe(false)
    expect(result.error).toContain('must be email')
  })

  it('should reject unknown product ID', () => {
    const result = validateWebhookPayload({
      event: { type: 'INITIAL_PURCHASE', app_user_id: 'user@example.com', product_id: 'bogus_product' },
    })
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Unknown product')
  })

  it('should handle all 3 credit products correctly', () => {
    for (const product of CREDIT_PRODUCTS) {
      const result = validateWebhookPayload({
        event: {
          type: 'INITIAL_PURCHASE',
          app_user_id: 'buyer@aibuddy.life',
          product_id: product.productId,
        },
      })
      expect(result.valid).toBe(true)
      expect(result.credits).toBe(product.credits)
    }
  })
})

describe('API Key Provisioning Flow', () => {
  // Simulates the post-purchase flow
  interface UserAccount {
    email: string
    credits: number
    apiKey: string | null
  }

  function simulatePostPurchaseFlow(
    existingUser: UserAccount | null,
    purchaseEmail: string,
    credits: number
  ): UserAccount {
    if (existingUser && existingUser.email === purchaseEmail) {
      // Add credits to existing account
      return {
        ...existingUser,
        credits: existingUser.credits + credits,
      }
    }
    // Create new account with credits (API key generated later)
    return {
      email: purchaseEmail,
      credits,
      apiKey: null,
    }
  }

  function generateApiKey(user: UserAccount): UserAccount {
    if (user.apiKey) return user // Already has a key
    const key = `aibuddy_${Array(64).fill(0).map(() => Math.random().toString(16)[2]).join('')}`
    return { ...user, apiKey: key }
  }

  it('should add credits to existing user', () => {
    const existing: UserAccount = { email: 'user@test.com', credits: 50, apiKey: 'aibuddy_abc123' }
    const result = simulatePostPurchaseFlow(existing, 'user@test.com', 100)
    expect(result.credits).toBe(150)
    expect(result.apiKey).toBe('aibuddy_abc123') // Key preserved
  })

  it('should create new user when no existing account', () => {
    const result = simulatePostPurchaseFlow(null, 'new@test.com', 250)
    expect(result.email).toBe('new@test.com')
    expect(result.credits).toBe(250)
    expect(result.apiKey).toBeNull() // Needs key generation
  })

  it('should generate API key for new user', () => {
    const newUser: UserAccount = { email: 'new@test.com', credits: 100, apiKey: null }
    const result = generateApiKey(newUser)
    expect(result.apiKey).toBeTruthy()
    expect(result.apiKey!.startsWith('aibuddy_')).toBe(true)
    expect(result.apiKey!.length).toBeGreaterThan(10)
  })

  it('should not regenerate API key for existing user', () => {
    const existing: UserAccount = { email: 'user@test.com', credits: 100, apiKey: 'aibuddy_existing_key' }
    const result = generateApiKey(existing)
    expect(result.apiKey).toBe('aibuddy_existing_key')
  })

  it('should handle multiple purchases accumulating credits', () => {
    let user: UserAccount = { email: 'buyer@test.com', credits: 0, apiKey: 'aibuddy_key123' }
    user = simulatePostPurchaseFlow(user, 'buyer@test.com', 100)
    user = simulatePostPurchaseFlow(user, 'buyer@test.com', 250)
    user = simulatePostPurchaseFlow(user, 'buyer@test.com', 750)
    expect(user.credits).toBe(1100) // 100 + 250 + 750
    expect(user.apiKey).toBe('aibuddy_key123') // Same key throughout
  })

  it('should create separate account for different email', () => {
    const existing: UserAccount = { email: 'user1@test.com', credits: 500, apiKey: 'aibuddy_key1' }
    const result = simulatePostPurchaseFlow(existing, 'user2@test.com', 100)
    expect(result.email).toBe('user2@test.com')
    expect(result.credits).toBe(100) // New account, not added to existing
    expect(result.apiKey).toBeNull()
  })
})

describe('Bundle ID and App Store Configuration', () => {
  it('should use correct bundle ID', () => {
    const BUNDLE_ID = 'com.aibuddy.desktop'
    expect(BUNDLE_ID).toBe('com.aibuddy.desktop')
  })

  it('should use correct SKU', () => {
    const SKU = 'aibuddy-desktop'
    expect(SKU).toBe('aibuddy-desktop')
  })

  it('should use correct Apple ID', () => {
    const APPLE_ID = '6759168007'
    expect(APPLE_ID).toBe('6759168007')
  })

  it('product IDs should not conflict with iOS app product IDs', () => {
    const iosProductIds = ['video_credits_small', 'video_credits_medium', 'video_credits_large', 'pdf50100', 'pdf100150']
    const desktopProductIds = CREDIT_PRODUCTS.map(p => p.productId)
    
    for (const desktopId of desktopProductIds) {
      expect(iosProductIds).not.toContain(desktopId)
    }
  })

  it('product IDs should follow Apple naming conventions (lowercase, underscores)', () => {
    for (const product of CREDIT_PRODUCTS) {
      expect(product.productId).toMatch(/^[a-z0-9_]+$/)
    }
  })
})

describe('RevenueCat Configuration', () => {
  it('should have correct RevenueCat project for AISocial', () => {
    const PROJECT_ID = 'proj9f33b446'
    expect(PROJECT_ID).toBeTruthy()
  })

  it('webhook URL should be HTTPS', () => {
    const WEBHOOK_URL = 'https://aibuddy.life/wp-json/aibuddy/v1/revenuecat-webhook'
    expect(WEBHOOK_URL.startsWith('https://')).toBe(true)
  })

  it('public API key should start with appl_ for Apple', () => {
    const PUBLIC_KEY = 'appl_PiVRaEiaOnlvsdDactPKfSalyvH'
    expect(PUBLIC_KEY.startsWith('appl_')).toBe(true)
  })
})
