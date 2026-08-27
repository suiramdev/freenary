# ADR-001: Country-Agnostic Categorisation Architecture

## Status

Accepted

## Context

Freenary aggregates banking data across institutions and must support multiple countries. The categorisation pipeline — descriptor parsing, merchant matching, and category resolution — was built with France as the first (and only) country. France-specific logic (SIRENE business-registry lookups, French-language verb patterns, institution definitions for Boursorama/BNP/CA/SG/CM/LCL/LBP) was functional but partially hardcoded into the generic cascade.

The system must scale to Germany, Spain, Belgium, the Netherlands, Italy, the United Kingdom, and other SEPA and non-SEPA countries without redesigning the core engine.

## Decision

### 1. Country and institution context flows through the pipeline

`BankConnection` persists `institutionCountry` (ISO 3166-1 alpha-2) and `institutionBic` at creation time, using values already available from the banking provider. Both `DescriptorParseInput` and `ResolveRequest` carry an optional `country` field so every stage can dispatch on it.

### 2. Transaction parsing uses a country-profile registry (already settled)

The `CountryProfile` interface groups institution definitions, channel-verb patterns, and trailing-noise regexes per country. Adding a country means one file and one registry entry — no changes to the parse engine. The generic parser remains the fallback for unrecognised institutions or missing country context.

### 3. Business-registry enrichment is adapter-based

A `BusinessRegistryAdapter` interface exposes a single `lookup(creditorName, allowExternalLookup): Promise<BusinessRegistryResult | null>` method. SIRENE is the first implementation, registered for `"FR"`. The cascade dispatches to the adapter matching the transaction's country; countries with no registry simply skip the stage. The resolution stage is named `"business-registry"`, not `"sirene"`.

### 4. Core stages remain country-agnostic

Memo lookup, intermediary detection, dictionary trigram matching, learned classification, Logo.dev enrichment, and MCC fallback operate on normalised descriptors and structured identifiers with no country-specific logic.

### 5. Tests annotate their scope

Test suites distinguish generic behaviour (channel short-circuit, memo, dictionary, learned, MCC) from country-specific behaviour (`describe("FR: ...")`) so a new country profile cannot silently break another.

## Consequences

- Adding a new country requires: a `CountryProfile` file, optionally a `BusinessRegistryAdapter`, and country-tagged tests. No core engine changes.
- The `"sirene"` string in existing `resolutionStage` database values is a historical artifact; new resolutions use `"business-registry"`.
- Future LLM or external fallback stages receive country, currency, channel, and institution context via `ResolveRequest`.
- Merchant data (dictionary, aliases) remains globally shared; country-specific aliases use the existing `MerchantAlias` model with no schema change.
