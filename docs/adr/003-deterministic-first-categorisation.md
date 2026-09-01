# ADR-003: Deterministic Categorisation Before the Classifier

## Status

Accepted. Amends the stage order of [ADR-001](001-country-agnostic-categorisation.md).

## Context

ADR-001 put the local classifier at stage 6 and the ISO 18245 merchant-category-code lookup at stage 8, so a model prediction was consulted before a code the card network had already assigned to the merchant. The country-specific keyword tables were not in the pipeline at all: they lived in `deriveCategory`, the synchronous display fallback, and every country's table was flattened into one list because that function has no country to dispatch on.

That ordering inverts the property we want. Deterministic lookups are fast, predictable, testable, and give the same answer for the same transaction data. The classifier is none of those, and it is the part that has to be shipped, sized and loaded on a small self-hosted box.

## Decision

### 1. Deterministic layers run first; the classifier is the last resort

Pipeline order is now channel → user override → shared dictionary → deterministic layer → classifier → opt-in cloud tail → uncategorised. Everything up to the deterministic layer is a lookup over data the transaction already carries. The classifier only sees what those layers leave undecided, and when its confidence is below threshold the transaction is reported uncategorised rather than assigned a forced category.

### 2. The deterministic layer is country-dispatched

`deterministic.ts` reads the merchant category code first, then the keyword tables for the transaction's country. Tables resolve in ADR-001's layer order — the country's own rules over the country-agnostic defaults — and a country with no layer of its own gets the defaults alone. Adding a country stays what ADR-001 said it was: one file, one registry entry, one entry in `SUPPORTED_COUNTRIES`.

Transaction direction guards the keyword tables: an expense keyword on a credit describes a refund, not that spending category, so only an income-group match survives. A merchant category code is not guarded — a refund belongs in the merchant's own category so the period nets out.

Keyword patterns are anchored on token boundaries. The layer matches them against the counterparty name and, failing that, the whole normalised descriptor, where an unanchored short brand such as `ica` or `bolt` would fire on `medical` or `boltons` — a confidently wrong category, since this layer resolves as `auto`.

### 3. One global classifier, with country as an input feature

There is one model for every supported country, not one model per country. The country code joins the normalised descriptor as its own token in `modelInput()`, so the same hashed n-gram extractor gives the model a country feature and it can learn country-specific patterns over one shared taxonomy. Training applies the same helper, taking the country from the connection the sample was seen through.

## Consequences

- A merchant category code now resolves as `auto` at confidence 0.8 instead of `suggest` at 0.5: it is a trusted deterministic signal, not a last-ditch guess. Country rules resolve as `auto` at 0.75.
- The stage vocabulary gains `rules` and keeps `mcc`; `resolutionStage` stays readable as "which signal decided this".
- Stages keyed on the merchant key are skipped, not fatal, when a transaction has none — the deterministic layer and the classifier still run.
- The keyword tables have one owner (`categorisation/keywords`) and two consumers: the pipeline, which dispatches on country, and `deriveCategory`, which has no country and uses every layer flattened.
- Retraining is required for the country feature to be used at inference; a model trained before this change simply never sees the token.
