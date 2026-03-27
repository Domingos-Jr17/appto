---
name: security-review
description: Security review checklist and patterns for application security.
origin: ai-platform
---

# Security Review

Comprehensive security review checklist.

## Authentication
- [ ] Passwords hashed with bcrypt/argon2 (never MD5/SHA1)
- [ ] JWT tokens have short expiry
- [ ] Refresh tokens stored securely
- [ ] No credentials in URLs or logs
- [ ] Multi-factor auth for sensitive operations

## Authorization
- [ ] RBAC enforced on all endpoints
- [ ] Users cannot access other users' data
- [ ] Admin operations require elevated permissions
- [ ] Resource-level authorization (not just endpoint)

## Input Validation
- [ ] All input validated at system boundaries
- [ ] Schema-based validation (Zod, Pydantic, etc.)
- [ ] File uploads: type + size validation
- [ ] No direct use of user input in queries

## Injection Prevention
- [ ] Parameterized SQL queries (never string concatenation)
- [ ] NoSQL injection prevention
- [ ] Command injection prevention
- [ ] XSS prevention (sanitize output)

## Data Protection
- [ ] Sensitive data encrypted at rest
- [ ] TLS enforced in transit
- [ ] PII not in logs or error messages
- [ ] Secrets in environment variables, not code

## Dependencies
- [ ] No known CVEs in dependencies
- [ ] Lock files committed
- [ ] Regular dependency updates
- [ ] Minimal dependency surface
