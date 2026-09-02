# ADR-004: Bootstrapping the Classifier From the Merchant Dictionary

## Status

Accepted, with a negative result. Extends the training source that [ADR-001](001-country-agnostic-categorisation.md) left open. The dictionary source, the evaluation and the shipping gate are implemented; on the current artifact the gate **refuses to ship weights**, so the classifier stays inert. Section 6 records the measurement.

## Context

ADR-001 shipped the local classifier as a stub — "stub until training data exists" — and named the eventual source: contributed data from the k-anonymity pipeline. That pipeline exists as `scrubForContribution`, but the endpoint that would receive its payloads does not, so no contributed sample has ever been collected. The trainer therefore reads only `MerchantOverride` rows and hand-recategorised transactions, both of which are empty on a fresh instance.

That leaves the pipeline with a bootstrap problem. Stage 3 matches the merchant dictionary exactly, so `carrefour` resolves and a descriptor the exact match misses does not. Stage 4's keyword tables catch what someone wrote a regex for. Everything else falls to uncategorised until a user corrects it by hand — and corrections are the only thing that would ever train the classifier out of the state.

The tempting shortcut is to invent training data: write plausible bank descriptors per country from general knowledge and fit the model to them. That is rejected. The classifier runs at stage 5 and only ever sees strings the deterministic layers could not resolve, which is precisely the population invented "typical" descriptors do not represent. Worse, the failure is silent and self-reinforcing: fabricated weights clear whatever confidence the pipeline writes at, put confident wrong categories into budgets, and suppress the correction signal, because a user corrects a blank far more readily than a plausible-looking mistake. The one real data source would be poisoned by the thing meant to substitute for it.

## Decision

### 1. The dictionary is the bootstrap prior

The dictionary artifact carries every merchant with a resolvable `SpendingCategory`, and its labels come from three places, none of them invented. Measured on the build these numbers were taken from, 32,556 labelled strings over 20,510 merchants: **16,890 from Wikidata-sourced entries** (CC0) whose category the SIRENE NAF pass assigned by company-name lookup, **15,529 from NSI** (BSD-3-Clause) via OSM tags, and **137 curated** (original to this project). It is the same artifact stage 3 loads.

The Wikidata share matters twice over. It is the majority of the corpus, so a description naming only NSI would misstate where the labels come from; and its categories are assigned by fuzzy name-matching into a NAF-to-category map rather than read off a tag, so it carries more label noise than the NSI share.

This is not a new fact about the world. It is the fact stage 3 already holds, re-encoded so the classifier can generalise it: the dictionary answers exact matches, and character n-grams over the same names answer the near-misses the dictionary structurally cannot.

### 2. Corrections outweigh the prior

A dictionary sample carries weight 1, a user correction weight 20, and the weight scales the gradient. Dictionary strings outnumber corrections by orders of magnitude on a young instance; without the asymmetry the prior would drown out the ground truth it exists to bootstrap. As corrections accumulate they take over, which is the intended trajectory.

### 3. The country token comes from the merchant's scope

Every merchant carries a `countries` scope in the artifact, where absent or empty means worldwide (`src/categorisation/merchant-scope.ts`). A merchant trains under the country-less pass — the one a connection with a null `institutionCountry` hits — plus each supported country its scope admits, matching what `modelInput()` receives at inference. Countries outside `SUPPORTED_COUNTRIES` contribute nothing, and no invented data stands in.

On the artifact these numbers were measured against, **0 of the 20,510 labelled merchants carry a scope**: it predates the build that captures one, so every merchant is worldwide and every string trains under both `null` and `FR`. The two slices are therefore near-duplicates here, and the per-slice gate has no discriminating power yet — it will once the build emits scopes and the slices carry different merchants.

The country token is not free even so. The hashing trick gives no token a private region of the feature space: the labelled corpus occupies 52,911 of the 65,536 buckets, and 10 of the 12 buckets `cc:fr` hashes into are among them. The token therefore shares weights with content n-grams rather than adding a clean signal of its own.

The gate therefore scores each held-out string once per country inference may pass (`null` and every entry in `SUPPORTED_COUNTRIES`), keeps the slices apart, and **gates on the worst of them**. Pooling would let a strong country-less slice carry a weak `FR` one over the bar, and a French instance only ever sees the `FR` slice. Real country signal arrives when corrections do, since those carry the connection's country.

### 4. The holdout splits by merchant, and the split gates the write

Held-out samples are chosen by hashing the merchant id, so every alias of a merchant lands on the same side. A random split over strings would score the model on aliases of merchants it trained on and measure memorisation; a merchant-level split measures the only thing the classifier is asked for, which is generalisation to a merchant the dictionary has never seen.

