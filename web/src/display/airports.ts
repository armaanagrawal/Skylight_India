// Bundled airport geometry for major Indian cities.
// Drawn at true geographic position so departures and arrivals line up with runways.
// Coordinates from OurAirports data.

export interface Runway {
  leIdent: string;
  heIdent: string;
  le: [number, number]; // [lat, lon]
  he: [number, number];
  widthFt: number;
}

export interface Airport {
  icao: string;
  name: string;
  lat: number; // airport center, for nearest-match
  lon: number;
  runways: Runway[];
}

export const VECC: Airport = {
  icao: "VECC", name: "CCU", lat: 22.6549, lon: 88.4467,
  runways: [
    { leIdent: "01L", heIdent: "19R", le: [22.6402, 88.444],    he: [22.6617, 88.4465], widthFt: 150 },
    { leIdent: "01R", heIdent: "19L", le: [22.6422, 88.4463],   he: [22.6748, 88.4501], widthFt: 150 },
  ],
};

export const VABB: Airport = {
  icao: "VABB", name: "BOM", lat: 19.0887, lon: 72.8679,
  runways: [
    { leIdent: "09",  heIdent: "27",  le: [19.0884, 72.848],    he: [19.0889, 72.8811], widthFt: 197 },
    { leIdent: "14",  heIdent: "32",  le: [19.0985, 72.8573],   he: [19.0801, 72.8772], widthFt: 148 },
  ],
};

export const VIDP: Airport = {
  icao: "VIDP", name: "DEL", lat: 28.5562, lon: 77.1000,
  runways: [
    { leIdent: "09",  heIdent: "27",  le: [28.5705, 77.088],    he: [28.5698, 77.117],  widthFt: 148 },
    { leIdent: "10",  heIdent: "28",  le: [28.5672, 77.0848],   he: [28.5585, 77.1225], widthFt: 148 },
    { leIdent: "11R", heIdent: "29L", le: [28.5472, 77.0655],   he: [28.5377, 77.1095], widthFt: 197 },
    { leIdent: "11L", heIdent: "29R", le: [28.5501, 77.0682],   he: [28.5407, 77.1119], widthFt: 148 },
  ],
};

export const VOBL: Airport = {
  icao: "VOBL", name: "BLR", lat: 13.1986, lon: 77.7066,
  runways: [
    { leIdent: "09L", heIdent: "27R", le: [13.2072, 77.6861],   he: [13.2068, 77.723],  widthFt: 148 },
    { leIdent: "09R", heIdent: "27L", le: [13.1897, 77.69],     he: [13.1894, 77.7269], widthFt: 148 },
  ],
};

export const VOMM: Airport = {
  icao: "VOMM", name: "MAA", lat: 12.9941, lon: 80.1709,
  runways: [
    { leIdent: "07",  heIdent: "25",  le: [12.9841, 80.153],    he: [12.996,  80.1844], widthFt: 148 },
    { leIdent: "12",  heIdent: "30",  le: [13.0019, 80.1658],   he: [12.9934, 80.1825], widthFt: 148 },
  ],
};

const ALL_AIRPORTS: Airport[] = [VECC, VABB, VIDP, VOBL, VOMM];

/** Return the airport closest to the given coordinates. */
function nearestAirport(lat: number, lon: number): Airport {
  let best = ALL_AIRPORTS[0];
  let bestDist = Infinity;
  for (const ap of ALL_AIRPORTS) {
    const d = Math.hypot(ap.lat - lat, ap.lon - lon);
    if (d < bestDist) { bestDist = d; best = ap; }
  }
  return best;
}

/** Airports to draw — automatically picks the one nearest to your coordinates. */
export function getAirports(centerLat: number, centerLon: number): Airport[] {
  return [nearestAirport(centerLat, centerLon)];
}
