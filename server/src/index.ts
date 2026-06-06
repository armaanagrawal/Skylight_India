// Entry point. Wires the config store, data poller, WebSocket hub, REST API,
// and (in production) serves the built web app. Binds 0.0.0.0 so the control
// panel is reachable from your phone on the LAN.
//
// HOSTED MODE: when PASSWORD env var is set, /api/auth is enabled and the
// LocationManager routes each client to the nearest supported city's poller.
// LOCAL MODE: single fixed location from LAT/LON env vars (original behaviour).

import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { existsSync } from "node:fs";
import express from "express";
import type { DataSource } from "@shared/index.js";
import { ConfigStore } from "./config-store.js";
import { RouteEnricher } from "./enrich/routes.js";
import { Poller, OpenSkySupplementer } from "./datasource.js";
import { LocationManager } from "./location-manager.js";
import { Hub } from "./hub.js";
import { TleStore } from "./tle.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "../data");
const WEB_DIST = resolve(__dirname, "../../web/dist");

// Load .env from the project root if present (simple key=value, no package needed).
import { readFileSync } from "node:fs";
try {
  const env = readFileSync(new URL("../../../.env", import.meta.url), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.+?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
} catch { /* no .env file — that's fine */ }

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? "0.0.0.0";
const SOURCE = (process.env.DATA_SOURCE as DataSource) ?? "radio";
const RADIO_URL =
  process.env.AIRCRAFT_JSON_URL ?? "http://localhost:8080/data/aircraft.json";
const API_URL =
  process.env.API_URL ?? "https://api.airplanes.live/v2/point/{lat}/{lon}/{r}";
const POLL_MS = Number(process.env.POLL_MS ?? 1000);
const ROUTE_CACHE_HOURS = Number(process.env.ROUTE_CACHE_HOURS ?? 12);
const SUPPLEMENT_API = (process.env.SUPPLEMENT_API ?? "1") !== "0";
const API_POLL_MS = Number(process.env.API_POLL_MS ?? 4000);

/** Set PASSWORD env var to enable the auth gate + multi-city hosted mode. */
const PASSWORD = process.env.PASSWORD ?? null;
const HOSTED = PASSWORD !== null;

async function main(): Promise<void> {
  const store = new ConfigStore(resolve(DATA_DIR, "config.json"));
  await store.load();

  // Apply location from .env if provided (local mode only).
  if (!HOSTED) {
    const envLat = process.env.LAT ? Number(process.env.LAT) : null;
    const envLon = process.env.LON ? Number(process.env.LON) : null;
    if (envLat !== null && envLon !== null && !isNaN(envLat) && !isNaN(envLon)) {
      store.patch({ centerLat: envLat, centerLon: envLon });
      console.log(`[server] location set from .env: ${envLat}, ${envLon}`);
    }
  }

  const enricher = new RouteEnricher(
    resolve(DATA_DIR, "route-cache.json"),
    ROUTE_CACHE_HOURS,
  );
  await enricher.load();

  const tleStore = new TleStore(resolve(DATA_DIR, "tle-cache.json"));
  await tleStore.load();

  const app = express();
  app.use(express.json());

  const server = createServer(app);

  // --- Auth (hosted mode only) ---
  if (HOSTED) {
    app.get("/api/auth-check", (_req, res) => {
      res.json({ passwordRequired: true });
    });
    app.post("/api/auth", (req, res) => {
      const { password } = req.body as { password?: string };
      if (password === PASSWORD) {
        res.json({ ok: true });
      } else {
        res.status(401).json({ ok: false, error: "Wrong password" });
      }
    });
  } else {
    app.get("/api/auth-check", (_req, res) => {
      res.json({ passwordRequired: false });
    });
  }

  let hub: Hub;

  if (HOSTED) {
    // Multi-city mode: LocationManager creates one poller per city on demand.
    const locationManager = new LocationManager(
      store,
      enricher,
      API_URL,
      POLL_MS,
      API_POLL_MS,
      (icao, now, aircraft) => hub.broadcastToCity(icao, now, aircraft),
    );

    hub = new Hub(server, { store, locationManager });
    console.log(`[server] hosted mode — password required, multi-city routing active`);
  } else {
    // Single-location mode: original behaviour.
    const poller = new Poller({
      source: SOURCE,
      radioUrl: RADIO_URL,
      apiUrlTemplate: API_URL,
      pollMs: POLL_MS,
      supplementApi: SUPPLEMENT_API,
      apiPollMs: API_POLL_MS,
      getConfig: () => store.get(),
      enricher,
      onSnapshot: (now, aircraft) => hub.broadcastAircraft(now, aircraft),
      onStatus: (status) => hub.broadcastStatus(status),
    });

    const openSky = new OpenSkySupplementer(() => store.get());
    poller.openSky = openSky;
    openSky.start();

    hub = new Hub(server, {
      store,
      getSnapshot: () => poller.getSnapshot(),
      getStatus: () => poller.getStatus(),
    });

    poller.start();

    // Extra REST endpoints (local mode only — useful for debugging).
    app.get("/api/aircraft", (_req, res) => res.json(poller.getSnapshot()));
    app.get("/api/status", (_req, res) => res.json(poller.getStatus()));
    app.post("/api/source", (req, res) => {
      const s = req.body?.source;
      if (s !== "radio" && s !== "api") {
        return res.status(400).json({ error: "source must be 'radio' or 'api'" });
      }
      poller.setSource(s);
      res.json(poller.getStatus());
    });
  }

  // --- REST API ---
  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.get("/api/config", (_req, res) => res.json(store.get()));
  app.post("/api/config", (req, res) => res.json(store.patch(req.body)));
  app.post("/api/config/reset", (_req, res) => res.json(store.reset()));
  app.get("/api/tle", async (_req, res) => res.json(await tleStore.get()));

  // --- static web (production build) ---
  if (existsSync(WEB_DIST)) {
    app.use(express.static(WEB_DIST));
    app.get("/control", (_req, res) => res.sendFile(resolve(WEB_DIST, "control.html")));
    app.get("/", (_req, res) => res.sendFile(resolve(WEB_DIST, "index.html")));
  } else {
    app.get("/", (_req, res) =>
      res
        .type("text/plain")
        .send("Web build not found. Run `npm run build`, or use the Vite dev server."),
    );
  }

  server.listen(PORT, HOST, () => {
    console.log(`[server] listening on http://${HOST}:${PORT}`);
    if (HOSTED) {
      console.log(`[server] hosted mode — waiting for clients to send location`);
    } else {
      console.log(`[server] data source: ${SOURCE} (${SOURCE === "radio" ? RADIO_URL : API_URL})`);
    }
    console.log(`[server] control panel: http://<this-host>:${PORT}/control`);
  });
}

main().catch((err) => {
  console.error("[server] fatal:", err);
  process.exit(1);
});
