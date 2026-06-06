// Bundled airport geometry, drawn at true geographic position so departures and
// arrivals visibly line up with the runways. Coordinates from OurAirports (VECC).

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
  runways: Runway[];
}

export const VECC: Airport = {
  icao: "VECC",
  name: "CCU",
  runways: [
    { leIdent: "01L", heIdent: "19R", le: [22.6402, 88.444], he: [22.6617, 88.4465], widthFt: 150 },
    { leIdent: "01R", heIdent: "19L", le: [22.6422, 88.4463], he: [22.6748, 88.4501], widthFt: 150 },
  ],
};

/** Airports drawn on the map. */
export const AIRPORTS: Airport[] = [VECC];
