# ADR-001: Transaction Categorisation Pipeline

## Status

Accepted. The stage order in section 1 is amended by [ADR-003](003-deterministic-first-categorisation.md): the deterministic layers run before the classifier, and the MCC lookup is part of them.

## Context

Freenary aggregates banking data from Enable Banking and must categorise transactions automatically, without requiring a cloud AI service or a large on-box model. The accuracy bar is Ntropy-level, which comes from a shared merchant knowledge base rather than a clever model.

The constraint that shapes everything: no mandatory cloud component. An optional, anonymous, explicit opt-in API exists for contribution and tail inference. Everything else runs on the user's box — a cheap VPS with two vCPUs and 2–4 GB of RAM.

## Decision

### 1. Pipeline stages, in order

> Superseded by [ADR-003](003-deterministic-first-categorisation.md). The list below is the order as decided here; the pipeline now runs the deterministic layers, MCC included, before the local model.

Each stage exits early on a confident hit:

1. **Sync** — scheduled job pulling raw ISO 20022 data from Enable Banking. Raw transactions are persisted without categorisation.
2. **Internal transfer matching** — pairs the two legs of a movement between the user's own accounts using amount and date proximity. Runs as a separate pass, not inside the cascade.
3. **Split by transaction type** — `bank_transaction_code` decides IBAN path (direct debits, transfers) vs card path.
4. **Derive merchant key** — creditor IBAN for the IBAN path; label parsed through the resolved rule stack for the card path. Intermediary detection strips PSP/acquirer prefixes to recover the sub-merchant.
5. **Deterministic lookup** — user's own MerchantOverride table first (exact match on merchant key), then the shared dictionary (static file, exact match).
6. **Local model** — hashed character n-grams plus a linear classifier. A few tens of megabytes, microsecond inference, no neural runtime. Static embedding models (model2vec/potion family) are the upgrade path. Stub until training data exists.
7. **Opt-in cloud tail** — for genuinely novel merchant strings, deduplicated by merchant key. Users who don't opt in get "uncategorised" plus one-click correction. Stub until the API exists.
8. **MCC fallback** — ISO 18245 code to category when available.
9. **Write back** — the assigned category is stored. User corrections write to MerchantOverride and override every layer permanently.

### 2. Normalisation resolves in three layers

Default → country → institution. Each layer overrides the one above. Most parsing knowledge is country-level (scheme vocabulary, date conventions, SEPA semantics). Per-institution overrides exist for label-convention differences, optional PSD2 field coverage, and neobanks that use uniform formats across countries.

### 3. Categorisation is a batch job

The pipeline loads resources (dictionary, model) once, drains the batch of uncategorised transactions, and frees them. This optimises peak memory during a nightly run instead of paying for a model sitting in RAM.

### 4. Merchant dictionary is a static file

A signed, versioned, country-partitioned JSONL artifact built from open data (NSI, Wikidata, SIRENE, OSM) plus community contributions that pass a k-anonymity admission gate. Instances download and load it into an in-memory Map for exact-match lookup.

### 5. User corrections are permanent overrides

A `MerchantOverride` table maps `(userId, merchantKey) → category`. User wins over dictionary, model, and everything else, silently, with no reconciliation prompt.

### 6. Database schema

The categorisation data model uses two tables: `Transaction` (with `merchantKey` as the derived lookup key, `intermediaryName` as a plain string, and `isInternalTransfer` flag) and `MerchantOverride` (per-user `merchantKey → category` overrides). Dictionary data lives in a static file, not in the database. Intermediary detection uses an in-memory catalogue.

## Consequences

- Adding a new country requires: a `CountryProfile` file, optionally country-specific keywords, and country-tagged tests. No core engine changes.
- The dictionary build pipeline is decoupled from the runtime. Build scripts fetch from public APIs; the runtime consumes the static artifact.
- No runtime external API calls besides Enable Banking (and the opt-in cloud tail when implemented).
- Memory footprint is bounded: dictionary loaded only during batch, model loaded only during batch, both freed after.
- Future model training uses contributed data from the k-anonymity pipeline; the model file is distributed alongside the dictionary.
