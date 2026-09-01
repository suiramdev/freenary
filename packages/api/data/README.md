# Merchant Dictionary

`merchants.jsonl.gz` is a gzipped newline-delimited JSON file containing merchant entries from three sources:

1. **Name Suggestion Index (NSI)** — the OSM brand/operator index, providing ~9,800 consumer-facing merchants with mapped categories.
2. **Wikidata brands** — ~51k commercial entities with official websites (P856), providing aliases and domain coverage that NSI misses.
3. **Curated supplement** — a list of ~50 merchant names and categories covering sectors NSI structurally under-covers. Aliases and domains for curated merchants are resolved at build time from Wikidata and SIRENE, not hard-coded.

Each line is a `DictionaryMerchant` object with a pre-normalised name, mapped `SpendingCategory` (or `null` for Wikidata-only entries), and optional aliases and domains. The `source` field distinguishes provenance: `"nsi"`, `"wikidata"`, or `"curated"`.

`countries` holds the ISO 3166-1 alpha-2 codes the merchant is scoped to — NSI geographic scope, or Wikidata `P17` — and is empty for a worldwide brand rather than absent from everywhere. Consumers filter on it in memory; there are no per-country files, because the unscoped worldwide tail every country needs would have to be duplicated into each one (see [ADR-001 §4](../../../docs/adr/001-country-agnostic-categorisation.md)).

## Why three sources?

NSI indexes OSM points of interest — retail shops, restaurants, fuel stations — so utilities, telecoms, rail operators, insurers, and subscription services are sparse or absent. These are precisely the SEPA direct-debit merchants that matter most for a budgeting product (EDF, Orange, SNCF, Netflix, AXA, etc.). The curated supplement fills those gaps. Curated entries take precedence over NSI and Wikidata entries with the same normalised name.

Wikidata broadens brand coverage to online-only and service businesses that lack OSM presence. When a Wikidata brand matches an existing NSI entry by normalised name, its aliases and domains are merged in. Unmatched Wikidata brands are added as new entries only if they carry at least one domain (evidence of being a real commercial entity). Because Wikidata has no OSM tags, these entries carry `category: null` — the resolver uses them for name matching only, and downstream stages (e.g. Sirene NAF) handle category assignment.

SIRENE only holds French legal entities, so the SIRENE pass considers a merchant only when something ties it to France: a `.fr` domain, or a `countries` entry of `FR`. Asking the French register about a foreign brand returns a namesake: measured on a sample, one lookup in five matched a French holding or landlord, which would have filed Adobe under `rent`. Classes naming a legal or asset structure rather than a trade (`64.20`, `64.30`, `66.30`, `68.20`, `70.10`) are refused for a name match, as are pre-2008 NAF rev. 1 codes, and a code mapping to `uncategorised` leaves `category` null rather than claiming an answer.

## How data is supplied

Data artifacts are built in CI (`.github/workflows/generate-data.yml`) and published as a GitHub Release tagged `data-YYYY-MM-DD`. The workflow runs weekly and on push to `main` when the generation scripts change.

```bash
# Default: download pre-built artifacts from the latest GitHub data release,
# falling back to local generation when no release is available.
bun run build:data

# Force local generation (skips the download, runs the full pipeline).
bun run build:data:generate
```

The full generation pipeline runs three scripts in sequence:

1. `generate-place-tokens.ts` — downloads the GeoNames cities15000 dataset and writes `place-tokens.json`.
2. `fetch-wikidata-brands.ts` — queries Wikidata SPARQL and the SIRENE API, writes `wikidata-brands.json`.
3. `build-merchant-dictionary.ts` — fetches the pinned NSI tarball, merges NSI + Wikidata + curated supplement, enriches via SIRENE, and writes `merchants.jsonl.gz`.

Each step degrades gracefully when its upstream API is unreachable. The SIRENE pass also carries a 15-minute wall-clock budget and stops after 25 consecutive request failures — shared CI egress IPs get throttled into silence, and every answer it did get is cached on disk (`packages/api/.cache/sirene`, persisted across CI runs), so a truncated pass resumes on the next run instead of restarting.

## Runtime enrichment

Transactions that no dictionary, learned, or SIRENE stage can resolve are sent to the Logo.dev transaction enrichment API (when `LOGO_DEV_API_KEY` is set). The result is cached as a global memo in the `descriptor_memo` table so subsequent transactions with the same descriptor skip the API.

## Pinned versions

- NSI **v8.0.20260729** (BSD-3-Clause).
- Wikidata brands: fetched from WDQS, written to `wikidata-brands.json` at build time.
- SIRENE: `recherche-entreprises.api.gouv.fr` (free, no key required).

## Licence and attribution

The NSI-derived data is from the **Name Suggestion Index** project, licensed under **BSD-3-Clause**. NSI is used instead of raw OpenStreetMap extracts because OSM data is licensed under ODbL (share-alike), which would contaminate the generated artifact. NSI's BSD-3-Clause licence permits redistribution of the derived dataset without share-alike obligations. The curated supplement is original to this project.

Wikidata data is licensed under **CC0** (public domain). The `fetch-wikidata-brands.ts` script queries the Wikidata Query Service, which is free and open. Aliases and domains are merged but categories are not — Wikidata has no OSM tags, so category mapping is deferred to other categorisation stages.

SIRENE data is from the French government's open company register, free and open for reuse.
