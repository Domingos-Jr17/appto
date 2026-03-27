---
name: coding-standards
description: Universal coding standards and conventions that apply across all languages.
origin: ai-platform
---

# Coding Standards

Always-follow coding standards that apply to every language and framework.

## Core Principles

- **Functions**: small and focused (<50 lines)
- **Files**: focused (<800 lines)
- **Naming**: descriptive, consistent with project conventions
- **Error handling**: at every level, never silently swallow errors
- **Immutability**: create new objects, never mutate existing ones

## File Organization

- Many small files over few large ones
- Organize by feature/domain, not by type
- High cohesion, low coupling
- Related code stays together

## Naming Conventions

- Variables and functions: camelCase (JS/TS) or snake_case (Python)
- Constants: UPPER_SNAKE_CASE
- Files: kebab-case (JS/TS) or snake_case (Python)
- Classes/Types: PascalCase

## Error Handling

- Handle errors at system boundaries
- Provide user-friendly messages in UI code
- Log detailed context server-side
- Use typed errors where the language supports it

## Code Quality

- No deep nesting (>4 levels) — extract to functions
- No hardcoded values — use configuration
- No magic numbers — use named constants
- Readable over clever — optimize for humans
