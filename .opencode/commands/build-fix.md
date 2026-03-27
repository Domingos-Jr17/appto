---
description: Fix build errors and type errors with minimal changes.
---

# Build Fix Command

Invokes the **build-error-resolver** agent.

## Usage

```
/build-fix
```

## What It Does

1. Runs the build command
2. Analyzes each error
3. Fixes one error at a time with minimal diffs
4. Rebuilds after each fix to verify
