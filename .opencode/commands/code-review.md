---
description: Review code for quality, security and maintainability.
---

# Code Review Command

Invokes the **code-reviewer** agent.

## Usage

```
/code-review [files or description]
```

## What It Does

1. Reads the specified files or recent changes
2. Checks quality, security, testing and architecture
3. Reports CRITICAL/HIGH/MEDIUM/LOW issues
4. Suggests concrete fixes

## Example

```
/code-review src/api/auth.ts src/api/middleware.ts
```
