---
description: Configure your preferred package manager (npm/pnpm/yarn/bun)
---

# Package Manager Setup

Configure your preferred package manager for this project or globally.

## Detection Priority

1. **Environment variable**: `AI_PLATFORM_PACKAGE_MANAGER`
2. **Project config**: `.ai/package-manager.json`
3. **package.json**: `packageManager` field
4. **Lock file**: package-lock.json, yarn.lock, pnpm-lock.yaml, bun.lockb
5. **Fallback**: First available (pnpm > bun > yarn > npm)

## Configuration

### Global
```json
// ~/.config/ai-platform/package-manager.json
{
  "packageManager": "pnpm"
}
```

### Project
```json
// .ai/package-manager.json
{
  "packageManager": "bun"
}
```

### Environment Variable

```bash
# Windows (PowerShell)
$env:AI_PLATFORM_PACKAGE_MANAGER = "pnpm"

# macOS/Linux
export AI_PLATFORM_PACKAGE_MANAGER=pnpm
```
