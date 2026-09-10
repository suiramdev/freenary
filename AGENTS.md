# Working in this repository

**Read [`CONTEXT.md`](CONTEXT.md) first** — the glossary and the settled definition of each term.

The rest of this file covers how to get a working stack, what every change owes the docs and the message catalogs, how to write the pull request, and the code-quality standard.

**Contributing:** follow [`.github/CONTRIBUTING.md`](.github/CONTRIBUTING.md). When opening or drafting a pull request, use every section of [`.github/pull_request_template.md`](.github/pull_request_template.md) — Summary, Motivation, Drawbacks, Prior art, Notes — and keep each one short.

## Getting a Working Stack

```bash
bun install
bun run dev:up     # PostgreSQL, migrations, API server, web app, docs site
```

`dev:up` runs `docker-compose.dev.yml` under a per-worktree Compose project and prints the URLs it serves. No dev service publishes a host port: the stack reaches you through OrbStack hostnames (`web.<slug>.freenary.orb.local`, `server.<slug>.freenary.orb.local`, `docs.<slug>.freenary.orb.local`), and the slug comes from the git branch. Without OrbStack, use the local path instead:

```bash
bun run db:start   # PostgreSQL container from docker-compose.yml (needs the root .env: cp .env.example .env)
bun run db:push    # apply the Prisma schema
bun run dev        # web 3001, server 3000, docs 4000
```

The dev stack needs no `.env`: `docker-compose.dev.yml` defaults every variable, and `EMAIL_PROVIDER` defaults to `log`, so the one-time-code flows print the code to the server log instead of sending mail. `createEmailProvider` refuses `log` in production. `bun run dev:reset` destroys the volumes and starts over. The `bootstrap` service runs `prisma migrate deploy` before the API server starts.

**There is no seed script.** Create an account through the sign-in screen. The `dev:up` stack sets `EMAIL_PROVIDER=log`, so `requireEmailVerification` is on: sign-up lands on **Confirm your email**, and the API server log prints the 6-digit code as a `[email:log]` line — read it with `bun run dev:logs`. The `bun run dev` path sets no email provider, so verification stays off there and sign-up returns a session at once. Bank data needs real bank-provider credentials (`BANKING_PROVIDER`, `POWENS_*` or `ENABLE_BANKING_*`); with none, the bank list reports that bank linking is unavailable and onboarding skips the connect step.

The production stack is `docker-compose.yml` (`bun run docker:up`, which is `docker compose up -d`). It runs the published `ghcr.io/suiramdev/freenary-server` and `ghcr.io/suiramdev/freenary-web` images, and applies the migrations itself through its one-shot `migrate` service. Its root `.env` carries `POSTGRES_PASSWORD`, `BETTER_AUTH_SECRET` and `FREENARY_VERSION`. That third line is not optional: the compose default is `latest`, and GHCR holds no such tag — the published tags are `main`, `dev` and `sha-<7 characters>`, so an unpinned `up -d` fails with `not found`.

Full walkthrough: [Local development stack](apps/fumadocs/content/docs/next/developers/setup.mdx) and [Self-hosting](apps/fumadocs/content/docs/next/self-hosting/index.mdx).

## Documentation: Ship It With the Change

[`apps/fumadocs`](apps/fumadocs) is the public documentation site. It is **part of the change, never a follow-up** — a PR that alters documented behavior and leaves the docs stale is incomplete, and reviewers should treat it as such.

**Update the docs when your change touches any of these:**

- A user-visible flow or screen in `apps/web`.
- A public API route, its input schema, or its auth/permission rules.
- A domain concept, status enum, or any vocabulary in `packages/db` — the docs quote these verbatim, so a renamed enum value silently makes a page wrong.
- An environment variable, `compose*.yml` service, root `package.json` script, or a GitHub Actions workflow.
- A bank provider or email provider integration, or the credentials it needs.
- Architecture a new contributor would have to reverse-engineer from the diff.
- The contributor workflow itself: tooling, tests, hooks, or review expectations.

Pure refactors, internal helpers, and dependency bumps that change no documented behavior need no docs change. Say so in the PR rather than leaving it ambiguous.

