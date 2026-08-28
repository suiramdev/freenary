import type { SpendingCategory } from "../../src/lib/mcc-categories";

/**
 * Maps high-frequency OSM `key=value` tags to the closest SpendingCategory.
 */
export const OSM_TAG_TO_CATEGORY = {
  "amenity=bar": "dining",
  "amenity=bicycle_rental": "transport",
  "amenity=bureau_de_change": "transfers",
  "amenity=cafe": "dining",
  "amenity=car_rental": "transport",
  "amenity=car_wash": "transport",
  "amenity=charging_station": "transport",
  "amenity=cinema": "entertainment",
  "amenity=clinic": "health",
  "amenity=dentist": "health",
  "amenity=doctors": "health",
  "amenity=driving_school": "education",
  "amenity=fast_food": "dining",
  "amenity=food_court": "dining",
  "amenity=fuel": "transport",
  "amenity=hospital": "health",
  "amenity=ice_cream": "dining",
  "amenity=nightclub": "entertainment",
  "amenity=parking": "transport",
  "amenity=pharmacy": "health",
  "amenity=pub": "dining",
  "amenity=restaurant": "dining",
  "amenity=theatre": "entertainment",
  "leisure=fitness_centre": "entertainment",
  "leisure=sports_centre": "entertainment",
  "man_made=water_works": "utilities",
  "office=energy_supplier": "utilities",
  "office=insurance": "insurance",
  "shop=bag": "shopping",
  "shop=bakery": "groceries",
  "shop=beauty": "shopping",
  "shop=books": "shopping",
  "shop=butcher": "groceries",
  "shop=car_parts": "transport",
  "shop=car_repair": "transport",
  "shop=cheese": "groceries",
  "shop=clothes": "shopping",
  "shop=computer": "shopping",
  "shop=convenience": "groceries",
  "shop=cosmetics": "shopping",
  "shop=deli": "groceries",
  "shop=department_store": "shopping",
  "shop=doityourself": "shopping",
  "shop=electronics": "shopping",
  "shop=florist": "shopping",
  "shop=frozen_food": "groceries",
  "shop=furniture": "shopping",
  "shop=greengrocer": "groceries",
  "shop=hairdresser": "shopping",
  "shop=hardware": "shopping",
  "shop=hearing_aids": "health",
  "shop=insurance": "insurance",
  "shop=jewelry": "shopping",
  "shop=mobile_phone": "shopping",
  "shop=optician": "health",
  "shop=seafood": "groceries",
  "shop=shoes": "shopping",
  "shop=sports": "shopping",
  "shop=supermarket": "groceries",
  "shop=toys": "shopping",
  "shop=variety_store": "shopping",
  "telecom=data_center": "utilities",
  "telecom=exchange": "utilities",
  "telecom=internet_service_provider": "utilities",
  "telecom=service_provider": "utilities",
  "tourism=apartment": "travel",
  "tourism=guest_house": "travel",
  "tourism=hostel": "travel",
  "tourism=hotel": "travel",
  "tourism=motel": "travel",
  "tourism=museum": "entertainment",
  "tourism=theme_park": "entertainment",
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
