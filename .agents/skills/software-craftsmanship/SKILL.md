---
name: software-craftsmanship
description: Shared engineering principles for high-quality software development across frontend and backend. Covers clean code, API contract collaboration, Git hygiene, and review discipline.
---

# Software Craftsmanship & Collaboration
- 100% UI USE Tailwind css not base css 
A shared guide for engineers across frontend and backend disciplines to deliver resilient, maintainable, and cohesive software.

## 1. Clean Code & Design Principles
- **Single Responsibility (SRP)**: Each class, component, and function should do exactly one thing well.
- **Fail Fast, Fail Explicitly**: Use guard clauses at the beginning of functions. Handle errors early rather than deeply nesting `if-else` blocks.
- **Self-Documenting Code**: Choose expressive, intention-revealing names for variables, methods, and types. Use comments to explain *why* a design decision was made, not *what* standard code does.
- **Eliminate Dead Code**: Delete unused imports, deprecated stub files, and commented-out code blocks immediately. Rely on Git history for recovery.

## 2. API Contract-First Collaboration
- Treat the API contract as a binding agreement between frontend and backend.
- Agree on endpoint paths, request payloads, response schemas, and status codes before implementation.
- Use explicit data shapes (DTOs/TypeScript interfaces). Never depend on unstructured dictionaries or raw `Map<String, Object>` payloads.
- Maintain backward compatibility where possible. When breaking changes are unavoidable, coordinate synchronously across repos.

## 3. Git Hygiene & Branching Discipline
- **Commit Messages**: Follow Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`). Keep messages concise, imperative, and descriptive.
- **Branch Naming**: Use scoped naming conventions (e.g., `feature/ticket-name`, `fix/issue-description`).
- **Conflict Resolution**: Never force merge or arbitrarily delete code sections during conflicts. Always inspect both incoming and current changes to preserve intended business logic and test coverage.
- **Clean Diffs**: Review `git diff` and `git status` locally before committing to prevent committing merge markers (`<<<<<<<`), debug logs, or accidental files.

## 4. Defensive Coding & Error Resilience
- **Input Boundaries**: Never trust external input. Validate all data on both sides (Frontend for UX, Backend for security & integrity).
- **Graceful Degradation**: Frontend should show informative empty states, skeletons, and actionable toast errors instead of crashing or freezing.
- **Idempotency**: Critical actions (payments, status locks, inventory allocations) should guard against accidental double-submissions with client-side disable states and server-side idempotency tokens.

## 5. Review & Verification Checklist
Before submitting a PR or merging into `develop`/`main`:
1. Build check passes locally without warnings or broken dependencies (`mvn clean test` / `pnpm build`).
2. Automated unit and integration tests run green.
3. No secrets, credentials, or personal API keys committed to source files.
4. Edge cases (null/empty values, network timeouts, unauthorized access) are tested and handled.
