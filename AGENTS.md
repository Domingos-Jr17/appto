# appto-grad

**Stack:** typescript + nextjs

## Development Workflow

1. Plan first — complex tasks require planning
2. TDD — write tests before implementation
3. Review — check quality after changes
4. Verify — run linter, type checker and tests

## Skills

Skills are auto-loaded from `.agents/skills/`.

- api-design — REST and GraphQL API design patterns and conventions.
- backend-patterns — Backend development patterns for APIs, databases, auth and services.
- coding-standards — Universal coding standards and conventions that apply across all languages.
- continuous-learning — Automatically extract reusable patterns from Claude Code sessions and save them as learned skills for future use.
- database-migrations — Database migration best practices for schema changes, data migrations, rollbacks, and zero-downtime deployments across PostgreSQL, MySQL, and common ORMs (Prisma, Drizzle, Kysely, Django, TypeORM, golang-migrate).
- django-tdd — Django testing strategies with pytest-django, TDD methodology, factory_boy, mocking, coverage, and testing Django REST Framework APIs.
- django-verification — "Verification loop for Django projects: migrations, linting, tests with coverage, security scans, and deployment readiness checks before release or PR."
- e2e-testing — End-to-end testing patterns and best practices.
- flutter-testing — Flutter testing patterns including widget tests, unit tests, integration tests, golden tests, mocking, and TDD methodology for Flutter/Dart applications.
- frontend-patterns — Frontend development patterns for React, Next.js, state management and accessibility.
- mcp-server-patterns — Build MCP servers with Node/TypeScript SDK — tools, resources, prompts, Zod validation, stdio vs Streamable HTTP. Use Context7 or official MCP docs for latest API.
- postgres-patterns — PostgreSQL patterns for schema design, queries and performance.
- python-patterns — Pythonic idioms, PEP 8 standards, type hints, and best practices for building robust, efficient, and maintainable Python applications.
- python-testing — Python testing strategies using pytest, TDD methodology, fixtures, mocking, parametrization, and coverage requirements.
- security-review — Security review checklist and patterns for application security.
- security-scan — Scan your Claude Code configuration (.claude/ directory) for security vulnerabilities, misconfigurations, and injection risks using AgentShield. Checks CLAUDE.md, settings.json, MCP servers, hooks, and agent definitions.
- strategic-compact — Strategic context compaction to manage token usage efficiently.
- tdd-workflow — Test-driven development workflow enforcing Red-Green-Refactor with 80%+ coverage.
- verification-loop — Automated verification loop with linter, type checker, tests and coverage.

## Available Agents

- `architect` — Software architecture specialist for system design, scalability and technical decision-making. Use for architectural decisions, design patterns and system structure.
- `build-error-resolver` — Build and type error resolution specialist. Use when build fails or type errors occur. Fixes errors with minimal diffs.
- `code-reviewer` — Expert code reviewer for quality, security and maintainability. Use immediately after writing or modifying code.
- `database-reviewer` — PostgreSQL database specialist for query optimization, schema design, security, and performance. Use PROACTIVELY when writing SQL, creating migrations, designing schemas, or troubleshooting database performance. Incorporates Supabase best practices.
- `doc-updater` — Documentation and codemap specialist. Use for updating docs, codemaps and architecture documentation.
- `docs-lookup` — When the user asks how to use a library, framework, or API or needs up-to-date code examples, use Context7 MCP to fetch current documentation and return answers with examples. Invoke for docs/API/setup questions.
- `e2e-runner` — End-to-end testing specialist. Generates, maintains and runs E2E tests for critical user flows.
- `flutter-reviewer` — Flutter and Dart code reviewer. Reviews Flutter code for widget best practices, state management patterns, Dart idioms, performance pitfalls, accessibility, and clean architecture violations. Library-agnostic.
- `go-reviewer` — Expert Go code reviewer specializing in idiomatic Go, concurrency, error handling and performance.
- `planner` — Expert planning specialist for complex features and refactoring. Use before writing code for implementation planning, architectural changes, or complex refactoring.
- `python-reviewer` — Expert Python code reviewer specializing in Pythonic code, type hints, error handling and performance.
- `refactor-cleaner` — Dead code cleanup and consolidation specialist. Use for removing unused code, duplicates and refactoring.
- `security-reviewer` — Security vulnerability detection and remediation specialist. Use after writing code that handles auth, API endpoints, user input or sensitive data.
- `tdd-guide` — Test-Driven Development specialist enforcing write-tests-first methodology. Use when writing new features, fixing bugs or refactoring code. Ensures 80%+ test coverage.
- `typescript-reviewer` — Expert TypeScript/JavaScript code reviewer specializing in type safety, patterns, testing and modern TS features.

## Security Rules

- Never hardcode secrets — use environment variables
- Validate all inputs at system boundaries
- Use parameterized queries (no string concatenation)
- Run security audit before committing

