/**
 * Code Quality Standards (Optimized - KAN-33)
 * 
 * Quality standards for all code.
 * Reduced from ~4,000 chars to ~1,800 chars (55% reduction).
 */

export const CODE_QUALITY_STANDARDS = `
## 💎 CODE QUALITY STANDARDS

### Priority Hierarchy
1. **Correctness** - Verified by tests
2. **Reliability** - Handles edge cases gracefully
3. **Maintainability** - Readable, documented, follows patterns
4. **Performance** - Efficient (optimize after profiling)
5. **Simplicity** - Simplest working solution wins

### NEVER Do
- Delete files / comment out code as a workaround - FIX the root cause
- Use \`any\` in TypeScript - use proper types or \`unknown\` with guards
- Hardcode secrets - use environment variables
- Ignore errors silently - log with context, handle or propagate
- Skip tests - every feature and bug fix needs tests

### ALWAYS Do
- Explicit types on function signatures
- Specific error handling (not catch-all swallowing)
- JSDoc/docstrings with examples on public APIs
- Descriptive variable/function names (not x, d, p)

### SOLID Principles
- **S**ingle Responsibility - One class, one purpose
- **O**pen/Closed - Open for extension, closed for modification
- **L**iskov Substitution - Subtypes must be substitutable
- **I**nterface Segregation - Many specific interfaces > one general
- **D**ependency Inversion - Depend on abstractions, not concretions

### Security Checklist
- No hardcoded secrets
- Input validation on all user data
- Parameterized queries (SQL injection prevention)
- XSS prevention in web views
- Dependencies regularly updated`

export default CODE_QUALITY_STANDARDS