The trainer refuses to write `model-weights.json` unless the model clears a precision bar **at the confidence the pipeline actually writes a category at**. That is `MODEL_ACCEPT_THRESHOLD` (0.7), the floor `resolve.ts` applies to a prediction — not `predict()`'s abstention threshold (0.5), which only decides whether the model answers at all; nothing between the two ever reaches a budget. Precision there is the share of written categories that are right; top-1 accuracy over all predictions flatters a model that is merely confident, and is the wrong gate. The bar is 75%, matching the confidence the deterministic layers resolve at (ADR-003). No weights file means `loadModel()` no-ops and `predict()` returns null, so the failure mode is an inert classifier and a correctable transaction rather than confident noise.

The holdout is drawn from the dictionary alone. Corrections train the model but are never scored, so the gate as built measures generalisation to an unseen dictionary merchant — the quantity section 6 finds close to unlearnable. That is deliberate while corrections do not exist, but it means contributed data cannot clear this gate by arriving: **the gate must be revised to hold out corrections before contributed data can ship a model**. Until then a missing dictionary artifact leaves nothing to score against, and the trainer refuses rather than writing an unevaluated model.

### 5. Training is reproducible

The epoch shuffle runs on a seeded PRNG rather than `Math.random()`, and the holdout split hashes rather than samples. Both correction queries and the country lookup carry an explicit `orderBy` with an id tiebreak, because row order reaches the shuffle and Postgres does not promise one. Two runs over the same data produce the same weights and the same reported numbers — which ADR-001's data loading already claimed and the shuffle silently broke.

### 6. Measured result: the bootstrap does not clear the bar

4,159 held-out merchants, scored once per inference country for 13,242 inputs, trained on the remaining 51,870 training samples. The 32,556 distinct labelled strings of section 1 become 65,112 samples because each trains once per inference country. Both slices are gated; the country-less one is the worse here:

|Confidence|Coverage (none)|Precision (none)|Coverage (FR)|Precision (FR)|
|---|---|---|---|---|
|0.50|62.1%|36.9%|62.8%|37.1%|
|0.70 (gate)|44.0%|**43.4%**|44.1%|43.9%|
|0.90|25.7%|55.5%|26.4%|56.7%|
|0.95|19.6%|62.4%|20.2%|63.9%|

Top-1 accuracy is 27.9% (none) and 27.8% (FR) against a 13.3% majority baseline — better than chance, and nowhere near shippable. At the threshold the pipeline writes at, more than half the written categories would be wrong. No threshold on either curve reaches 75%, so raising it does not rescue the model, it only trades coverage for a precision that is still too low. Training longer makes the gated slice worse, not better: the worst slice gives 43.4% at 10 epochs, 40.0% at 30 and 37.8% at 60, because the extra fitting raises confidence faster than correctness.

The two slices track each other closely because nothing in this artifact is country-scoped (section 3), so they hold the same merchants and differ only by the `cc:fr` token. Which of them is worse is not stable: `FR` edges ahead at 10 epochs and falls behind at 30 and 60, where its coverage inflates faster (51.7% and 54.4% against 49.6% and 51.7%) and converts abstentions into wrong answers. That instability is the reason the gate takes the minimum rather than either slice by name.

Two causes, and the ordering matters. The first is intrinsic: a brand name is an arbitrary string, so character n-grams learned from `lidl` and `carrefour` carry almost nothing about an unseen `netto`. Only descriptive names (`pharmacie …`, `boulangerie …`) transfer, and the deterministic keyword tables at stage 4 already catch those more cheaply and more predictably. The second is label quality: half the corpus is Wikidata entries categorised by SIRENE name-matching (section 1), so an unknown share of the error is a wrong label rather than a wrong prediction. Cleaning the labels would raise the ceiling; it would not plausibly raise it by the 32 points the gate needs.

This does not condemn the classifier's premise. The case the dictionary genuinely supports is the *known* brand wearing noise — a store number, a town, an acquirer prefix — which is within-merchant generalisation, and the merchant-level holdout deliberately excludes it. Measuring that needs real bank descriptors, which is what the contribution pipeline is for. Until then the honest position is an inert classifier, which is what the gate enforces.

## Consequences

- The classifier stays inert on a fresh instance: the gate refuses these weights. Transactions the deterministic layers miss stay uncategorised and correctable, unchanged from before this ADR.
- The tempting shortcut is now closed with a number rather than an argument. Anyone proposing to bootstrap the classifier from merchant names alone can read section 6 instead of rediscovering it.
- `bun run train:model` exits non-zero when the gate refuses, so a CI job cannot ship an unevaluated model by accident. Without a dictionary artifact there is no holdout, so it refuses before training rather than writing weights nobody scored — a change from the previous behaviour, which shipped a corrections-only model unevaluated.
- The reported precision is a floor over dictionary merchants, not a figure for real bank descriptors. Only contributed data measures the real thing.
- ADR-001's k-anonymity pipeline is no longer just the eventual source; it is the blocking one. The classifier cannot ship until it delivers **and** the gate is revised to hold out corrections (section 4); delivery alone does not move a gate scored on dictionary merchants.
