import { useState } from "react";

const STORAGE_KEY = "skylight_location";

export interface Location {
  lat: number;
  lon: number;
}

/** Returns saved location, or null if not yet set. */
export function getSavedLocation(): Location | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Location;
  } catch {
    return null;
  }
}

const AIRPORTS = [
  { icao: "VECC", name: "Kolkata",   lat: 22.6549, lon: 88.4467 },
  { icao: "VABB", name: "Mumbai",    lat: 19.0887, lon: 72.8679 },
  { icao: "VIDP", name: "Delhi",     lat: 28.5562, lon: 77.1000 },
  { icao: "VOBL", name: "Bangalore", lat: 13.1979, lon: 77.7063 },
  { icao: "VOMM", name: "Chennai",   lat: 12.9900, lon: 80.1693 },
];

function nearestCity(lat: number, lon: number): string {
  let best = AIRPORTS[0];
  let bestDist = Infinity;
  for (const ap of AIRPORTS) {
    const d = (ap.lat - lat) ** 2 + (ap.lon - lon) ** 2;
    if (d < bestDist) { bestDist = d; best = ap; }
  }
  return best.name;
}

interface Props {
  onLocation: (loc: Location) => void;
}

export function SetupScreen({ onLocation }: Props) {
  const [raw, setRaw] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

  function parse(value: string): { lat: number; lon: number } | null {
    // Accept "lat, lon" or "lat lon" with any amount of whitespace.
    const parts = value.trim().split(/[\s,]+/);
    if (parts.length !== 2) return null;
    const lat = parseFloat(parts[0]);
    const lon = parseFloat(parts[1]);
    if (isNaN(lat) || isNaN(lon)) return null;
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
    return { lat, lon };
  }

  function onChange(value: string) {
    setRaw(value);
    setError("");
    const loc = parse(value);
    if (loc) {
      setPreview(nearestCity(loc.lat, loc.lon));
    } else {
      setPreview(null);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const loc = parse(raw);
    if (!loc) {
      setError("Paste the two numbers exactly as shown on Google Maps, e.g. 22.4933, 88.4036");
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
    onLocation(loc);
  }

  return (
    <div className="gate-root">
      <div className="gate-card">
        <div className="gate-icon">📍</div>
        <h1 className="gate-title">Your location</h1>
        <p className="gate-subtitle">
          Open Google Maps, right-click your home, and paste the coordinates below.
        </p>
        <form onSubmit={submit} className="gate-form">
          <input
            className="gate-input"
            type="text"
            placeholder="22.4933, 88.4036"
            value={raw}
            onChange={(e) => onChange(e.target.value)}
            autoFocus
          />
          {preview && (
            <p className="gate-preview">Nearest airport: <strong>{preview}</strong></p>
          )}
          <button className="gate-btn" type="submit" disabled={!parse(raw)}>
            Start tracking
          </button>
        </form>
        {error && <p className="gate-error">{error}</p>}
      </div>
    </div>
  );
}
