---
description: Remove dead code and consolidate duplicates.
---

# Refactor Clean Command

Invokes the **refactor-cleaner** agent.

## Usage

```
/refactor-clean [files or directory]
```

## What It Does

1. Scans for dead code, unused imports, unused variables
2. Identifies duplicated code patterns
3. Consolidates and cleans up
4. Runs tests to verify no behavior changes
