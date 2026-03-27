---
name: api-design
description: REST and GraphQL API design patterns and conventions.
origin: ai-platform
---

# API Design

Patterns for designing clean, consistent APIs.

## REST Conventions

- Resources are nouns, not verbs: `/users`, `/orders`
- HTTP methods: GET=read, POST=create, PUT=replace, PATCH=update, DELETE=remove
- Plural resource names: `/users` not `/user`
- Nested resources for ownership: `/users/:id/orders`
- Query parameters for filtering: `/users?status=active&limit=20`

## Response Format

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "total": 100,
    "limit": 20
  }
}
```

## Error Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is required",
    "details": [
      { "field": "email", "message": "Email is required" }
    ]
  }
}
```

## Versioning

- URL path: `/api/v1/users`
- Or header: `Accept: application/vnd.api.v1+json`
- Pick one and be consistent

## Authentication

- Bearer token in Authorization header
- JWT with short expiry + refresh tokens
- API keys for service-to-service

## Rate Limiting

- Return 429 Too Many Requests
- Include Retry-After header
- Document rate limits in API docs
