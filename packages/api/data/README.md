# Merchant Dictionary

`merchants.jsonl.gz` is a gzipped newline-delimited JSON file containing merchant entries from three sources:

1. **Name Suggestion Index (NSI)** — the OSM brand/operator index, providing ~9,800 consumer-facing merchants with mapped categories.
2. **Wikidata brands** — ~51k commercial entities with official websites (P856), providing aliases and domain coverage that NSI misses.
3. **Curated supplement** — a list of ~50 merchant names and categories covering sectors NSI structurally under-covers. Aliases and domains for curated merchants are resolved at build time from Wikidata and SIRENE, not hard-coded.

Each line is a `DictionaryMerchant` object with a pre-normalised name, mapped `SpendingCategory` (or `null` for Wikidata-only entries), and optional aliases and domains. The `source` field distinguishes provenance: `"nsi"`, `"wikidata"`, or `"curated"`.

`countries` holds the ISO 3166-1 alpha-2 codes the merchant is scoped to — NSI geographic scope, or Wikidata `P17` — and is empty for a worldwide brand rather than absent from everywhere. Consumers filter on it in memory; there are no per-country files, because the unscoped worldwide tail every country needs would have to be duplicated into each one (see [ADR-001 §4](../../../docs/adr/001-country-agnostic-categorisation.md)).

## Why three sources?

NSI indexes OSM points of interest — retail shops, restaurants, fuel stations — so utilities, telecoms, rail operators, insurers, and subscription services are sparse or absent. These are precisely the SEPA direct-debit merchants that matter most for a budgeting product (EDF, Orange, SNCF, Netflix, AXA, etc.). The curated supplement fills those gaps. Curated entries take precedence over NSI and Wikidata entries with the same normalised name.

Wikidata broadens brand coverage to online-only and service businesses that lack OSM presence. When a Wikidata brand matches an existing NSI entry by normalised name, its aliases and domains are merged in. Unmatched Wikidata brands are added as new entries only if they carry at least one domain (evidence of being a real commercial entity). Because Wikidata has no OSM tags, these entries start at `category: null`; the SIRENE NAF pass later in the same build fills in the ones it can match by company name, and the rest stay `null` and serve name matching only. How many it fills depends on how far the pass gets within its budget: 9,463 of 48,484 on a full local build, 308 of 47,392 on the CI release `data-2026-09-01`.

SIRENE only holds French legal entities, so the SIRENE pass considers a merchant only when something ties it to France: a `.fr` domain, or a `countries` entry of `FR`. Asking the French register about a foreign brand returns a namesake: measured on a sample, one lookup in five matched a French holding or landlord, which would have filed Adobe under `rent`. Classes naming a legal or asset structure rather than a trade (`64.20`, `64.30`, `66.30`, `68.20`, `70.10`) are refused for a name match, as are pre-2008 NAF rev. 1 codes, and a code mapping to `uncategorised` leaves `category` null rather than claiming an answer.

## How data is supplied

Data artifacts are built in CI (`.github/workflows/generate-data.yml`) and published as a GitHub Release tagged `data-YYYY-MM-DD`. The workflow runs weekly and on push to `main` when the generation scripts, the feature extractor or the trainer change. The same run trains the classifier against the dictionary it just built and adds `model-weights.json` to the release only when the shipping gate passes (see [Model weights](#model-weights)); the release notes say which.

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

## Model weights

`model-weights.json` is the local classifier, produced by `bun run train:model` from two sources ([ADR-004](../../../docs/adr/004-dictionary-bootstrapped-classifier.md)):

1. **The merchant dictionary** — every entry with a resolvable category, read as names and aliases. On the release `data-2026-09-01` that is 16,459 labelled strings over 11,355 merchants: 15,798 from NSI's OSM tags, 526 from the 308 Wikidata-sourced entries the SIRENE NAF pass categorised, and 135 curated. A bootstrap prior. The Wikidata share carries more label noise than the NSI share because its categories come from company-name matching rather than a tag, and its size changes from one release to the next with how far the SIRENE pass got ([ADR-004 §7](../../../docs/adr/004-dictionary-bootstrapped-classifier.md)).
2. **User corrections** — `MerchantOverride` rows and hand-recategorised transactions. Ground truth, weighted 20× a dictionary sample so it takes over as it accumulates.

No training data is synthesised. The trainer holds out 20% of merchants — split by merchant id, so no alias of a training merchant is scored — scores each held-out string once per country inference may pass, and **refuses to write the weights unless the worst country slice clears 75% precision at the confidence the pipeline writes a category at** (0.7, the floor `resolve.ts` applies). Gating on the worst slice rather than the pooled figure stops a strong slice carrying a weak one, and which slice is weakest is not stable between runs. A missing weights file leaves the classifier inert and transactions correctable, which is the safe state. The script exits 2 when the gate refuses and 1 on any other failure, so CI cannot ship an unevaluated model and can tell a refusal from a crash.

**On the current release the gate refuses.** The worst slice (`FR`) reaches 72.4% precision at that threshold over 2,311 held-out merchants; the country-less slice reaches 74.9%. A full local build with the SIRENE pass complete measured 43.4% — a different corpus, twice the size and mostly SIRENE-labelled, so the two numbers are two observations, not an ablation. Either way `train:model` currently produces no weights and the classifier stays inert by design. [ADR-004 §6–7](../../../docs/adr/004-dictionary-bootstrapped-classifier.md) has the full curves and the reasoning; read it before proposing another bootstrap from merchant names.

Training is reproducible: the epoch shuffle is seeded and the holdout split is hashed, so the same data yields the same weights and the same reported numbers.

**Who trains, and where the weights come from.** The data workflow does, with `--dictionary-only`, so the canonical weights for a dictionary build come from that build alone and every deployment that runs `build:data` gets the same file — or none. The precision curves of each run are in the workflow's job summary. Corrections only exist inside individual instances and cannot lift a gate scored on dictionary merchants, so running `bun run train:model` against your own database is a research tool, not a deployment path: `build:data` deletes a local `model-weights.json` before it does anything else, and only a release puts one back.

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
