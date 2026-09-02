# ADR-004: Bootstrapping the Classifier From the Merchant Dictionary

## Status

Accepted, with a negative result. Extends the training source that [ADR-001](001-country-agnostic-categorisation.md) left open. The dictionary source, the evaluation and the shipping gate are implemented; on both artifacts measured so far the gate **refuses to ship weights**, so the classifier stays inert. Section 6 records the measurement on a full local build, section 7 the one on the CI release the trainer now runs against.

## Context

ADR-001 shipped the local classifier as a stub — "stub until training data exists" — and named the eventual source: contributed data from the k-anonymity pipeline. That pipeline exists as `scrubForContribution`, but the endpoint that would receive its payloads does not, so no contributed sample has ever been collected. The trainer therefore reads only `MerchantOverride` rows and hand-recategorised transactions, both of which are empty on a fresh instance.

That leaves the pipeline with a bootstrap problem. Stage 3 matches the merchant dictionary exactly, so `carrefour` resolves and a descriptor the exact match misses does not. Stage 4's keyword tables catch what someone wrote a regex for. Everything else falls to uncategorised until a user corrects it by hand — and corrections are the only thing that would ever train the classifier out of the state.

The tempting shortcut is to invent training data: write plausible bank descriptors per country from general knowledge and fit the model to them. That is rejected. The classifier runs at stage 5 and only ever sees strings the deterministic layers could not resolve, which is precisely the population invented "typical" descriptors do not represent. Worse, the failure is silent and self-reinforcing: fabricated weights clear whatever confidence the pipeline writes at, put confident wrong categories into budgets, and suppress the correction signal, because a user corrects a blank far more readily than a plausible-looking mistake. The one real data source would be poisoned by the thing meant to substitute for it.

## Decision

### 1. The dictionary is the bootstrap prior

The dictionary artifact carries every merchant with a resolvable `SpendingCategory`, and its labels come from three places, none of them invented. Measured on a full local build — the one section 6 scores — 32,556 labelled strings over 20,510 merchants: **16,890 from Wikidata-sourced entries** (CC0) whose category the SIRENE NAF pass assigned by company-name lookup, **15,529 from NSI** (BSD-3-Clause) via OSM tags, and **137 curated** (original to this project). It is the same artifact stage 3 loads. The CI release differs, mainly in how far its SIRENE pass got (section 7).

The Wikidata share matters twice over. On that local build it is the majority of the corpus, so a description naming only NSI would misstate where the labels come from; and its categories are assigned by fuzzy name-matching into a NAF-to-category map rather than read off a tag, so it carries more label noise than the NSI share.

This is not a new fact about the world. It is the fact stage 3 already holds, re-encoded so the classifier can generalise it: the dictionary answers exact matches, and character n-grams over the same names answer the near-misses the dictionary structurally cannot.

### 2. Corrections outweigh the prior

A dictionary sample carries weight 1, a user correction weight 20, and the weight scales the gradient. Dictionary strings outnumber corrections by orders of magnitude on a young instance; without the asymmetry the prior would drown out the ground truth it exists to bootstrap. As corrections accumulate they take over, which is the intended trajectory.

### 3. The country token comes from the merchant's scope

Every merchant carries a `countries` scope in the artifact, where absent or empty means worldwide (`src/categorisation/merchant-scope.ts`). A merchant trains under the country-less pass — the one a connection with a null `institutionCountry` hits — plus each supported country its scope admits, matching what `modelInput()` receives at inference. Countries outside `SUPPORTED_COUNTRIES` contribute nothing, and no invented data stands in.

On the artifact these numbers were measured against, **0 of the 20,510 labelled merchants carry a scope**: it predates the build that captures one, so every merchant is worldwide and every string trains under both `null` and `FR`. The two slices are therefore near-duplicates here, and the per-slice gate has little discriminating power. Scope changes only the training mix — which countries a merchant trains under — never the holdout: every held-out string is scored under every inference country, so the slices always hold the same merchants and differ only by the token (section 7 confirms this on a scoped build).

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

| Confidence | Coverage (none) | Precision (none) | Coverage (FR) | Precision (FR) |
| --- | --- | --- | --- | --- |
| 0.50 | 62.1% | 36.9% | 62.8% | 37.1% |
| 0.70 (gate) | 44.0% | **43.4%** | 44.1% | 43.9% |
| 0.90 | 25.7% | 55.5% | 26.4% | 56.7% |
| 0.95 | 19.6% | 62.4% | 20.2% | 63.9% |

Top-1 accuracy is 27.9% (none) and 27.8% (FR) against a 13.3% majority baseline — better than chance, and nowhere near shippable. At the threshold the pipeline writes at, more than half the written categories would be wrong. No threshold on either curve reaches 75%, so raising it does not rescue the model, it only trades coverage for a precision that is still too low. Training longer makes the gated slice worse, not better: the worst slice gives 43.4% at 10 epochs, 40.0% at 30 and 37.8% at 60, because the extra fitting raises confidence faster than correctness.

