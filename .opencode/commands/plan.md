---
description: Create a detailed implementation plan before writing code. Waits for user confirmation.
---

# Plan Command

Invokes the **planner** agent to create a comprehensive implementation plan.

## Usage

```
/plan [feature description]
```

## What It Does

1. Restates your requirements clearly
2. Analyzes the existing codebase
3. Breaks into implementation phases
4. Identifies risks and dependencies
5. Presents the plan and waits for your confirmation

## Example

```
/plan Add user authentication with JWT tokens
```

The planner will analyze your codebase, propose phases, and wait for your "yes" before writing code.
