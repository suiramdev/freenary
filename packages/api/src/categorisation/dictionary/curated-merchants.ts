/**
 * Hand-curated merchant supplement for categories NSI structurally under-covers.
 *
 * NSI indexes OSM points of interest — retail shops, restaurants, fuel stations —
 * so utilities, telecoms, rail operators, insurers, and subscription services are
 * sparse or absent. This list fills those gaps with major French/EU recurring-payment
 * merchants that matter most for a budgeting product.
 *
 * Each entry declares only the canonical name and its spending category.
 * Aliases (alternative transaction descriptors) and domains are resolved at build
 * time from Wikidata (skos:altLabel, P856) and SIRENE, then merged into the
 * merchant dictionary artifact by `build-merchant-dictionary.ts`.
 *
 * Every entry carries `source: "curated"` in the artifact for auditability.
 * Curated entries take precedence over NSI entries with the same normalisedName.
 */

import type { SpendingCategory } from "../../lib/mcc-categories";

interface CuratedEntry {
  name: string;
  category: SpendingCategory;
}

export const CURATED_MERCHANTS: CuratedEntry[] = [
  // ── Energy ──
  { name: "EDF", category: "utilities" },
  { name: "Engie", category: "utilities" },
  { name: "TotalEnergies", category: "utilities" },
  { name: "Enercoop", category: "utilities" },

  // ── Water ──
  { name: "Veolia", category: "utilities" },
  { name: "Suez", category: "utilities" },
  { name: "Saur", category: "utilities" },

  // ── Telecom / ISP ──
  { name: "Orange", category: "utilities" },
  { name: "SFR", category: "utilities" },
  { name: "Free", category: "utilities" },
  { name: "Bouygues Telecom", category: "utilities" },
  { name: "Sosh", category: "utilities" },
  { name: "Red by SFR", category: "utilities" },

  // ── Transport / Rail ──
  { name: "SNCF", category: "transport" },
  { name: "Trainline", category: "transport" },
  { name: "RATP", category: "transport" },
  { name: "Île-de-France Mobilités", category: "transport" },
  { name: "BlaBlaCar", category: "transport" },
  { name: "Uber", category: "transport" },
  { name: "Uber Eats", category: "dining" },
  { name: "Bolt", category: "transport" },

  // ── Insurance ──
  { name: "AXA", category: "insurance" },
  { name: "MAIF", category: "insurance" },
  { name: "MACIF", category: "insurance" },
  { name: "MAAF", category: "insurance" },
  { name: "Matmut", category: "insurance" },
  { name: "Groupama", category: "insurance" },
  { name: "Allianz", category: "insurance" },
  { name: "April", category: "insurance" },

  // ── Streaming / Subscriptions ──
  { name: "Netflix", category: "subscriptions" },
  { name: "Spotify", category: "subscriptions" },
  { name: "Disney+", category: "subscriptions" },
  { name: "Canal+", category: "subscriptions" },
  { name: "Deezer", category: "subscriptions" },
  { name: "Amazon Prime", category: "subscriptions" },
  { name: "YouTube Premium", category: "subscriptions" },
  { name: "Apple", category: "subscriptions" },
  { name: "Google", category: "subscriptions" },
  { name: "Microsoft", category: "subscriptions" },
  { name: "Adobe", category: "subscriptions" },
  { name: "OVH", category: "subscriptions" },
  { name: "Scaleway", category: "subscriptions" },

  // ── Health ──
  { name: "Doctolib", category: "health" },
  { name: "Ameli", category: "health" },

  // ── E-commerce NSI lacks ──
  { name: "Cdiscount", category: "shopping" },
  { name: "Vinted", category: "shopping" },
  { name: "Leboncoin", category: "shopping" },
  { name: "Back Market", category: "shopping" },
  { name: "ManoMano", category: "shopping" },
  { name: "Veepee", category: "shopping" },

  // ── Supermarkets with country-qualified NSI names ──
  { name: "Monoprix", category: "groceries" },
  { name: "Carrefour", category: "groceries" },

  // ── Fuel brands whose NSI convenience-store tag incorrectly overrides transport ──
  { name: "Esso", category: "transport" },
  { name: "Shell", category: "transport" },
];
