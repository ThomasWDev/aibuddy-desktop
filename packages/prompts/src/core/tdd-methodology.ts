/**
 * Test-Driven Development (TDD) Methodology
 * 
 * This is the MANDATORY methodology for ALL coding tasks.
 * There are NO exceptions - every code change requires tests first.
 */

export const TDD_METHODOLOGY = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧪 TEST-DRIVEN DEVELOPMENT (TDD) - MANDATORY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## ⚠️ THE TDD OATH - NON-NEGOTIABLE

**"I will not write a single line of production code without first writing a failing test that demands it."**

This is not a suggestion. This is not optional. This is the ONLY way code is written.

## 🔴🟢🔵 THE TDD CYCLE

### 🔴 PHASE 1: RED - Write the Failing Test

**BEFORE touching any production code:**

1. **UNDERSTAND** the requirement completely
   - What is the expected input?
   - What is the expected output?
   - What are the boundary conditions?
   - What errors could occur?

2. **WRITE** a test that:
   - Describes the behavior in plain English
   - Tests ONE specific behavior
   - Is independent of other tests
   - Uses the AAA pattern: Arrange → Act → Assert

3. **RUN** the test - it MUST FAIL
   - If it passes, your test is wrong or the feature exists
   - A test that can't fail is worthless

### 🟢 PHASE 2: GREEN - Make it Pass (Minimum Code)

**Write the MINIMUM code to make the test pass:**

1. **IMPLEMENT** only what the test demands
   - No "while I'm here" additions
   - No premature optimization
   - No speculative generality

2. **RUN** the test - it MUST PASS
   - If it fails, fix the implementation (not the test)
   - Run ALL tests to ensure no regressions

### 🔵 PHASE 3: REFACTOR - Improve the Design

**Now that tests pass, improve the code:**

1. **IDENTIFY** code smells:
   - Duplication (DRY - Don't Repeat Yourself)
   - Long methods (Single Responsibility)
   - Poor naming (Code should read like prose)
   - Magic numbers (Use named constants)

2. **REFACTOR** in small steps
   - One change at a time
   - Run tests after EVERY change
   - If tests fail, revert immediately

## 📝 TEST DESIGN: ZOMBIES METHOD

Design tests covering:

\`\`\`
Z - Zero (empty inputs, null, undefined)
O - One (single item, first element)
M - Many (multiple items, collections)
B - Boundary (edge cases, limits)
I - Interface (API contracts, types)
E - Exceptions (error handling)
S - Simple scenarios (happy path)
\`\`\`

## ✅ VERIFICATION CHECKLIST

Before marking any task complete:

\`\`\`
□ All new code has corresponding tests
□ All tests pass
□ Coverage is >= baseline (ideally improved)
□ Linter passes
□ Type checker passes
□ Code has been self-reviewed
\`\`\`

**Remember: If it's not tested, it's not done. No exceptions.**`

export default TDD_METHODOLOGY

