import { campusPlaces } from "./campus-sites";
import type { Category } from "./place-categories";
export type { Category } from "./place-categories";
export interface Landmark {
  id: string;
  name: string;
  area: string;
  category: Category;
  coordinates: [number, number];
  zoom: number;
  bearing: number;
  description: string;
  aliases?: string[];
}
export const landmarks: Landmark[] = [
  {
    id: "hussain-sagar",
    name: "Hussain Sagar",
    area: "The heart of the twin cities",
    category: "Lakes & reservoirs",
    coordinates: [78.4747, 17.4239],
    zoom: 14.3,
    bearing: -25,
    description:
      "A lake at the meeting point of Hyderabad and Secunderabad. Follow the curving shoreline, find the Buddha statue, and explore the dense city that grew around the water.",
  },
  {
    id: "charminar",
    name: "Charminar",
    area: "Old City",
    category: "Heritage & monuments",
    coordinates: [78.47467, 17.36156],
    zoom: 17,
    bearing: 30,
    description:
      "Four minarets mark the heart of the Old City. Explore the fine-grained street pattern around the monument, from Laad Bazaar to the courtyards of Mecca Masjid.",
  },
  {
    id: "golconda",
    name: "Golconda Fort",
    area: "Fort & granite hills",
    category: "Heritage & monuments",
    coordinates: [78.4011, 17.3833],
    zoom: 15.6,
    bearing: -35,
    description:
      "A fortified citadel rises from the Deccan granite. Tilt the map to see how the walls and surrounding neighbourhoods follow the rocky landscape.",
  },
  {
    id: "durgam-cheruvu",
    name: "Durgam Cheruvu",
    area: "Lake & cable bridge",
    category: "Lakes & reservoirs",
    coordinates: [78.3894, 17.4347],
    zoom: 15.6,
    bearing: 35,
    description:
      "A pocket of water and granite tucked into western Hyderabad. The cable bridge connects the lakefront to the office districts and residential hills.",
  },
  {
    id: "cyber-towers",
    name: "Cyber Towers",
    area: "HITEC City",
    category: "Tech & business",
    coordinates: [78.38113, 17.45047],
    zoom: 16,
    bearing: -30,
    description:
      "Explore the crossroads of HITEC City, where office campuses, busy arterial roads and residential neighbourhoods form Hyderabad’s technology district.",
  },
  {
    id: "financial-district",
    name: "Financial District",
    area: "Nanakramguda",
    category: "Tech & business",
    coordinates: [78.3475, 17.4191],
    zoom: 15.6,
    bearing: -40,
    description:
      "Large office footprints and new towers define this western district. Building heights depend on the available map data and may be estimated by the tile provider.",
  },
  {
    id: "kokapet",
    name: "Kokapet",
    area: "The western edge",
    category: "Neighbourhoods",
    coordinates: [78.335, 17.394],
    zoom: 15,
    bearing: 25,
    description:
      "See the transition from the city’s western development corridor to open ground near Gandipet. Mapping coverage varies in areas of rapid construction.",
  },
  {
    id: "gandipet",
    name: "Osman Sagar",
    area: "Gandipet reservoir",
    category: "Lakes & reservoirs",
    coordinates: [78.2985, 17.3814],
    zoom: 13.7,
    bearing: 20,
    description:
      "The city opens into a broad reservoir and a quieter landscape at Gandipet. Zoom out to trace the water body and the terrain that surrounds it.",
  },
  {
    id: "buddha",
    name: "Buddha Statue",
    area: "Hussain Sagar island",
    category: "Heritage & monuments",
    coordinates: [78.475004, 17.415568],
    zoom: 18.1,
    bearing: 0,
    description:
      "A standing Buddha rises from the island in Hussain Sagar. Orbit the illustrative sculpture to see its raised hand, carved robe folds, lotus pedestal and serene face.",
  },
  {
    id: "jubilee-hills",
    name: "Jubilee Hills",
    area: "The Deccan landscape",
    category: "Neighbourhoods",
    coordinates: [78.407, 17.431],
    zoom: 15,
    bearing: 45,
    description:
      "Winding roads and irregular blocks follow the hilly terrain. Increase terrain exaggeration to make the contours of the western neighbourhoods easier to read.",
  },
  {
    id: "t-hub",
    name: "T-Hub",
    area: "Hyderabad Knowledge City",
    category: "Tech & business",
    coordinates: [78.37902, 17.43401],
    zoom: 16.5,
    bearing: -25,
    description:
      "An innovation campus in the Knowledge City corridor. Explore its setting between the office campuses of Raidurg and the lake at Durgam Cheruvu.",
  },
  {
    id: "secretariat",
    name: "Telangana Secretariat",
    area: "South shore of Hussain Sagar",
    category: "Government & defence",
    coordinates: [78.4701, 17.4095],
    zoom: 16.3,
    bearing: 35,
    description:
      "The administrative campus sits along the southern edge of Hussain Sagar, between the lakefront and the city’s central neighbourhoods.",
  },
  {
    id: "chowmahalla",
    name: "Chowmahalla Palace",
    area: "Khilwat · Old City",
    category: "Heritage & monuments",
    coordinates: [78.4717, 17.3578],
    zoom: 17,
    bearing: 25,
    description:
      "Palace courtyards and gardens offer a different urban rhythm within the compact Old City, a short distance south of Charminar.",
  },
  {
    id: "mecca-masjid",
    name: "Mecca Masjid",
    area: "Charminar precinct",
    category: "Temples & worship",
    coordinates: [78.4734, 17.3604],
    zoom: 17,
    bearing: -20,
    description:
      "A major landmark beside Charminar. The large prayer hall and courtyard stand out against the smaller building footprints of the surrounding streets.",
  },
  {
    id: "falaknuma",
    name: "Falaknuma Palace",
    area: "Southern hilltop",
    category: "Heritage & monuments",
    coordinates: [78.4675, 17.3319],
    zoom: 16.4,
    bearing: 15,
    description:
      "A palace on a hill south of the Old City. Explore the landscaped estate and its elevated position above the neighbouring streets.",
  },
  {
    id: "airport",
    name: "Hyderabad Airport",
    area: "Shamshabad · RGIA",
    category: "Transport & aviation",
    coordinates: [78.4294, 17.2403],
    zoom: 13.8,
    bearing: -15,
    description:
      "Long runways, terminal buildings and sweeping access roads reveal the scale of the airport at the southern edge of metropolitan Hyderabad.",
  },
  {
    id: "birla-mandir",
    name: "Birla Mandir",
    area: "Naubat Pahad · Lakdi-ka-pul",
    category: "Temples & worship",
    coordinates: [78.46926, 17.4057],
    zoom: 17.2,
    bearing: 25,
    description:
      "The hilltop temple above central Hyderabad. Explore its setting on Naubat Pahad and the surrounding city slopes.",
    aliases: ["Birla temple"],
  },
  {
    id: "birla-planetarium",
    name: "B. M. Birla Planetarium",
    area: "Birla Science Centre · Adarsh Nagar",
    category: "Science & culture",
    coordinates: [78.47072, 17.40332],
    zoom: 17.3,
    bearing: -25,
    description:
      "The planetarium sits in the Birla Science Centre precinct, close to Birla Mandir. Zoom in to explore the campus and its place in the central city.",
    aliases: ["planetarium", "Birla science museum"],
  },
  {
    id: "nehru-zoo",
    name: "Nehru Zoological Park",
    area: "Zoo Park · Bahadurpura",
    category: "Parks & wildlife",
    coordinates: [78.44556, 17.35144],
    zoom: 15.2,
    bearing: 20,
    description:
      "Explore the zoo’s broad grounds beside Mir Alam Tank, with mapped paths, water and landscaped areas.",
    aliases: ["zoo park", "Hyderabad zoo", "Nehru zoo"],
  },
  {
    id: "durgam-bridge",
    name: "Durgam Cheruvu Cable Bridge",
    area: "Madhapur · Jubilee Hills crossing",
    category: "Transport & aviation",
    coordinates: [78.38988, 17.43169],
    zoom: 16.8,
    bearing: 45,
    description:
      "A dedicated view of the bridge crossing Durgam Cheruvu, between the Madhapur office district and the Jubilee Hills side of the lake.",
    aliases: [
      "Durgam Cheruvu suspension bridge",
      "cable bridge",
      "hanging bridge",
    ],
  },
  {
    id: "chilkur-balaji",
    name: "Chilkur Balaji Temple",
    area: "Chilkur · Osman Sagar",
    category: "Temples & worship",
    coordinates: [78.29884, 17.35877],
    zoom: 17.1,
    bearing: 20,
    description:
      "The temple precinct near Osman Sagar, southwest of the city. Explore its village setting and the surrounding open landscape.",
    aliases: ["Chilkoor Balaji", "Chilukur Balaji", "Visa Balaji temple"],
  },
  {
    id: "jagannath-temple",
    name: "Shri Jagannath Swami Temple",
    area: "Road No. 12 · Banjara Hills",
    category: "Temples & worship",
    coordinates: [78.425925, 17.415005],
    zoom: 17.3,
    bearing: -25,
    description:
      "The Jagannath temple precinct in Banjara Hills, set among the neighbourhood’s winding roads and rising terrain.",
    aliases: [
      "Shri Jagannatha Swami Temple",
      "Sri Jagannath temple",
      "Puri Jagannath temple",
    ],
  },
  {
    id: "secunderabad-gurdwara",
    name: "Gurdwara Sahib Secunderabad",
    area: "Regimental Bazaar · Shivaji Nagar",
    category: "Temples & worship",
    coordinates: [78.500577, 17.436064],
    zoom: 17.4,
    bearing: 20,
    description:
      "Gurdwara Sahib in Regimental Bazaar, within the dense neighbourhood near Secunderabad railway station.",
    aliases: [
      "Secunderabad Gurudwara",
      "Secunderbad gurudwara",
      "Gurudwara Saheb",
    ],
  },
  {
    id: "secunderabad-clock-tower",
    name: "Secunderabad Clock Tower",
    area: "Clock Tower Park · Secunderabad",
    category: "Heritage & monuments",
    coordinates: [78.498554, 17.440903],
    zoom: 17.5,
    bearing: -20,
    description:
      "The clock tower and its small park form a landmark in central Secunderabad, south of Parade Grounds.",
    aliases: ["Secunderbad clock tower"],
  },
  {
    id: "parade-grounds",
    name: "Parade Grounds",
    area: "Cantonment · Secunderabad",
    category: "Sports grounds",
    coordinates: [78.49294, 17.44488],
    zoom: 15.9,
    bearing: 15,
    description:
      "Explore the large open parade ground in Secunderabad and the surrounding cantonment streets.",
    aliases: ["Parade Ground", "Secunderabad parade grounds"],
  },
  {
    id: "gymkhana-grounds",
    name: "Gymkhana Grounds",
    area: "Cricket grounds · Secunderabad",
    category: "Sports grounds",
    coordinates: [78.49001, 17.44499],
    zoom: 16.5,
    bearing: -20,
    description:
      "The cricket grounds west of Parade Grounds provide a broad open space within Secunderabad’s urban fabric.",
    aliases: ["Gymkhana Ground", "Gymkhana cricket stadium"],
  },
  {
    id: "chanchalguda-jail",
    name: "Chanchalguda Central Jail",
    area: "Chanchalguda · Old City",
    category: "Government & defence",
    coordinates: [78.499675, 17.366838],
    zoom: 16.3,
    bearing: 25,
    description:
      "An established institutional precinct in Chanchalguda. View the mapped compound and its setting in the eastern part of the Old City.",
    aliases: ["Chanchalgunda jail", "Chanchalguda prison", "Chanchalguda jail"],
  },
  ...campusPlaces,
];
export const tourStops = [
  "charminar",
  "golconda",
  "hussain-sagar",
  "jubilee-hills",
  "cyber-towers",
  "financial-district",
  "kokapet",
  "gandipet",
].map((id) => landmarks.find((l) => l.id === id)!);
export function searchLandmarks(query: string, category = "All places") {
  const q = query.trim().toLowerCase();
  return landmarks.filter(
    (l) =>
      (category === "All places" || l.category === category) &&
      `${l.name} ${l.area} ${l.category} ${(l.aliases ?? []).join(" ")}`
        .toLowerCase()
        .includes(q),
  );
}
