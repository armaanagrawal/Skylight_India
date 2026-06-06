// WebSocket hub: tracks connected clients (display + control panels),
// broadcasts config / aircraft / status, and applies inbound config commands.
// In hosted mode, clients send their lat/lon in the hello message and are
// routed to a city-specific poller — only that city's aircraft are sent to them.

import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "node:http";
import type {
  ClientMessage,
  ServerMessage,
  Config,
  Aircraft,
  SourceStatus,
} from "@shared/index.js";
import type { ConfigStore } from "./config-store.js";
import type { LocationManager } from "./location-manager.js";

export interface HubDeps {
  store: ConfigStore;
  locationManager?: LocationManager;
  /** Fallback snapshot for single-location (local) mode. */
  getSnapshot?: () => { now: number; aircraft: Aircraft[] };
  getStatus?: () => SourceStatus;
}

export class Hub {
  private wss: WebSocketServer;
  private clients = new Set<WebSocket>();
  /** ws → city ICAO (only set in hosted/multi-city mode). */
  private clientCity = new Map<WebSocket, string>();

  constructor(server: Server, private deps: HubDeps) {
    this.wss = new WebSocketServer({ server, path: "/ws" });
    this.wss.on("connection", (ws) => this.onConnect(ws));

    // Push config changes from any source (REST or another WS client).
    deps.store.subscribe((config) => this.broadcast({ type: "config", config }));
  }

  private onConnect(ws: WebSocket): void {
    this.clients.add(ws);

    // Prime with config immediately; aircraft sent after location is known.
    this.send(ws, { type: "config", config: this.deps.store.get() });

    // In single-location mode, send current snapshot right away.
    if (!this.deps.locationManager && this.deps.getSnapshot) {
      const snap = this.deps.getSnapshot();
      this.send(ws, { type: "aircraft", now: snap.now, aircraft: snap.aircraft });
    }
    if (this.deps.getStatus) {
      this.send(ws, { type: "status", status: this.deps.getStatus() });
    }

    ws.on("message", (raw) => this.onMessage(ws, raw.toString()));
    ws.on("close", () => {
      this.clients.delete(ws);
      this.clientCity.delete(ws);
    });
    ws.on("error", () => {
      this.clients.delete(ws);
      this.clientCity.delete(ws);
    });
  }

  private onMessage(ws: WebSocket, raw: string): void {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw) as ClientMessage;
    } catch {
      return;
    }
    switch (msg.type) {
      case "hello": {
        if (this.deps.locationManager && msg.lat != null && msg.lon != null) {
          const city = this.deps.locationManager.getCity(msg.lat, msg.lon);
          this.clientCity.set(ws, city.icao);
          // Use the user's actual coordinates as the map center — the airport
          // lookup only determines which poller to route them to.
          this.deps.store.patch({ centerLat: msg.lat, centerLon: msg.lon });
          // Send the initial snapshot for this city.
          const snap = this.deps.locationManager.getSnapshot(city.icao);
          this.send(ws, { type: "aircraft", now: snap.now, aircraft: snap.aircraft });
          console.log(`[hub] client assigned to ${city.name} (${city.icao})`);
        }
        break;
      }
      case "patchConfig":
        this.deps.store.patch(msg.patch);
        break;
      case "setConfig":
        this.deps.store.set(msg.config);
        break;
      case "resetConfig":
        this.deps.store.reset();
        break;
    }
  }

  /** Broadcast aircraft only to clients in a specific city. */
  broadcastToCity(icao: string, now: number, aircraft: Aircraft[]): void {
    const msg = JSON.stringify({ type: "aircraft", now, aircraft } satisfies ServerMessage);
    for (const ws of this.clients) {
      if (this.clientCity.get(ws) === icao && ws.readyState === WebSocket.OPEN) {
        ws.send(msg);
      }
    }
  }

  broadcastAircraft(now: number, aircraft: Aircraft[]): void {
    this.broadcast({ type: "aircraft", now, aircraft });
  }
  broadcastStatus(status: SourceStatus): void {
    this.broadcast({ type: "status", status });
  }
  broadcastConfig(config: Config): void {
    this.broadcast({ type: "config", config });
  }

  private broadcast(msg: ServerMessage): void {
    const data = JSON.stringify(msg);
    for (const ws of this.clients) {
      if (ws.readyState === WebSocket.OPEN) ws.send(data);
    }
  }
  private send(ws: WebSocket, msg: ServerMessage): void {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  }
}