The two slices track each other closely because nothing in this artifact is country-scoped (section 3), so they hold the same merchants and differ only by the `cc:fr` token. Which of them is worse is not stable: `FR` edges ahead at 10 epochs and falls behind at 30 and 60, where its coverage inflates faster (51.7% and 54.4% against 49.6% and 51.7%) and converts abstentions into wrong answers. That instability is the reason the gate takes the minimum rather than either slice by name.

Two causes, and the ordering matters. The first is intrinsic: a brand name is an arbitrary string, so character n-grams learned from `lidl` and `carrefour` carry almost nothing about an unseen `netto`. Only descriptive names (`pharmacie …`, `boulangerie …`) transfer, and the deterministic keyword tables at stage 4 already catch those more cheaply and more predictably. The second is label quality: half the corpus is Wikidata entries categorised by SIRENE name-matching (section 1), so an unknown share of the error is a wrong label rather than a wrong prediction. Cleaning the labels would raise the ceiling; it would not plausibly raise it by the 32 points the gate needs.

This does not condemn the classifier's premise. The case the dictionary genuinely supports is the _known_ brand wearing noise — a store number, a town, an acquirer prefix — which is within-merchant generalisation, and the merchant-level holdout deliberately excludes it. Measuring that needs real bank descriptors, which is what the contribution pipeline is for. Until then the honest position is an inert classifier, which is what the gate enforces.

### 7. Measured on the CI release: a different corpus, a different number

Section 6 scores a full local build. The workflow trains on the dictionary it rebuilds in the same run, whose SIRENE-categorised share depends on how far that pass got within its budget, so the corpus differs from release to release. The release `data-2026-09-01` — the asset every deployment downloads — holds 16,459 labelled strings over 11,355 merchants: 15,798 from NSI, 135 curated and 526 from the 308 Wikidata entries the SIRENE pass categorised before its wall-clock budget ran out. 10,147 of those merchants carry a country scope, which changes the training mix: a merchant scoped outside `FR` trains under `null` only. The holdout is unaffected — both slices hold the same 2,311 merchants and 3,289 strings and differ only by the `cc:fr` token. That becomes 19,666 samples, 2,311 held-out merchants scored as 6,578 inputs:

| Confidence | Coverage (none) | Precision (none) | Coverage (FR) | Precision (FR) |
| --- | --- | --- | --- | --- |
| 0.50 | 64.9% | 66.2% | 68.5% | 63.1% |
| 0.70 (gate) | 51.4% | 74.9% | 53.3% | **72.4%** |
| 0.90 | 37.1% | 84.6% | 37.4% | 83.4% |
| 0.95 | 31.0% | 87.5% | 31.5% | 87.1% |

Top-1 accuracy is 49.0% (none) and 49.1% (FR) against an 11.8% baseline. The gate still refuses; the worst slice is 2.6 points short. This is a second observation on a different build, not an ablation: against section 6 the corpus is half the size, nearly all of the SIRENE-labelled share is gone, the training mix is scoped and the baseline moved, and none of those was held fixed. What it does establish is that the shortfall is not the 32 points section 6 extrapolated from, and that the SIRENE share is the largest known difference between the two corpora. Whether label noise explains the gap needs the ablation section 6 did not run — the same artifact with the Wikidata-labelled entries dropped — and the per-release curve in the workflow summary now shows how the number moves as the SIRENE pass gets further. Until that is measured, the honest position is unchanged: the gate refuses, the classifier stays inert.

## Consequences

- The classifier stays inert on a fresh instance: the gate refuses these weights. Transactions the deterministic layers miss stay uncategorised and correctable, unchanged from before this ADR.
- The tempting shortcut is closed with numbers rather than an argument. Anyone proposing to bootstrap the classifier from merchant names alone can read sections 6 and 7 — both refuse, on two different corpora — instead of rediscovering it.
- `bun run train:model` exits non-zero when the gate refuses, so a CI job cannot ship an unevaluated model by accident. Without a dictionary artifact there is no holdout, so it refuses before training rather than writing weights nobody scored — a change from the previous behaviour, which shipped a corrections-only model unevaluated.
- Training runs in CI, not on instances. `generate-data.yml` trains with `--dictionary-only` against the dictionary it just built and attaches `model-weights.json` to the same `data-*` release only when the gate passes, which gives one canonical, reproducible weights file per dictionary build and keeps ADR-001's promise that the model travels with the dictionary. Operators hold the only corrections, but corrections cannot move a gate scored on dictionary merchants (section 4), and a model each instance trains for itself would be unevaluated on real descriptors and different everywhere. A refusal exits 2 and is the expected outcome of every run until contributed data exists, so the workflow records the curves in its summary and stays green; any other failure still fails the run.
- The reported precision is a floor over dictionary merchants, not a figure for real bank descriptors. Only contributed data measures the real thing.
- ADR-001's k-anonymity pipeline is no longer just the eventual source; it is the blocking one. The classifier cannot ship until it delivers **and** the gate is revised to hold out corrections (section 4); delivery alone does not move a gate scored on dictionary merchants.