**The docs are versioned.** `content/docs` holds one folder per version of Freenary: `next` for the unreleased code, and one frozen `X.Y` folder per release. **A change edits `next` and nothing else** — the `Release` workflow copies `next` to `content/docs/X.Y` before it tags, and a released folder only ever takes a correction to that release. Every page is served under its version (`/docs/next/guides/budget`), a path with no version redirects to the newest release, and **an authored link never names a version**: write `/docs/guides/budget` and the site resolves it inside the version being read.

**Put it in the right section.** `content/docs/next/` is split into six sections by the reader's intent:

| Section | Audience | Never contains |
| --- | --- | --- |
| `getting-started/` | A reader with no instance | Operator or contributor material |
| `guides/` (Using Freenary) | Users of a running instance | Env vars, Docker, file paths, package names, database or enum names |
| `integrations/` | Users and operators | Internal design rationale |
| `self-hosting/` | Operators | Product walkthroughs |
| `developers/` | Contributors and engineers | Anything an end user needs |
| `help/` | Everyone | How-it-works internals |

Each version folder's `meta.json` carries the sidebar: one Fumadocs separator per section, `"---[Compass]Using Freenary---"`, and `"...guides"` under it to pull that folder's pages up beside it. So the label and the icon of a section live in that one array, and a section's own `meta.json` holds `pages` alone — its `title`, `description` and `icon` render nowhere. The root `content/docs/meta.json` lists the versions and orders the dropdown. A section's index page carries the name of its subject, and no page is titled `Overview`.

**A section holds pages, never folders.** A subject that needs several parts is one page with a `##` heading per part — `guides/accounts.mdx`, not a `guides/accounts/` folder — because the sidebar draws each section as the theme's own always-open separator with its pages flat under it. `docs:check` fails a page or a `meta.json` below `<version>/<section>/`, and a folder the version `meta.json` names instead of extracting.

A fact lives in **exactly one** section; everywhere else links to it. Duplicated prose is the failure mode this structure exists to prevent. How the system works — architecture, request flow, internals — belongs to `developers/`; a user wants to run the app and use it.

**Document what is true, and only what is true.** Read the code before writing the page, quote real names, and never describe a screen, flag, or endpoint that does not exist. No page carries a roadmap: never write that a feature is planned, is coming soon, or is not built yet, and never write a "what Freenary does today" list or a Built-against-Planned table. State what a reader can do, link them to it, and leave the rest out. (The repository `README.md` is not a docs page and does carry the state of the project.)

**Verify it.** Two gates, and neither one alone is enough:

```bash
bun run docs:check   # icons, components, links, navigation, audience split, language
cd apps/fumadocs && bun run build
```

| Mistake | `bun run build` | `bun run docs:check` |
| --- | --- | --- |
| Missing or malformed frontmatter, or no `description` | Fails | Fails |
| Unknown code-fence language | Fails | Fails |
| A page carrying an `icon` | **Passes** — renders one on the page row | Fails |
| A `meta.json` carrying an `icon` | **Passes** — renders nothing | Fails |
| A section separator carrying no icon, or one outside lucide's `icons` record | **Passes** — renders nothing | Fails |
| A section folder named in a version `meta.json` instead of extracted with `...` | **Passes** — renders a collapsible row | Fails |
| MDX component not registered in `src/components/mdx.tsx` | **Passes** — renders nothing | Fails |
| Dead internal link or `#anchor` | **Passes** | Fails |
| Page missing from its folder's `meta.json` | **Passes** | Fails |
| A page or a `meta.json` below `<version>/<section>/` | **Passes** | Fails |
| A shell command or an env var inside `guides/` | **Passes** | Fails |
| A link that names a version, or a version folder without `"root": true` | **Passes** | Fails |
| A contraction, a banned word, roadmap language, a 26-word sentence | **Passes** | Fails (in `next`; a frozen version keeps the structure rules only) |

A green gate therefore is not proof the page is right. Load the page you changed and look at it. The authoring rules and the five-step writing workflow live in [`apps/fumadocs/AGENTS.md`](apps/fumadocs/AGENTS.md), and the reader-facing version is the Writing documentation section of [`content/docs/next/developers/contributing.mdx`](apps/fumadocs/content/docs/next/developers/contributing.mdx) — update both together when the conventions change. Every page is written in ASD-STE100 Simplified Technical English; that rule is part of the authoring standard, not a style preference.

