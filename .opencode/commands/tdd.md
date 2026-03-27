---
description: Test-driven development workflow. Write tests first, then implement.
---

# TDD Command

Invokes the **tdd-guide** agent for test-driven development.

## Usage

```
/tdd [feature or fix description]
```

## What It Does

1. Writes a failing test first (RED)
2. Writes minimal implementation to pass (GREEN)
3. Refactors for quality (REFACTOR)
4. Verifies 80%+ coverage

## Example

```
/tdd Add email validation to registration endpoint
```

The TDD guide will write tests, run them to verify they fail, then implement and verify.
