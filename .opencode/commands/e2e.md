---
description: Generate and run end-to-end tests for critical user flows.
---

# E2E Command

Invokes the **e2e-runner** agent.

## Usage

```
/e2e [user flow description]
```

## What It Does

1. Identifies the critical user flow
2. Generates E2E tests using the project's framework
3. Uses stable selectors (data-testid, roles)
4. Runs tests and fixes flakiness
