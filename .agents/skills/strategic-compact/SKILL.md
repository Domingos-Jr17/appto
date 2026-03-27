---
name: strategic-compact
description: Strategic context compaction to manage token usage efficiently.
origin: ai-platform
---

# Strategic Compact

Manage context window efficiently by compacting at logical intervals.

## When to Compact

- After completing a logical task (feature, fix, refactor)
- After a review cycle completes
- When context usage exceeds 80%
- Before starting a new major task

## What to Preserve

- Current task context
- Active errors or blockers
- Decisions made in this session
- File paths and patterns discovered

## What to Discard

- Completed subtask details
- Old file reads no longer relevant
- Verbose error output already resolved
- Intermediate implementation steps

## How to Compact

1. Summarize what was accomplished
2. List active decisions and context
3. Note what files are open/relevant
4. Discard detailed output of completed steps
5. Keep a clear next-action pointer

## Compaction Prompt

When suggesting compaction, use this format:

```
## Session Summary (compacted)

### Completed
- [what was done]

### Active Context
- [relevant files and decisions]

### Next Step
- [what to do next]
```
