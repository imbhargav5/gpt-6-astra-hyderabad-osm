/** Shared taxonomy for search, filters and place cards. */
export const placeCategories = [
  "Heritage & monuments",
  "Temples & worship",
  "Lakes & reservoirs",
  "Parks & wildlife",
  "Sports grounds",
  "Shopping malls",
  "Healthcare",
  "Science & culture",
  "Tech & business",
  "Neighbourhoods",
  "Transport & aviation",
  "Government & defence",
] as const;
export type Category = (typeof placeCategories)[number];
