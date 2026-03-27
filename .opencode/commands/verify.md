---
description: Run verification loop — execute checks, validate results, fix issues.
---

# Verify Command

Runs a verification loop with checkpoint and retry.

## Usage

```
/verify
```

## What It Does

1. Runs linter, type checker and tests
2. Reports all failures
3. Fixes issues incrementally
4. Re-runs verification after each fix
5. Reports final status
