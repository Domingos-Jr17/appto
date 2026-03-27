---
name: e2e-testing
description: End-to-end testing patterns and best practices.
origin: ai-platform
---

# E2E Testing

Patterns for reliable end-to-end testing.

## Core Principles

- Test user-visible behavior, not implementation
- Use stable selectors (data-testid, roles, labels)
- Each test is independent and self-cleaning
- Avoid flaky tests — use explicit waits, not timeouts

## Selector Priority

1. `getByRole()` — most semantic
2. `getByTestId()` — most stable
3. `getByLabel()` — for forms
4. `getByText()` — for visible text
5. **Never**: CSS selectors, XPath

## Test Structure

```typescript
test('user can create and view a post', async ({ page }) => {
  // Arrange
  await page.goto('/posts');

  // Act
  await page.getByRole('button', { name: 'Create' }).click();
  await page.getByLabel('Title').fill('My Post');
  await page.getByRole('button', { name: 'Save' }).click();

  // Assert
  await expect(page.getByText('My Post')).toBeVisible();
});
```

## Anti-patterns

- No `page.waitForTimeout()` — use `waitForSelector` or `waitForResponse`
- No hardcoded URLs — use base URL config
- No shared state between tests
- No testing implementation details (internal state, CSS classes)
