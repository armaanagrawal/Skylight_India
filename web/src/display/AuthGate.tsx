import { useState } from "react";

const STORAGE_KEY = "skylight_auth";

/** Returns true if we already have a valid auth token stored. */
export function isAuthed(): boolean {
  return localStorage.getItem(STORAGE_KEY) === "1";
}

interface Props {
  onAuthed: () => void;
}

export function AuthGate({ onAuthed }: Props) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        localStorage.setItem(STORAGE_KEY, "1");
        onAuthed();
      } else {
        setError("Wrong password — try again.");
        setPassword("");
      }
    } catch {
      setError("Can't reach the server. Check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="gate-root">
      <div className="gate-card">
        <div className="gate-icon">✈</div>
        <h1 className="gate-title">Skylight India</h1>
        <p className="gate-subtitle">Live flights overhead — enter the access code to continue.</p>
        <form onSubmit={submit} className="gate-form">
          <input
            className="gate-input"
            type="password"
            placeholder="Access code"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            autoComplete="current-password"
          />
          <button className="gate-btn" type="submit" disabled={loading || !password}>
            {loading ? "Checking…" : "Enter"}
          </button>
        </form>
        {error && <p className="gate-error">{error}</p>}
      </div>
      <p className="gate-footer">
        built on{" "}
        <a href="https://github.com/armaanagrawal/Skylight_India" target="_blank" rel="noopener noreferrer">
          Skylight India
        </a>{" "}
        using{" "}
        <a href="https://github.com/cpaczek/skylight" target="_blank" rel="noopener noreferrer">
          cpaczek/skylight
        </a>
      </p>
    </div>
  );
}
