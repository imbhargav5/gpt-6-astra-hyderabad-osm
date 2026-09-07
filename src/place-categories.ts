/** Shared taxonomy for search, filters and place cards. */
export const placeCategories = [
  "Heritage & culture",
  "Temples & worship",
  "Lakes & reservoirs",
  "Parks, wildlife & sports",
  "Shopping malls",
  "Healthcare",
  "Tech & business",
  "Neighbourhoods",
  "Transport & aviation",
  "Government & defence",
] as const;
export type Category = (typeof placeCategories)[number];
