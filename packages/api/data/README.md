# Merchant Dictionary

`merchants.jsonl.gz` is a gzipped newline-delimited JSON file containing merchant entries from two sources:

1. **Name Suggestion Index (NSI)** — the OSM brand/operator index, providing ~9,800 consumer-facing merchants with mapped categories.
2. **Curated supplement** — a hand-authored list (~50 entries) covering categories NSI structurally under-covers.

Each line is a `DictionaryMerchant` object with a pre-normalised name, mapped `SpendingCategory`, and optional aliases and domains. Every shipped row carries a non-null category by construction. The `source` field distinguishes provenance: `"nsi"` or `"curated"`.

## Why two sources?

NSI indexes OSM points of interest — retail shops, restaurants, fuel stations — so utilities, telecoms, rail operators, insurers, and subscription services are sparse or absent. These are precisely the SEPA direct-debit merchants that matter most for a budgeting product (EDF, Orange, SNCF, Netflix, AXA, etc.). The curated supplement fills those gaps. Curated entries take precedence over NSI entries with the same normalised name.

## Regeneration

```bash
bun packages/api/scripts/build-merchant-dictionary.ts
```

The script fetches the pinned NSI tarball from the npm registry, extracts `nsi.min.json`, maps OSM tags to `SpendingCategory` via a fixed category priority, normalises all names via the shared `normaliseDescriptor`, merges the curated supplement, and writes sorted gzipped JSONL. Output is byte-stable across rebuilds.

## Pinned version

NSI **v8.0.20260729** (BSD-3-Clause).

## Licence and attribution

The NSI-derived data is from the **Name Suggestion Index** project, licensed under **BSD-3-Clause**. NSI is used instead of raw OpenStreetMap extracts because OSM data is licensed under ODbL (share-alike), which would contaminate the generated artifact. NSI's BSD-3-Clause licence permits redistribution of the derived dataset without share-alike obligations. The curated supplement is original to this project.
