# ADR-006: Bank Providers Are Adapters Selected By Configuration

## Status

Accepted. Makes good on the boundary `CONTEXT.md` always claimed — "providers are interchangeable connectors, never the core of the application" — which one hard-wired adapter had left as prose.

## Context

`BankingProvider` existed, but only Enable Banking could satisfy it. The interface was shaped by that one provider rather than by what the core needs:

- `getDefaultProvider()` returned the Enable Banking singleton, so no second provider could be reached even if it were registered.
- `completeConnection(code)` assumed an OAuth-style authorization code. A provider that hands back a connection id instead has nothing to pass.
- The web callback route was `callback/enable-banking`, and the redirect URL was that literal path — a provider name in the URL space of the app.
- Nothing could hold an identity at a provider. Powens scopes every call to a per-user token created through `POST /auth/init`; there was no row to keep it in and no place in the interface to ask for it.
- `BankAccount` stored an id, an IBAN and a name. An account's kind, balance and holdings had nowhere to land, so the wealth data Powens returns would have been fetched and dropped.

Powens is the better default for the countries freenary targets first: one webview covers credentials, SCA and account consent, and its Wealth product reports investment accounts and their positions, not just cash movements. Enable Banking stays supported — instances already run on it, and its connections must keep syncing untouched.

## Decision

### 1. The interface carries optional capabilities, not a lowest common denominator

`BankingProvider` (`packages/api/src/providers/types.ts`) keeps the six methods every provider must have, and adds optional ones the core probes for:

- `createUser` / `deleteUser` — a provider that scopes data per user returns a `ProviderUserSession`. Every request type carries `user: ProviderUserSession | null`, so a provider without them simply receives `null`.
- `fetchAccounts` / `fetchHoldings` — the wealth capability. Absent means the connection's accounts stay as they were created and no holdings are written; it is not an error and not a stub.

`completeConnection` takes `callbackParams: Record<string, string>` — every query parameter the provider appended to the callback — instead of one code. Enable Banking reads `code` from it, Powens reads `connection_id`, and the core never learns which.

The session is persisted by `packages/api/src/lib/bank-provider-user.ts`, not by an adapter: providers stay free of the database, and one `bank_provider_user` row per `(userId, provider)` is the whole identity.

### 2. Powens is the default; the choice is explicit

`BANKING_PROVIDER` is a `z.enum(["powens", "enable-banking"])` defaulting to `powens`, and `getDefaultProvider()` reads it. There is deliberately no fallback to whichever provider happens to have credentials: an instance that misconfigures Powens gets "bank linking is unavailable", not a silent switch to a provider its operator did not choose.

Existing connections do not care. Each `bank_connection` row stores the `provider` it was created with, and both sync and disconnect resolve the adapter from that row, so changing `BANKING_PROVIDER` only decides what the next connection uses.

### 3. Each provider owns a callback route it registers itself

The web route is `callback/$provider`, and `BankingProvider.callbackPath` is what `startConnection` appends to `CORS_ORIGIN`. The route passes its whole search object through to `exchangeCode` along with the provider id from the path, so adding a provider adds no route and no branch in the web app — only a `callbackPath` the operator whitelists at the provider.

The one decision the route still makes is provider-independent: an `error` parameter means the user declined, no `state` means there is nothing to verify, and anything else is an exchange.

### 4. Holdings are a per-sync snapshot, in minor units with decimal quantities

`Holding` rows are replaced on every sync: positions that disappeared at the provider are deleted, the rest upserted on `(accountId, providerHoldingId)`. The table answers "what is in this account now", and no history is implied by rows that only ever reflect the last sync.

Valuations and gains are `Int` minor units, like every other amount in the schema. Quantities are `Decimal(24, 8)` and travel from the adapter as strings: a fractional unit count must not round through a float on the way in.

`BankAccount.type` is a `BankAccountType` enum mirroring the adapter's `ProviderAccountType` member names, so sync writes what the mapper produced with no second mapping to drift. `isInvestmentAccountType` decides which accounts get a holdings fetch at all.

## Consequences

- Enable Banking connections created before this change keep working: the row's `provider` decides, and its accounts read `type = 'UNKNOWN'` with null balances because that provider reports neither. Nothing is back-filled.
- A third provider is a directory under `src/providers/`, an id in the registry and the env enum, and a `callbackPath`. No router, no sync code and no web route changes.
- The wealth data is persisted before any screen reads it. That is deliberate: syncing it later would leave every existing account without history, and the alternative — fetching holdings on demand from the UI — puts a provider call on a page render.
- Transactions gain a channel signal on Powens too, by mapping its transaction types onto the ISO 20022 family codes `channelFromFamilyCode` already understands. It is a translation, not new categorisation.
- A Powens connection that needs the account holder — SCA, an expired password — surfaces as a sync error string on the connection, exactly as an Enable Banking failure does. Reconnect and SCA-repair UI is not part of this change.
- Provider tokens are stored as-is in `bank_provider_user.accessToken`, matching how better-auth stores `Account.accessToken` in the same schema. At-rest encryption for either is a separate decision.
