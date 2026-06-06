// Manages one Poller per city (keyed by ICAO). When a client sends their
// lat/lon, we find the nearest supported airport and route them to that city's
// poller — creating it on first use. At most 5 pollers run simultaneously.

import type { Aircraft, Config } from "@shared/index.js";
import { Poller, OpenSkySupplementer } from "./datasource.js";
import type { RouteEnricher } from "./enrich/routes.js";
import type { ConfigStore } from "./config-store.js";

const AIRPORTS = [
  { icao: "VECC", name: "Kolkata",   lat: 22.6549, lon: 88.4467 },
  { icao: "VABB", name: "Mumbai",    lat: 19.0887, lon: 72.8679 },
  { icao: "VIDP", name: "Delhi",     lat: 28.5562, lon: 77.1000 },
  { icao: "VOBL", name: "Bangalore", lat: 13.1979, lon: 77.7063 },
  { icao: "VOMM", name: "Chennai",   lat: 12.9900, lon: 80.1693 },
];

export interface CityInfo {
  icao: string;
  name: string;
  lat: number;
  lon: number;
}

/** Return the nearest supported airport for a given lat/lon. */
export function nearestAirport(lat: number, lon: number): CityInfo {
  let best = AIRPORTS[0];
  let bestDist = Infinity;
  for (const ap of AIRPORTS) {
    const d = (ap.lat - lat) ** 2 + (ap.lon - lon) ** 2;
    if (d < bestDist) { bestDist = d; best = ap; }
  }
  return best;
}

export interface CityPoller {
  poller: Poller;
  openSky: OpenSkySupplementer;
  city: CityInfo;
}

export type AircraftCallback = (icao: string, now: number, aircraft: Aircraft[]) => void;

export class LocationManager {
  private cities = new Map<string, CityPoller>();

  constructor(
    private store: ConfigStore,
    private enricher: RouteEnricher,
    private apiUrlTemplate: string,
    private pollMs: number,
    private apiPollMs: number,
    private onAircraft: AircraftCallback,
  ) {}

  /** Get or create the poller for the city nearest to lat/lon. */
  getCity(lat: number, lon: number): CityInfo {
    const city = nearestAirport(lat, lon);
    if (!this.cities.has(city.icao)) {
      this.createCity(city);
    }
    return city;
  }

  private createCity(city: CityInfo): void {
    // Each city poller uses the airport center as the geographic anchor,
    // but inherits all visual/filter settings from the shared config store.
    const getConfig = (): Config => ({
      ...this.store.get(),
      centerLat: city.lat,
      centerLon: city.lon,
    });

    const poller = new Poller({
      source: "api",
      radioUrl: "",
      apiUrlTemplate: this.apiUrlTemplate,
      pollMs: this.pollMs,
      supplementApi: false,
      apiPollMs: this.apiPollMs,
      getConfig,
      enricher: this.enricher,
      onSnapshot: (now, aircraft) => this.onAircraft(city.icao, now, aircraft),
      onStatus: () => { /* per-city status not broadcast separately */ },
    });

    const openSky = new OpenSkySupplementer(getConfig);
    poller.openSky = openSky;

    openSky.start();
    poller.start();

    this.cities.set(city.icao, { poller, openSky, city });
    console.log(`[location-manager] started poller for ${city.name} (${city.icao})`);
  }

  stopAll(): void {
    for (const { poller, openSky } of this.cities.values()) {
      poller.stop();
      openSky.stop();
    }
    this.cities.clear();
  }

  getSnapshot(icao: string): { now: number; aircraft: Aircraft[] } {
    return this.cities.get(icao)?.poller.getSnapshot() ?? { now: Date.now(), aircraft: [] };
  }
}
