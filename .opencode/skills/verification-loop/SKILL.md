---
name: verification-loop
description: Automated verification loop with linter, type checker, tests and coverage.
origin: ai-platform
---

# Verification Loop

Run comprehensive checks and auto-fix issues.

## Loop Steps

1. **Lint**: run the project linter
2. **Type check**: run the type checker
3. **Test**: run the full test suite
4. **Coverage**: check coverage meets 80%+
5. **Fix**: address any failures
6. **Re-verify**: run again until clean

## Check Commands (auto-detected)

| Tool | Detection |
|------|-----------|
| Linter | `eslint`, `ruff`, `golangci-lint`, `checkstyle` |
| Type check | `tsc --noEmit`, `mypy`, `go vet` |
| Test | `npm test`, `pytest`, `go test ./...` |
| Coverage | `c8`, `coverage`, `go test -cover` |

## Output Format

```
## Verification Report

| Check | Status | Details |
|-------|--------|---------|
| Lint | PASS | 0 errors |
| Types | FAIL | 2 errors in src/api.ts |
| Tests | PASS | 47/47 passed |
| Coverage | PASS | 87.3% |

## Issues to Fix
- [file:line] TS2322: Type 'string' is not assignable to type 'number'
```
