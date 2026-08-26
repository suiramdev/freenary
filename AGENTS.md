# Working in this repository

**Read [`CONTEXT.md`](CONTEXT.md) first.** Freenary is an open-source, AI-powered personal finance and wealth-management platform. It aggregates banking, investments, assets, liabilities and transactions from multiple providers into a single financial model and uses that model to provide budgeting, portfolio analytics, planning, simulations and AI-assisted financial insights. `CONTEXT.md` is the glossary: the settled definition of each term. Architecture decisions live in `docs/adr/`.

The rest of this file covers how to get a working stack, what every change owes the docs, how to write the pull request, and the code-quality standard.

## Getting a Working Stack

Two paths — Docker Compose or bare Bun.

### Bare Bun (development)

```bash
bun install
bun run db:start          # starts the Postgres container
bun run db:push           # applies the Prisma schema
bun run dev               # starts web (port 3001) + server (port 3000)
```

The server needs `apps/server/.env` with at least `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` and `CORS_ORIGIN`. The web app needs `VITE_SERVER_URL` (defaults to `http://localhost:3000` in dev).

### Docker Compose (production-like)

```bash
bun run docker:up         # builds and starts web + server + postgres
bun run docker:logs       # tail logs
bun run docker:down       # tear down
```

Environment variables are read from each app's `.env` file and overridden in `docker-compose.yml` for container networking.

## Documentation: Ship It With the Change

[`apps/fumadocs`](apps/fumadocs) is the public documentation site (Fumadocs on TanStack Start). It is **part of the change, never a follow-up** — a PR that alters documented behavior and leaves the docs stale is incomplete.

**Update the docs when your change touches any of these:**

- A user-visible flow or screen in `apps/web`.
- A public API route, its input schema, or its auth/permission rules.
- A domain concept or any vocabulary in `packages/db` — the docs quote these verbatim.
- An environment variable, Docker Compose service, or root `package.json` script.
- Architecture a new contributor would have to reverse-engineer from the diff.

Pure refactors, internal helpers, and dependency bumps that change no documented behavior need no docs change. Say so in the PR rather than leaving it ambiguous.

## Pull Request Descriptions: Complete, Then Brief

- **Reviewers skim.** Keep the whole body under ~400 words. Fill every section; pad none.
- **Summary:** at most four sentences — what changed, and what to look at first.
- **Motivation, Drawbacks, Prior art:** at most four short bullets each.
- Don't restate the issue, list changed files, narrate the implementation, or paste command output — reviewers open the diff and the linked issue for that.
- Evidence a reviewer may want but need not read (verification logs, benchmark runs) belongs in a PR comment, not the description.

---

# Ultracite Code Standards

This project uses **Ultracite**, a zero-config preset that enforces strict code quality standards through automated formatting and linting.

## Quick Reference

- **Format code**: `bun x ultracite fix`
- **Check for issues**: `bun x ultracite check`
- **Diagnose setup**: `bun x ultracite doctor`

Oxlint + Oxfmt (the underlying engine) provides robust linting and formatting. Most issues are automatically fixable.

---

## Core Principles

Write code that is **accessible, performant, type-safe, and maintainable**. Focus on clarity and explicit intent over brevity.

### Type Safety & Explicitness

- Use explicit types for function parameters and return values when they enhance clarity
- Prefer `unknown` over `any` when the type is genuinely unknown
- Use const assertions (`as const`) for immutable values and literal types
- Leverage TypeScript's type narrowing instead of type assertions
- Use meaningful variable names instead of magic numbers - extract constants with descriptive names

### Modern JavaScript/TypeScript

- Use arrow functions for callbacks and short functions
- Prefer `for...of` loops over `.forEach()` and indexed `for` loops
- Use optional chaining (`?.`) and nullish coalescing (`??`) for safer property access
- Prefer template literals over string concatenation
- Use destructuring for object and array assignments
- Use `const` by default, `let` only when reassignment is needed, never `var`

