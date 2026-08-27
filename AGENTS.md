# Working in this repository

**Read [`CONTEXT.md`](CONTEXT.md) first** — the glossary and the settled definition of each term. Architecture decisions live in `docs/adr/`.

The rest of this file covers how to get a working stack, what every change owes the docs, how to write the pull request, and the code-quality standard.

**Contributing:** follow [`.github/CONTRIBUTING.md`](.github/CONTRIBUTING.md). When opening or drafting a pull request, use every section of [`.github/pull_request_template.md`](.github/pull_request_template.md) — Summary, Motivation, Drawbacks, Prior art, Notes — and keep each one short.

## Getting a Working Stack

Two commands give you a workspace you can actually exercise end to end — no external accounts, no GitHub App, no callback URLs to register:

```bash
bun run dev:up     # the whole stack, including a seeded Forgejo instance
bun run dev:seed   # a demo workspace inside it
```

`dev:up` prints the per-worktree URLs, including the forge. Neither command needs a `.env`: the QA identity the seed builds on defaults to `melitta@freenary.local` / `freenary-dev-password`, and `FREENARY_QA_EMAIL` / `FREENARY_QA_PASSWORD` override either half independently. Nothing is defaulted into production — there the two are refused.

After seeding, sign in as that QA user and you have: the dev forge connected as a forge connection, the projects `Demo` and `Playground` each linked to a real repository, the agents `Otto` and `Iris` carrying Briefs and forge grants, a weekly Schedule, and an organization Brief. Re-running converges instead of duplicating, so it is safe at any time; `dev:reset` wipes the volumes and starts over.

**The dev forge is a real forge, not a mock** — `codeberg.org/forgejo/forgejo`, seeded on first boot, reachable at the `forge` URL `dev:up` prints. Connect it by hand with forge type **Forgejo**, that host, and the access token `0123456789abcdef0123456789abcdef01234567`; its web UI signs in as `freenary` / `freenary-dev-password`. The host must be that exact origin — plain `http`, no trailing path — because it is the one origin exempted from the forge-host network guard, and that exemption is inert in production.

Two things the seed deliberately does **not** fake. It stores a model-provider key only when you supply a real one in `FREENARY_SEED_PROVIDER_API_KEY`, so seeded agents exist but are not dispatchable until a provider is connected — a placeholder key would look connected and fail at the provider. And it never invents repository metadata: every link is fetched from the forge, exactly as the link route does.

Full walkthrough, including what each seeded record is for: [Local development](apps/docs/content/docs/self-hosting/local-development.mdx).

## Documentation: Ship It With the Change

[`apps/docs`](apps/docs) is the public documentation site. It is **part of the change, never a follow-up** — a PR that alters documented behavior and leaves the docs stale is incomplete, and reviewers should treat it as such.

**Update the docs when your change touches any of these:**

- A user-visible flow or screen in `apps/web`.
- A public API route, its input schema, or its auth/permission rules.
- A domain concept, status enum, or any vocabulary in `packages/db` — the docs quote these verbatim, so a renamed enum value silently makes a page wrong.
- An environment variable, `compose*.yml` service, or root `package.json` script.
- A model provider or git-forge integration, or the scopes/permissions it needs.
- Architecture a new contributor would have to reverse-engineer from the diff.
- The contributor workflow itself: tooling, tests, hooks, or review expectations.

Pure refactors, internal helpers, and dependency bumps that change no documented behavior need no docs change. Say so in the PR rather than leaving it ambiguous.

**Put it in the right section.** `content/docs/` is split by audience, and the split is what makes the site navigable:

| Section | Audience | Never contains |
| --- | --- | --- |
| `guides/` | Teams using freenary | Env vars, Docker, file paths, package names |
| `self-hosting/` | Operators | Product walkthroughs |
| `integrations/` | Developers wiring it | Internal design rationale |
| `architecture/` | Engineers on the code | Step-by-step instructions |
| `contributing/` | Contributors | Anything an end user needs |

A fact lives in **exactly one** section; everywhere else links to it. Duplicated prose is the failure mode this structure exists to prevent.

**Document what is true, not what is planned.** Read the code before writing the page, quote real names, and never describe a screen, flag, or endpoint that does not exist. If behavior is real in the API but the UI is still a stub, say exactly that in a `<Callout type="info">` and link the reader to what does work — no roadmaps, no dates, no "coming soon".

**Verify it.** `bun run build` in `apps/docs` is the gate, but it is a partial one — measured, not assumed:

| Mistake | `bun run build` |
| --- | --- |
| Missing or malformed frontmatter | Fails |
| Unknown code-fence language | Fails |
| Frontmatter `icon` that is not a real lucide export | **Passes** — renders nothing |
| MDX component not registered in `src/components/mdx.tsx` | **Passes** — renders nothing |

A green build therefore is not proof the page is right. Load the page you changed and look at it. The authoring rules live in [`apps/docs/AGENTS.md`](apps/docs/AGENTS.md), and the reader-facing version is [`apps/docs/content/docs/contributing/writing-docs.mdx`](apps/docs/content/docs/contributing/writing-docs.mdx) — update both together when the conventions change.

## Pull Request Descriptions: Complete, Then Brief

- **Reviewers skim.** A description they have to scroll does not get read, so keep the whole body under ~400 words. Fill every section; pad none.
- **Summary:** at most four sentences — what changed, and what to look at first.
- **Motivation, Drawbacks, Prior art:** at most four short bullets each. Drawbacks and Prior art carry the honest costs and the rejected alternatives, not a sales pitch.
- **Notes:** one line per fact — `Closes #n`, the visual change (or explicitly none), the tests added, the `apps/docs` pages updated (or explicitly none, and why), the short review summary `CONTRIBUTING.md` asks for, and any migration, breaking change, or merge-order constraint.
- Don't restate the issue, list changed files, narrate the implementation, or paste command output — reviewers open the diff and the linked issue for that.
- Evidence a reviewer may want but need not read (verification logs, benchmark runs) belongs in a PR comment, not the description.
- A section that needs a table or a code block is a smell: that detail belongs in the issue, the code, or a comment.

**Review gate.** This rule binds the top-level agent that owns an integration. A subagent returns its result to whoever spawned it and never runs the gate itself; the `reviewer` never invokes another reviewer.

Once an integration is implemented and smoke-tested, the owning agent runs the `reviewer` agent (`.omp/agents/reviewer.md`) over the change before yielding or opening a pull request. It is read-only and returns a `verdict` plus a `findings[]` list; any finding at any severity means `changes_requested`. Fix every finding, then rerun the reviewer. If you believe a finding is wrong, send your counter-evidence back to the reviewer and let it re-judge — never overrule it yourself. The work is not complete until the reviewer returns `approved` with an empty `findings` list.

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

**Next.js:**

- Use Next.js `<Image>` component for images
- Use `next/head` or App Router metadata API for head elements
- Use Server Components for async data fetching instead of async Client Components

**React 19+:**

- Use ref as a prop instead of `React.forwardRef`

**Solid/Svelte/Vue/Qwik:**

- Use `class` and `for` attributes (not `className` or `htmlFor`)

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
