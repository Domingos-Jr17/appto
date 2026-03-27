---
name: tdd-workflow
description: Test-driven development workflow enforcing Red-Green-Refactor with 80%+ coverage.
origin: ai-platform
---

# TDD Workflow

Test-driven development is the default development methodology.

## Mandatory TDD Cycle

### RED: Write a Failing Test
- Describe the expected behavior
- Run the test — it MUST fail
- If it passes, the test is wrong or the feature exists

### GREEN: Minimal Implementation
- Write the simplest code that passes
- Do not optimize or refactor
- Verify test passes

### REFACTOR: Improve Quality
- Clean up implementation
- Keep tests passing
- Remove duplication
- Verify coverage

## Coverage Requirements

- **Minimum**: 80% line coverage
- **Goal**: 90%+ on critical paths
- **Required**: unit + integration tests

## Test Quality Rules

- Test behavior, not implementation
- Each test is independent
- Use descriptive names: `should_return_401_when_token_expired`
- Mock external dependencies
- Use factories for test data
- One assertion per test (preferred)

## When TDD Is Not Practical

- Exploratory prototyping (delete after)
- Configuration files
- Generated code
- One-off scripts

Even in these cases, add tests within the same session.
