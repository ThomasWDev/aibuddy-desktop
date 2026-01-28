/**
 * Code Quality Standards
 * 
 * The quality standards that all code must meet.
 */

export const CODE_QUALITY_STANDARDS = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💎 CODE QUALITY STANDARDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 🏆 QUALITY HIERARCHY (in order of priority)

1. **Correctness** - Code does what it should (verified by tests)
2. **Reliability** - Code handles edge cases and errors gracefully
3. **Maintainability** - Code is readable, documented, and follows patterns
4. **Performance** - Code is efficient (optimize only after profiling)
5. **Simplicity** - The simplest solution that works is the best solution

## 🚫 NEVER DO THESE

1. **NEVER delete files or comment out code to make things work**
   - ALWAYS FIX the root cause
   - If you must comment code, document WHY with a TODO

2. **NEVER use \`any\` type in TypeScript**
   - Use proper types or generics
   - If truly unknown, use \`unknown\` with type guards

3. **NEVER hardcode secrets or API keys**
   - Use environment variables
   - Use secure credential storage

4. **NEVER ignore errors silently**
   - Log errors with context
   - Handle or propagate appropriately

5. **NEVER skip tests**
   - Every feature needs tests
   - Every bug fix needs a regression test

## ✅ ALWAYS DO THESE

### Type Safety
\`\`\`typescript
// ✅ GOOD - Explicit types
function calculateTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
}

// ❌ BAD - No types
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
}
\`\`\`

### Error Handling
\`\`\`typescript
// ✅ GOOD - Specific error handling
try {
  const user = await fetchUser(id)
  return user
} catch (error) {
  if (error instanceof NotFoundError) {
    throw new UserNotFoundError(\`User \${id} not found\`)
  }
  if (error instanceof NetworkError) {
    throw new ServiceUnavailableError('User service unavailable')
  }
  throw error // Re-throw unknown errors
}

// ❌ BAD - Swallowing errors
try {
  const user = await fetchUser(id)
  return user
} catch (error) {
  return null // Silent failure!
}
\`\`\`

### Documentation
\`\`\`typescript
// ✅ GOOD - JSDoc with examples
/**
 * Validates an email address format.
 * 
 * @param email - The email address to validate
 * @returns true if the email format is valid
 * @throws {TypeError} If email is null or undefined
 * 
 * @example
 * validateEmail('user@example.com') // true
 * validateEmail('invalid-email') // false
 */
function validateEmail(email: string): boolean {
  // Implementation
}

// ❌ BAD - No documentation
function validateEmail(email) {
  // What does this do? What are the edge cases?
}
\`\`\`

### Naming Conventions
\`\`\`typescript
// ✅ GOOD - Descriptive names
const isUserAuthenticated = checkAuthStatus(user)
const formattedDate = formatDateForDisplay(date)
const userPermissions = getUserPermissions(userId)

// ❌ BAD - Cryptic names
const x = check(u)
const d = fmt(date)
const p = get(id)
\`\`\`

## 🔒 SECURITY CHECKLIST

\`\`\`
□ No hardcoded secrets or API keys
□ Input validation on all user data
□ SQL injection prevention (parameterized queries)
□ XSS prevention in web views
□ Proper authentication/authorization
□ Sensitive data encrypted at rest and in transit
□ Dependencies regularly updated
□ Security audit of new code
\`\`\`

## 📐 SOLID PRINCIPLES

1. **S**ingle Responsibility - One class, one purpose
2. **O**pen/Closed - Open for extension, closed for modification
3. **L**iskov Substitution - Subtypes must be substitutable
4. **I**nterface Segregation - Many specific interfaces > one general
5. **D**ependency Inversion - Depend on abstractions, not concretions`

export default CODE_QUALITY_STANDARDS

