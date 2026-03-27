---
description: Save current session state to a dated file so work can be resumed in a future session with full context.
---

# Save Session Command

Capture everything that happened in this session and write it to a dated file.

## When to Use

- End of a work session before closing
- Before hitting context limits
- After solving a complex problem you want to remember

## Process

1. Collect: files modified, what was discussed, errors encountered, decisions made
2. Create `.ai/sessions/` folder if it doesn't exist
3. Write `.ai/sessions/YYYY-MM-DD-session.tmp`
4. Show the file to user for confirmation

## Session File Format

```markdown
# Session: YYYY-MM-DD

**Started:** [time]
**Project:** [project name]
**Topic:** [one-line summary]

## What We Are Building
[1-3 paragraphs]

## What WORKED (with evidence)
- **[thing]** — confirmed by: [evidence]

## What Did NOT Work (and why)
- **[approach]** — failed because: [exact reason]

## What Has NOT Been Tried Yet
- [approach / idea]

## Current State of Files
| File | Status | Notes |
|------|--------|-------|

## Decisions Made
- **[decision]** — reason: [why]

## Blockers
- [blocker]

## Exact Next Step
[most important thing to do when resuming]
```

## Notes

- The "What Did NOT Work" section is the most critical
- File is read-only historical record
- Use short-id filename for same-day collisions: `YYYY-MM-DD-<shortid>-session.tmp`
