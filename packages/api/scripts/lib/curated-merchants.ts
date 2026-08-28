/**
 * Hand-curated merchant supplement for categories NSI structurally under-covers.
 *
 * Each entry declares only the canonical name and its spending category.
 * Aliases and domains are resolved at build time from Wikidata and SIRENE.
 */

import type { CuratedEntry } from "./types";

export const CURATED_MERCHANTS: CuratedEntry[] = [
  // ── Energy ──
  { category: "utilities", name: "EDF" },
  { category: "utilities", name: "Engie" },
  { category: "utilities", name: "TotalEnergies" },
  { category: "utilities", name: "Enercoop" },

  // ── Water ──
  { category: "utilities", name: "Veolia" },
  { category: "utilities", name: "Suez" },
  { category: "utilities", name: "Saur" },

  // ── Telecom / ISP ──
  { category: "utilities", name: "Orange" },
  { category: "utilities", name: "SFR" },
  { category: "utilities", name: "Free" },
  { category: "utilities", name: "Bouygues Telecom" },
  { category: "utilities", name: "Sosh" },
  { category: "utilities", name: "Red by SFR" },

  // ── Transport / Rail ──
  { category: "transport", name: "SNCF" },
  { category: "transport", name: "Trainline" },
  { category: "transport", name: "RATP" },
  { category: "transport", name: "Île-de-France Mobilités" },
  { category: "transport", name: "BlaBlaCar" },
  { category: "transport", name: "Uber" },
  { category: "dining", name: "Uber Eats" },
  { category: "transport", name: "Bolt" },

  // ── Insurance ──
  { category: "insurance", name: "AXA" },
  { category: "insurance", name: "MAIF" },
  { category: "insurance", name: "MACIF" },
  { category: "insurance", name: "MAAF" },
  { category: "insurance", name: "Matmut" },
  { category: "insurance", name: "Groupama" },
  { category: "insurance", name: "Allianz" },
  { category: "insurance", name: "April" },

  // ── Streaming / Subscriptions ──
  { category: "subscriptions", name: "Netflix" },
  { category: "subscriptions", name: "Spotify" },
  { category: "subscriptions", name: "Disney+" },
  { category: "subscriptions", name: "Canal+" },
  { category: "subscriptions", name: "Deezer" },
  { category: "subscriptions", name: "Amazon Prime" },
  { category: "subscriptions", name: "YouTube Premium" },
  { category: "subscriptions", name: "Apple" },
  { category: "subscriptions", name: "Google" },
  { category: "subscriptions", name: "Microsoft" },
  { category: "subscriptions", name: "Adobe" },
  { category: "subscriptions", name: "OVH" },
  { category: "subscriptions", name: "Scaleway" },

  // ── Health ──
  { category: "health", name: "Doctolib" },
  { category: "health", name: "Ameli" },

  // ── E-commerce NSI lacks ──
  { category: "shopping", name: "Cdiscount" },
  { category: "shopping", name: "Vinted" },
  { category: "shopping", name: "Leboncoin" },
  { category: "shopping", name: "Back Market" },
  { category: "shopping", name: "ManoMano" },
  { category: "shopping", name: "Veepee" },

  // ── Supermarkets with country-qualified NSI names ──
  { category: "groceries", name: "Monoprix" },
  { category: "groceries", name: "Carrefour" },

  // ── Fuel brands whose NSI convenience-store tag incorrectly overrides transport ──
  { category: "transport", name: "Esso" },
  { category: "transport", name: "Shell" },
];
