import type { SpendingCategory } from "../../src/lib/taxonomy";

/**
 * Maps high-frequency OSM `key=value` tags to the closest SpendingCategory.
 * A tag names a single kind of place, so nearly every entry can be a leaf.
 */
export const OSM_TAG_TO_CATEGORY = {
  "amenity=atm": "cash-withdrawal",
  "amenity=bank": "other-financial",
  "amenity=bar": "bars-cafes",
  "amenity=bicycle_rental": "public-transport",
  "amenity=bureau_de_change": "other-transfer",
  "amenity=cafe": "bars-cafes",
  // Car rental sits with travel, matching MCC 7512 and the 3300-3499 block.
  "amenity=car_rental": "other-travel",
  "amenity=car_wash": "vehicle-maintenance",
  "amenity=charging_station": "fuel",
  "amenity=cinema": "culture",
  "amenity=clinic": "medical",
  "amenity=dentist": "medical",
  "amenity=doctors": "medical",
  "amenity=driving_school": "courses",
  "amenity=fast_food": "takeaway",
  "amenity=food_court": "restaurants",
  "amenity=fuel": "fuel",
  "amenity=hospital": "medical",
  "amenity=ice_cream": "takeaway",
  "amenity=nightclub": "bars-cafes",
  "amenity=parking": "parking-tolls",
  "amenity=pharmacy": "pharmacy",
  "amenity=pub": "bars-cafes",
  "amenity=restaurant": "restaurants",
  "amenity=theatre": "culture",
  "leisure=fitness_centre": "sports",
  "leisure=sports_centre": "sports",
  "man_made=water_works": "water",
  "office=energy_supplier": "energy",
  "office=insurance": "other-insurance",
  "shop=bag": "clothing",
  "shop=bakery": "groceries",
  "shop=beauty": "personal-care",
  "shop=books": "hobbies",
  "shop=butcher": "groceries",
  "shop=car_parts": "vehicle-maintenance",
  "shop=car_repair": "vehicle-maintenance",
  "shop=cheese": "groceries",
  "shop=clothes": "clothing",
  "shop=computer": "electronics",
  "shop=convenience": "groceries",
  "shop=cosmetics": "personal-care",
  "shop=deli": "groceries",
  "shop=department_store": "other-shopping",
  "shop=doityourself": "home-maintenance",
  "shop=electronics": "electronics",
  "shop=florist": "gifts",
  "shop=frozen_food": "groceries",
  "shop=furniture": "furniture",
  "shop=greengrocer": "groceries",
  "shop=hairdresser": "personal-care",
  "shop=hardware": "home-maintenance",
  "shop=hearing_aids": "medical",
  "shop=insurance": "other-insurance",
  "shop=jewelry": "other-shopping",
  "shop=mobile_phone": "electronics",
  "shop=optician": "medical",
  "shop=seafood": "groceries",
  "shop=shoes": "clothing",
  "shop=sports": "sports",
  "shop=supermarket": "groceries",
  "shop=toys": "hobbies",
  "shop=variety_store": "other-shopping",
  "telecom=data_center": "telecom",
  "telecom=exchange": "telecom",
  "telecom=internet_service_provider": "telecom",
  "telecom=service_provider": "telecom",
  "tourism=apartment": "accommodation",
  "tourism=guest_house": "accommodation",
  "tourism=hostel": "accommodation",
  "tourism=hotel": "accommodation",
  "tourism=motel": "accommodation",
  "tourism=museum": "culture",
  "tourism=theme_park": "hobbies",
} as const satisfies Record<string, SpendingCategory>;

export const mapOsmTagToCategory = (
  tag: string | null
): SpendingCategory | null => {
  if (tag === null) {
    return null;
  }
  // SAFETY: tag is an arbitrary string; the assertion narrows for the const lookup
  return OSM_TAG_TO_CATEGORY[tag as keyof typeof OSM_TAG_TO_CATEGORY] ?? null;
};
