import type { Landmark } from "./landmarks";

export const campusPlaces: Landmark[] = [
  {
    id: "inorbit-mall",
    name: "Inorbit Mall",
    area: "Madhapur · Cyberabad",
    coordinates: [78.38669, 17.43454],
    zoom: 16.9,
    bearing: 25,
    category: "Shopping malls",
    description:
      "The lake-side retail landmark beside Durgam Cheruvu, with its mapped stepped footprint, glazed façades and roof trim.",
    aliases: ["Inorbit mall Cyberabad"],
  },
  {
    id: "gvk-one",
    name: "GVK One Mall",
    area: "Road No. 1 · Banjara Hills",
    coordinates: [78.4486, 17.41925],
    zoom: 17.2,
    bearing: -25,
    category: "Shopping malls",
    description:
      "A compact Banjara Hills mall. Orbit the mapped building to see its curved frontage, glazing and projecting floor bands.",
    aliases: ["gvk mall"],
  },
  {
    id: "lv-prasad",
    name: "L. V. Prasad Eye Institute",
    area: "Kallam Anji Reddy campus · Banjara Hills",
    coordinates: [78.42757, 17.42468],
    zoom: 17.1,
    bearing: 20,
    category: "Healthcare",
    description:
      "The Banjara Hills hospital campus, represented with mapped building wings, regular window bays, sunshades and roof coping.",
    aliases: ["lv prasad eye institute", "LVPEI", "L V Prasad"],
  },
  {
    id: "gandhi-hospital",
    name: "Gandhi Hospital",
    area: "Musheerabad · Secunderabad",
    coordinates: [78.5036, 17.4231],
    zoom: 16.4,
    bearing: -25,
    category: "Healthcare",
    description:
      "The large teaching-hospital precinct, with detailed mapped blocks, window grids and horizontal sunshades.",
  },
  {
    id: "sarath-city",
    name: "Sarath City Capital Mall",
    area: "Kothaguda · Kondapur",
    coordinates: [78.3637, 17.45772],
    zoom: 16.7,
    bearing: 20,
    category: "Shopping malls",
    description:
      "The broad retail complex at Kothaguda, with layered façades, glazing, roof trim and repeated vertical fins.",
    aliases: [
      "sarath city mall",
      "sarat city",
      "sharath city mall",
      "AMB mall",
    ],
  },
  {
    id: "biodiversity-park",
    name: "Biodiversity Park",
    area: "Biodiversity junction · Gachibowli",
    coordinates: [78.37651, 17.42906],
    zoom: 16.9,
    bearing: -20,
    category: "Parks & wildlife",
    description:
      "The park at Biodiversity junction. Explore its mapped paths, planted areas and the surrounding flyovers.",
    aliases: ["biodiversity", "bio diversity"],
  },
  {
    id: "begumpet-airport",
    name: "Begumpet Airport",
    area: "Old Hyderabad airport · Begumpet",
    coordinates: [78.46832, 17.45409],
    zoom: 14.6,
    bearing: 75,
    category: "Transport & aviation",
    description:
      "The old airport within the city, with mapped runway surfaces, centreline markings and detailed terminal and hangar footprints.",
    aliases: ["begumpet old airport", "old airport"],
  },
  {
    id: "drdo",
    name: "DRDO · DRDL Campus",
    area: "Kanchanbagh",
    coordinates: [78.496948, 17.336168],
    zoom: 16,
    bearing: 20,
    category: "Government & defence",
    description:
      "The DRDL precinct in Kanchanbagh. Publicly mapped building footprints receive illustrative roof seams and restrained façade detailing.",
    aliases: ["Defence Research and Development Organisation", "DRDL"],
  },
  {
    id: "bdl",
    name: "Bharat Dynamics Limited",
    area: "Kanchanbagh campus",
    coordinates: [78.5, 17.332],
    zoom: 15.9,
    bearing: -20,
    category: "Government & defence",
    description:
      "A view of the Kanchanbagh campus, using public map geometry with illustrative industrial roof and façade detailing.",
    aliases: ["BDL", "Bharat Dynamics"],
  },
  {
    id: "midhani-township",
    name: "MIDHANI Township",
    area: "Midhani Quarters · Kanchanbagh",
    coordinates: [78.515516, 17.327421],
    zoom: 16,
    bearing: 20,
    category: "Neighbourhoods",
    description:
      "The residential quarters near MIDHANI, with mapped housing blocks, window bays, balcony bands and roof edging.",
    aliases: ["midhani township", "midhani quarters"],
  },
  {
    id: "hakimpet",
    name: "Hakimpet Air Force Station",
    area: "Hakimpet · Northern Hyderabad",
    coordinates: [78.5249, 17.5535],
    zoom: 14.8,
    bearing: 75,
    category: "Transport & aviation",
    description:
      "A geographic view of the airfield’s publicly mapped runway and buildings, with illustrative surface markings and hangar roof details.",
    aliases: ["hakimpet air facility", "hakimpet airport", "hakimpet airfield"],
  },
  {
    id: "tcs-adibatla",
    name: "TCS Adibatla Campus",
    area: "Adibatla · Southern technology district",
    coordinates: [78.56344, 17.2315],
    zoom: 16,
    bearing: -25,
    category: "Tech & business",
    description:
      "The Adibatla technology campus, with mapped office wings, glazed window grids, vertical fins and projecting floor bands.",
    aliases: ["tcs campus adibatla", "Tata Consultancy Services"],
  },
];
export type CampusProfile =
  "mall" | "hospital" | "industrial" | "residential" | "office";
export const campusProfiles: Record<
  string,
  { style: CampusProfile; radius: number; area: number }
> = {
  "inorbit-mall": { style: "mall", radius: 170, area: 250 },
  "gvk-one": { style: "mall", radius: 95, area: 200 },
  "lv-prasad": { style: "hospital", radius: 135, area: 70 },
  "gandhi-hospital": { style: "hospital", radius: 260, area: 100 },
  "sarath-city": { style: "mall", radius: 200, area: 250 },
  "begumpet-airport": { style: "industrial", radius: 1500, area: 150 },
  drdo: { style: "industrial", radius: 400, area: 120 },
  bdl: { style: "industrial", radius: 400, area: 120 },
  "midhani-township": { style: "residential", radius: 400, area: 40 },
  hakimpet: { style: "industrial", radius: 1200, area: 150 },
  "tcs-adibatla": { style: "office", radius: 600, area: 150 },
};