## Interface Text: Every String Is a Message Key

`apps/web` ships in English and French. Every user-facing string it renders is a key in `apps/web/messages/en.json` and `messages/fr.json`, and **a change that adds or edits UI adds or edits both catalogs in the same commit**. A key present in `en.json` and missing from `fr.json` compiles with no error and no warning — the French branch aliases to the English one, so English reaches French readers and no build step catches it.

The rules live next to the code they govern: [`apps/web/AGENTS.md`](apps/web/AGENTS.md#internationalization) for catalogs, message discipline and locale-aware formatting; [`packages/ui/AGENTS.md`](packages/ui/AGENTS.md) for primitives' accessible names; [`packages/api/AGENTS.md`](packages/api/AGENTS.md) for why responses carry slugs rather than labels. The mechanism is Paraglide: `apps/web/src/paraglide/` is generated, and every component imports the message functions as `m`. What readers see is documented at [`content/docs/next/guides/interface.mdx`](apps/fumadocs/content/docs/next/guides/interface.mdx).

## Branches and Releases

Pull requests target `dev`, the integration branch; `main` holds released code, and a push to either branch publishes the `ghcr.io/suiramdev/freenary-server` and `ghcr.io/suiramdev/freenary-web` images under that branch name. A maintainer releases by merging `dev` into `main` and running the `Release` workflow, which snapshots the documentation, creates the `vX.Y.Z` tag, the versioned images and the GitHub release. The web image carries its version from the build argument `FREENARY_VERSION`, which is what its account-menu documentation link points at. Contributors never tag and never bump a version — see [Release a version](apps/fumadocs/content/docs/next/developers/contributing.mdx).

## Pull Request Descriptions: Complete, Then Brief

- **Reviewers skim.** A description they have to scroll does not get read, so keep the whole body under ~400 words. Fill every section; pad none.
- **Summary:** at most four sentences — what changed, and what to look at first.
- **Motivation, Drawbacks, Prior art:** at most four short bullets each. Drawbacks and Prior art carry the honest costs and the rejected alternatives, not a sales pitch.
- **Notes:** one line per fact — `Closes #n`, the visual change (or explicitly none), the tests added, the `apps/fumadocs` pages updated (or explicitly none, and why), the short review summary `CONTRIBUTING.md` asks for, and any migration, breaking change, or merge-order constraint.
- Don't restate the issue, list changed files, narrate the implementation, or paste command output — reviewers open the diff and the linked issue for that.
- Evidence a reviewer may want but need not read (verification logs, benchmark runs) belongs in a PR comment, not the description.
- A section that needs a table or a code block is a smell: that detail belongs in the issue, the code, or a comment.

**Review gate.** This rule binds the top-level agent that owns an integration. A subagent returns its result to whoever spawned it and never runs the gate itself; the `reviewer` never invokes another reviewer.

Once an integration is implemented and smoke-tested, the owning agent runs the `reviewer` agent over the change before yielding or opening a pull request. It is read-only and returns a `verdict` plus a `findings[]` list; any finding at any severity means `changes_requested`. Fix every finding, then rerun the reviewer. If you believe a finding is wrong, send your counter-evidence back to the reviewer and let it re-judge — never overrule it yourself. The work is not complete until the reviewer returns `approved` with an empty `findings` list.

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
- Serve images from `public/` and set explicit `width`/`height` to avoid layout shift

### Framework-Specific Guidance

**TanStack Start (both `apps/web` and `apps/fumadocs`):**

- Declare document metadata in a route's `head` option, never with a raw `<head>` write
- Load route data in `loader` or a `useQuery`, never in a component body
- Declare a component as an arrow function assigned to a `const`, before the `Route` that references it

**React 19+:**

- Use ref as a prop instead of `React.forwardRef`

---

## Testing

- Write assertions inside `it()` or `test()` blocks
- Avoid done callbacks in async tests - use async/await instead
- Don't use `.only` or `.skip` in committed code
- Keep test suites reasonably flat - avoid excessive `describe` nesting
- Tests run with `bun test <path>`. There is no root `test` script and CI runs no tests, so run the files your change touches by hand.

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