### Async & Promises

- Always `await` promises in async functions - don't forget to use the return value
- Use `async/await` syntax instead of promise chains for better readability
- Handle errors appropriately in async code with try-catch blocks
- Don't use async functions as Promise executors

### React & JSX

- Use function components over class components
- Call hooks at the top level only, never conditionally
- Specify all dependencies in hook dependency arrays correctly
- Use the `key` prop for elements in iterables (prefer unique IDs over array indices)
- Nest children between opening and closing tags instead of passing as props
- Don't define components inside other components
- Use semantic HTML and ARIA attributes for accessibility:
  - Provide meaningful alt text for images
  - Use proper heading hierarchy
  - Add labels for form inputs
  - Include keyboard event handlers alongside mouse events
  - Use semantic elements (`<button>`, `<nav>`, etc.) instead of divs with roles

### Error Handling & Debugging

- Remove `console.log`, `debugger`, and `alert` statements from production code
- Throw `Error` objects with descriptive messages, not strings or other values
- Use `try-catch` blocks meaningfully - don't catch errors just to rethrow them
- Prefer early returns over nested conditionals for error cases

### Code Organization

- Keep functions focused and under reasonable cognitive complexity limits
- Extract complex conditions into well-named boolean variables
- Use early returns to reduce nesting
- Prefer simple conditionals over nested ternary operators
- Group related code together and separate concerns

### Code Comments: Document the "Why", Briefly

- **Prefer self-explanatory code first.** Clear naming, simple structure, and readable control flow should carry the meaning — reach for a comment only when the code genuinely can't.
- When writing or modifying code driven by a design doc or non-obvious constraint, add a comment explaining **why** the code behaves the way it does (safety constraint, compatibility shim, design-doc rule).
- Keep comments short — one or two lines. Capture only the non-obvious reason.
- Don't restate what the code does, narrate the mechanism, cite design-doc sections verbatim, or explain adjacent API choices unless they're the point.
- A comment longer than three lines is a smell: the code may need simplifying, or the explanation belongs in `docs/` rather than inline.

### Security

- Add `rel="noopener"` when using `target="_blank"` on links
- Avoid `dangerouslySetInnerHTML` unless absolutely necessary
- Don't use `eval()` or assign directly to `document.cookie`
- Validate and sanitize user input

### Performance

- Avoid spread syntax in accumulators within loops
- Use top-level regex literals instead of creating them in loops
- Prefer specific imports over namespace imports
- Avoid barrel files (index files that re-export everything)
- Use proper image components (e.g., Next.js `<Image>`) over `<img>` tags

### Framework-Specific Guidance

**React 19+:**

- Use ref as a prop instead of `React.forwardRef`

---

## Testing

- Write assertions inside `it()` or `test()` blocks
- Avoid done callbacks in async tests - use async/await instead
- Don't use `.only` or `.skip` in committed code
- Keep test suites reasonably flat - avoid excessive `describe` nesting

## When Oxlint + Oxfmt Can't Help

Oxlint + Oxfmt's linter will catch most issues automatically. Focus your attention on:

1. **Business logic correctness** - Oxlint + Oxfmt can't validate your algorithms
2. **Meaningful naming** - Use descriptive names for functions, variables, and types
3. **Architecture decisions** - Component structure, data flow, and API design
4. **Edge cases** - Handle boundary conditions and error states
5. **User experience** - Accessibility, performance, and usability considerations
6. **Documentation** - Add comments for complex logic, but prefer self-documenting code

---

Most formatting and common issues are automatically fixed by Oxlint + Oxfmt. Run `bun x ultracite fix` before committing to ensure compliance.

## Agent skills

### Issue tracker

Issues live in GitHub Issues for `suiramdev/freenary`, managed with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical five-role triage vocabulary, label strings equal to role names (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root `CONTEXT.md` + `docs/adr/`. See `docs/agents/domain.md`.
