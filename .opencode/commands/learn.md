---
description: Extract reusable patterns from the current session and save as skills.
---

# Learn - Extract Reusable Patterns

Analyze the current session and extract any patterns worth saving as skills.

## Trigger

Run `/learn` at any point during a session when you've solved a non-trivial problem.

## What to Extract

1. **Error Resolution Patterns** — What error, root cause, fix, is it reusable?
2. **Debugging Techniques** — Non-obvious debugging steps, tool combinations
3. **Workarounds** — Library quirks, API limitations, version-specific fixes
4. **Project-Specific Patterns** — Conventions discovered, architecture decisions

## Process

1. Review the session for extractable patterns
2. Identify the most valuable/reusable insight
3. Draft the skill file
4. Ask user to confirm before saving
5. Save to `.ai/skills/learned/[pattern-name].md`

## Notes

- Don't extract trivial fixes (typos, simple syntax errors)
- Focus on patterns that will save time in future sessions
- Keep skills focused — one pattern per skill
