# Freenary documentation website

This app serves the Freenary documentation. It uses [Fumadocs](https://fumadocs.dev) on TanStack Start.

Run it from the repository root:

```bash
bun install
cd apps/fumadocs && bun run dev
```

Open http://localhost:4000.

The pages live in [`content/docs`](content/docs). The authoring rules live in [`AGENTS.md`](AGENTS.md), and the reader-facing version of those rules is [`content/docs/contributing/writing-docs.mdx`](content/docs/contributing/writing-docs.mdx).

```bash
bun run docs:check    # icons, components, links, navigation, audience split, language
bun run build         # production build
bun run types:check   # TypeScript
```

`docs:check` is the gate a documentation change must pass. The build catches a missing frontmatter field and an unknown code-fence language. `docs:check` catches what the build lets through. Add `--strict` to fail on warnings too.
