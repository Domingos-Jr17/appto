---
description: Run security review on code, dependencies and configurations.
---

# Security Review Command

Invokes the **security-reviewer** agent.

## Usage

```
/security [files or description]
```

## What It Does

1. Scans for hardcoded secrets and credentials
2. Checks authentication and authorization logic
3. Validates input handling and injection prevention
4. Reviews dependency security
5. Reports CRITICAL issues that must be fixed immediately
