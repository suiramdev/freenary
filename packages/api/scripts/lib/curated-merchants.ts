/**
 * Hand-curated merchant supplement for categories NSI structurally under-covers.
 *
 * Each entry declares only the canonical name and its spending category.
 * Aliases and domains are resolved at build time from Wikidata and SIRENE.
 */

import type { CuratedEntry } from "./types";

export const CURATED_MERCHANTS: CuratedEntry[] = [
  // ── Energy ──
  { category: "energy", name: "EDF" },
  { category: "energy", name: "Engie" },
  { category: "energy", name: "TotalEnergies" },
  { category: "energy", name: "Enercoop" },

  // ── Water ──
  { category: "water", name: "Veolia" },
  { category: "water", name: "Suez" },
  { category: "water", name: "Saur" },

  // ── Telecom / ISP ──
  { category: "telecom", name: "Orange" },
  { category: "telecom", name: "SFR" },
  { category: "telecom", name: "Free" },
  { category: "telecom", name: "Bouygues Telecom" },
  { category: "telecom", name: "Sosh" },
  { category: "telecom", name: "Red by SFR" },

  // ── Transport / Rail ──
  { category: "public-transport", name: "SNCF" },
  { category: "public-transport", name: "Trainline" },
  { category: "public-transport", name: "RATP" },
  { category: "public-transport", name: "Île-de-France Mobilités" },
  { category: "public-transport", name: "BlaBlaCar" },
  { category: "taxi", name: "Uber" },
  { category: "takeaway", name: "Uber Eats" },
  { category: "taxi", name: "Bolt" },

  // ── Insurance ──
  // A multi-line insurer covers home, vehicle and health alike, so none of the
  // three specific leaves can be claimed from the brand name.
  { category: "other-insurance", name: "AXA" },
  { category: "other-insurance", name: "MAIF" },
  { category: "other-insurance", name: "MACIF" },
  { category: "other-insurance", name: "MAAF" },
  { category: "other-insurance", name: "Matmut" },
  { category: "other-insurance", name: "Groupama" },
  { category: "other-insurance", name: "Allianz" },
  { category: "health-insurance", name: "April" },

  // ── Streaming / Subscriptions ──
  { category: "streaming", name: "Netflix" },
  { category: "streaming", name: "Spotify" },
  { category: "streaming", name: "Disney+" },
  { category: "streaming", name: "Canal+" },
  { category: "streaming", name: "Deezer" },
  { category: "streaming", name: "Amazon Prime" },
  { category: "streaming", name: "YouTube Premium" },
  // Storefronts that bill for apps and cloud rather than media.
  { category: "software", name: "Apple" },
  { category: "software", name: "Google" },
  { category: "software", name: "Microsoft" },
  { category: "software", name: "Adobe" },
  { category: "software", name: "OVH" },
  { category: "software", name: "Scaleway" },

  // ── Health ──
  { category: "medical", name: "Doctolib" },
  { category: "medical", name: "Ameli" },

  // ── E-commerce NSI lacks ──
  { category: "other-shopping", name: "Cdiscount" },
  { category: "clothing", name: "Vinted" },
  { category: "other-shopping", name: "Leboncoin" },
  { category: "electronics", name: "Back Market" },
  { category: "home-maintenance", name: "ManoMano" },
  { category: "other-shopping", name: "Veepee" },

  // ── Supermarkets with country-qualified NSI names ──
  { category: "groceries", name: "Monoprix" },
  { category: "groceries", name: "Carrefour" },

  // ── Fuel brands whose NSI convenience-store tag incorrectly overrides fuel ──
  { category: "fuel", name: "Esso" },
  { category: "fuel", name: "Shell" },
];
