---
description: Analyze context window usage across agents, skills, and rules to find optimization opportunities.
---

# Context Budget Optimizer

Analyze your setup's context window consumption and produce actionable recommendations to reduce token overhead.

## Usage

```
/context-budget [--verbose]
```

- Default: summary with top recommendations
- `--verbose`: full breakdown per component

$ARGUMENTS

## What to Do

1. Scan installed rules, skills, agents and commands
2. Estimate token usage per component
3. Detect redundancy and bloat
4. Report with recommendations

## Report Format

```
## Context Budget Report

Total estimated tokens: ~XXK (XX% of 200K window)

### Top Consumers
| Component | Estimated Tokens | % |
|-----------|-----------------|---|
| Rules | XXK | XX% |
| Skills | XXK | XX% |
| Agents | XXK | XX% |

### Recommendations
1. [actionable suggestion]
2. [actionable suggestion]
```
