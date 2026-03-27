---
name: postgres-patterns
description: PostgreSQL patterns for schema design, queries and performance.
origin: ai-platform
---

# PostgreSQL Patterns

Best practices for PostgreSQL.

## Schema Design

- Use appropriate types (not everything is TEXT)
- Use UUIDs for public-facing IDs
- Use SERIAL/BIGSERIAL for internal IDs
- Add created_at and updated_at to every table
- Use ENUM types for fixed status values

## Query Optimization

- Use EXPLAIN ANALYZE to understand query plans
- Add indexes for WHERE and JOIN columns
- Use partial indexes for filtered queries
- Avoid SELECT * in production code
- Use CTEs for complex queries

## Migrations

- One migration per logical change
- Never modify existing migrations
- Add indexes CONCURRENTLY in production
- Test migrations on a copy of production data

## Connection Management

- Use connection pooling (PgBouncer, built-in pool)
- Set appropriate pool sizes
- Handle connection timeouts
- Use transactions for multi-statement operations
