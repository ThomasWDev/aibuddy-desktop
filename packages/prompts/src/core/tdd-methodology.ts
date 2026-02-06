/**
 * Test-Driven Development (TDD) Methodology (Optimized - KAN-33)
 * 
 * MANDATORY for ALL coding tasks. No exceptions.
 * Reduced from ~7,500 chars to ~3,000 chars (60% reduction).
 * Language-specific examples are now injected via generateSystemPrompt()
 * based on the detected project type, instead of including ALL four examples.
 */

export const TDD_METHODOLOGY = `
## 🧪 TEST-DRIVEN DEVELOPMENT (TDD) - MANDATORY

**"I will not write a single line of production code without first writing a failing test."**

### 🔴🟢🔵 THE TDD CYCLE

**🔴 RED** - Write a failing test first
- Understand requirement: expected input, output, boundaries, errors
- Test ONE specific behavior using AAA: Arrange → Act → Assert
- Run it - it MUST fail

**🟢 GREEN** - Write minimum code to pass
- Implement ONLY what the test demands
- Run ALL tests to ensure no regressions

**🔵 REFACTOR** - Improve the design
- Remove duplication, improve naming, extract methods
- Run tests after EVERY change

### 📝 ZOMBIES TEST DESIGN

Cover these scenarios for every feature:
- **Z**ero: empty inputs, null, undefined
- **O**ne: single item, first element
- **M**any: multiple items, collections
- **B**oundary: edge cases, limits, max/min
- **I**nterface: API contracts, type safety
- **E**xceptions: error handling, invalid input
- **S**imple: happy path scenarios

### EXAMPLE (JavaScript/TypeScript - Jest/Vitest)

\`\`\`typescript
describe('calculateTotal', () => {
  it('returns 0 for empty cart', () => {
    expect(calculateTotal([])).toBe(0);
  });
  it('returns price for single item', () => {
    expect(calculateTotal([{ price: 10, qty: 1 }])).toBe(10);
  });
  it('sums multiple items correctly', () => {
    expect(calculateTotal([{ price: 10, qty: 2 }, { price: 5, qty: 3 }])).toBe(35);
  });
  it('throws for negative price', () => {
    expect(() => calculateTotal([{ price: -1, qty: 1 }])).toThrow('Invalid price');
  });
});
\`\`\`

### VERIFICATION CHECKLIST

Before marking ANY task complete:
- [ ] All new code has corresponding tests
- [ ] All tests pass
- [ ] Coverage >= baseline (ideally improved)
- [ ] Linter and type checker pass
- [ ] Tests follow ZOMBIES method

**If it's not tested, it's not done.**`

/**
 * Language-specific TDD examples for conditional inclusion
 * Only the relevant language example is included in the system prompt
 */
export const TDD_EXAMPLES: Record<string, string> = {
  python: `
### Python TDD Example (pytest)
\`\`\`python
class TestCalculateTotal:
    def test_empty_cart(self):
        assert calculate_total([]) == 0
    def test_single_item(self):
        assert calculate_total([{"price": 10, "qty": 1}]) == 10
    def test_negative_price_raises(self):
        with pytest.raises(ValueError, match="Invalid price"):
            calculate_total([{"price": -10, "qty": 1}])
\`\`\``,
  flutter: `
### Flutter/Dart TDD Example (flutter_test)
\`\`\`dart
group('CartService.calculateTotal', () {
  test('returns 0 for empty cart', () {
    expect(CartService().calculateTotal([]), equals(0));
  });
  test('throws for negative price', () {
    expect(() => CartService().calculateTotal([CartItem(price: -1, qty: 1)]),
      throwsA(isA<InvalidPriceException>()));
  });
});
\`\`\``,
  php: `
### PHP TDD Example (PHPUnit)
\`\`\`php
public function test_empty_cart_returns_zero(): void {
    $this->assertEquals(0, $this->cartService->calculateTotal([]));
}
public function test_negative_price_throws(): void {
    $this->expectException(InvalidPriceException::class);
    $this->cartService->calculateTotal([['price' => -10, 'qty' => 1]]);
}
\`\`\``,
  android: `
### Android/Kotlin TDD Example (JUnit)
\`\`\`kotlin
@Test fun \`empty cart returns zero\`() {
    assertEquals(0.0, cartService.calculateTotal(emptyList()))
}
@Test(expected = InvalidPriceException::class)
fun \`negative price throws\`() {
    cartService.calculateTotal(listOf(CartItem(price = -10.0, qty = 1)))
}
\`\`\``,
}

export default TDD_METHODOLOGY
