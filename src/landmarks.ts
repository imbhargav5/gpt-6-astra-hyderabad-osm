export type Category = "Heritage" | "Water & nature" | "Modern city";
export interface Landmark {
  id: string;
  name: string;
  area: string;
  category: Category;
  coordinates: [number, number];
  zoom: number;
  bearing: number;
  description: string;
}
export const landmarks: Landmark[] = [
  {
    id: "hussain-sagar",
    name: "Hussain Sagar",
    area: "The heart of the twin cities",
    category: "Water & nature",
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
    category: "Heritage",
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
    category: "Heritage",
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
    category: "Water & nature",
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
    category: "Modern city",
    coordinates: [78.3772, 17.4506],
    zoom: 16,
    bearing: -30,
    description:
      "Explore the crossroads of HITEC City, where office campuses, busy arterial roads and residential neighbourhoods form Hyderabad’s technology district.",
  },
  {
    id: "financial-district",
    name: "Financial District",
    area: "Nanakramguda",
    category: "Modern city",
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
    category: "Modern city",
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
    category: "Water & nature",
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
    category: "Heritage",
    coordinates: [78.475, 17.4156],
    zoom: 17,
    bearing: 0,
    description:
      "An island landmark in Hussain Sagar. The map shows the mapped island and surrounding water; the statue is identified by a landmark marker.",
  },
  {
    id: "jubilee-hills",
    name: "Jubilee Hills",
    area: "The Deccan landscape",
    category: "Water & nature",
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
    category: "Modern city",
    coordinates: [78.3829, 17.4343],
    zoom: 16.5,
    bearing: -25,
    description:
      "An innovation campus in the Knowledge City corridor. Explore its setting between the office campuses of Raidurg and the lake at Durgam Cheruvu.",
  },
  {
    id: "secretariat",
    name: "Telangana Secretariat",
    area: "South shore of Hussain Sagar",
    category: "Modern city",
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
    category: "Heritage",
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
    category: "Heritage",
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
    category: "Heritage",
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
    category: "Modern city",
    coordinates: [78.4294, 17.2403],
    zoom: 13.8,
    bearing: -15,
    description:
      "Long runways, terminal buildings and sweeping access roads reveal the scale of the airport at the southern edge of metropolitan Hyderabad.",
  },
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
      `${l.name} ${l.area} ${l.category}`.toLowerCase().includes(q),
  );
}
