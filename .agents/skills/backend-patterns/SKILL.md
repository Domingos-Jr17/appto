---
name: backend-patterns
description: Backend development patterns for APIs, databases, auth and services.
origin: ai-platform
---

# Backend Patterns

Common patterns for backend development.

## Repository Pattern

Encapsulate data access behind an interface:

```typescript
interface UserRepository {
  findAll(filter?: Filter): Promise<User[]>;
  findById(id: string): Promise<User | null>;
  create(data: CreateUserData): Promise<User>;
  update(id: string, data: UpdateUserData): Promise<User>;
  delete(id: string): Promise<void>;
}
```

Business logic depends on the interface, not the storage mechanism.

## Service Layer

- Services contain business logic
- Services are stateless
- Services use repositories for data access
- Services validate input at boundaries

## Middleware Pattern

- Authentication middleware runs first
- Authorization middleware checks permissions
- Validation middleware checks input schemas
- Error handling middleware catches all errors

## Error Handling

- Typed errors (ValidationError, NotFoundError, AuthError)
- Error middleware converts to API responses
- Errors are logged with context (request ID, user ID)
- Error messages do not leak internals

## Database

- Migrations for schema changes (never manual)
- Parameterized queries only
- Connection pooling
- Transactions for multi-step operations
- Indexes on frequently queried columns
