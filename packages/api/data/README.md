# Merchant Dictionary

`merchants.jsonl.gz` is a gzipped newline-delimited JSON file containing merchant entries from three sources:

1. **Name Suggestion Index (NSI)** — the OSM brand/operator index, providing ~9,800 consumer-facing merchants with mapped categories.
2. **Wikidata brands** — ~51k commercial entities with official websites (P856), providing aliases and domain coverage that NSI misses.
3. **Curated supplement** — a hand-authored list (~50 entries) covering categories NSI structurally under-covers.

Each line is a `DictionaryMerchant` object with a pre-normalised name, mapped `SpendingCategory` (or `null` for Wikidata-only entries), and optional aliases and domains. The `source` field distinguishes provenance: `"nsi"`, `"wikidata"`, or `"curated"`.

## Why three sources?

NSI indexes OSM points of interest — retail shops, restaurants, fuel stations — so utilities, telecoms, rail operators, insurers, and subscription services are sparse or absent. These are precisely the SEPA direct-debit merchants that matter most for a budgeting product (EDF, Orange, SNCF, Netflix, AXA, etc.). The curated supplement fills those gaps. Curated entries take precedence over NSI and Wikidata entries with the same normalised name.

Wikidata broadens brand coverage to online-only and service businesses that lack OSM presence. When a Wikidata brand matches an existing NSI entry by normalised name, its aliases and domains are merged in. Unmatched Wikidata brands are added as new entries only if they carry at least one domain (evidence of being a real commercial entity). Because Wikidata has no OSM tags, these entries carry `category: null` — the resolver uses them for name matching only, and downstream stages (e.g. Sirene NAF) handle category assignment.

## Regeneration

```bash
# Fetch Wikidata brands (run manually; writes wikidata-brands.json)
bun packages/api/scripts/fetch-wikidata-brands.ts

# Build the dictionary (merges NSI + Wikidata + curated)
bun packages/api/scripts/build-merchant-dictionary.ts
```

`fetch-wikidata-brands.ts` queries the Wikidata SPARQL endpoint in two phases: entity collection by type, then batch alias lookup. The intermediate `wikidata-brands.json` is committed so the dictionary build is reproducible without network access to WDQS. If the intermediate file is absent, the build proceeds with NSI + curated only.

The build script fetches the pinned NSI tarball from npm, reads the Wikidata intermediate file, applies the curated supplement, normalises all names, and writes sorted gzipped JSONL. Output is byte-stable across rebuilds.

## Pinned versions

- NSI **v8.0.20260729** (BSD-3-Clause).
- Wikidata brands: fetched from WDQS, intermediate committed as `wikidata-brands.json`.

## Licence and attribution

The NSI-derived data is from the **Name Suggestion Index** project, licensed under **BSD-3-Clause**. NSI is used instead of raw OpenStreetMap extracts because OSM data is licensed under ODbL (share-alike), which would contaminate the generated artifact. NSI's BSD-3-Clause licence permits redistribution of the derived dataset without share-alike obligations. The curated supplement is original to this project.

Wikidata data is licensed under **CC0** (public domain). The `fetch-wikidata-brands.ts` script queries the Wikidata Query Service, which is free and open. Aliases and domains are merged but categories are not — Wikidata has no OSM tags, so category mapping is deferred to other categorisation stages.
