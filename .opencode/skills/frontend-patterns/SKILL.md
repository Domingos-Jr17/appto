---
name: frontend-patterns
description: Frontend development patterns for React, Next.js, state management and accessibility.
origin: ai-platform
---

# Frontend Patterns

Patterns for modern frontend development.

## Component Design

- Components do one thing
- Props are the API — keep it minimal
- Use composition over inheritance
- Extract reusable logic to custom hooks

## State Management

- Local state for UI-only concerns
- URL state for shareable/filterable views
- Server state with React Query/SWR
- Global state only when truly global

## Performance

- Code-split by route
- Lazy load below-the-fold content
- Memoize expensive computations
- Avoid unnecessary re-renders (React.memo, useMemo)
- Optimize images (WebAVIF, lazy loading)

## Accessibility

- Semantic HTML first (button, nav, main, article)
- ARIA labels only when semantic HTML is insufficient
- Keyboard navigation works everywhere
- Color contrast meets WCAG AA
- Focus management for modals and transitions

## Forms

- Controlled components
- Schema validation (Zod, react-hook-form)
- Clear error messages near the field
- Accessible labels and error announcements
