import { StrictMode, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Display } from "./Display.js";
import { AuthGate, isAuthed } from "./AuthGate.js";
import { SetupScreen, getSavedLocation } from "./SetupScreen.js";
import type { Location } from "./SetupScreen.js";
import "../styles/display.css";

type Screen = "loading" | "auth" | "setup" | "display";

function App() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [location, setLocation] = useState<Location | null>(null);
  const [passwordRequired, setPasswordRequired] = useState(false);

  useEffect(() => {
    // Ask the server whether a password is required.
    fetch("/api/auth-check")
      .then((r) => r.json())
      .then((data: { passwordRequired: boolean }) => {
        setPasswordRequired(data.passwordRequired);

        if (data.passwordRequired && !isAuthed()) {
          setScreen("auth");
          return;
        }

        const saved = getSavedLocation();
        if (data.passwordRequired && !saved) {
          // Hosted mode but no location yet — show setup.
          setScreen("setup");
          return;
        }

        if (saved) setLocation(saved);
        setScreen("display");
      })
      .catch(() => {
        // If auth-check fails (local dev, network issue), go straight to display.
        const saved = getSavedLocation();
        if (saved) setLocation(saved);
        setScreen("display");
      });
  }, []);

  if (screen === "loading") return null;

  if (screen === "auth") {
    return (
      <AuthGate
        onAuthed={() => {
          const saved = getSavedLocation();
          if (passwordRequired && !saved) {
            setScreen("setup");
          } else {
            if (saved) setLocation(saved);
            setScreen("display");
          }
        }}
      />
    );
  }

  if (screen === "setup") {
    return (
      <SetupScreen
        onLocation={(loc) => {
          setLocation(loc);
          setScreen("display");
        }}
      />
    );
  }

  return <Display location={location ?? undefined} />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
