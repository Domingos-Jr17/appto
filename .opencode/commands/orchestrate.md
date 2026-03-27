---
description: Orchestrate multiple agents for complex tasks (planning + implementation + review).
---

# Orchestrate Command

Multi-agent orchestration that chains planning, implementation and review.

## Usage

```
/orchestrate [complex task description]
```

## What It Does

1. **planner** analyzes and creates implementation plan
2. **tdd-guide** writes tests and implements
3. **code-reviewer** reviews the result
4. **security-reviewer** checks security if relevant
5. Reports a final summary with all findings

## Example

```
/orchestrate Add payment processing with Stripe integration
```
