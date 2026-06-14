import { useEffect, useState } from "react";
import { getSession, getMe, type MobileDriver } from "./api";
import { LoginScreen } from "./screens/LoginScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { LoadDetailScreen } from "./screens/LoadDetailScreen";
import { SettingsScreen } from "./screens/SettingsScreen";

type Screen =
  | { name: "login" }
  | { name: "home" }
  | { name: "load"; loadId: string }
  | { name: "settings" };

export function App() {
  const [screen, setScreen] = useState<Screen>({ name: "login" });
  const [driver, setDriver] = useState<MobileDriver | null>(null);
  const [loading, setLoading] = useState(true);

  // On boot, see if we already have a session.
  useEffect(() => {
    (async () => {
      const session = getSession();
      if (!session) {
        setLoading(false);
        return;
      }
      try {
        const { driver } = await getMe();
        if (driver) {
          setDriver(driver);
          setScreen({ name: "home" });
        }
      } catch {
        // Session expired — fall back to login.
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="screen center">
        <div className="logo">ReadyTMS</div>
        <div className="muted">Loading…</div>
      </div>
    );
  }

  if (screen.name === "login" || !driver) {
    return (
      <LoginScreen
        onLogin={(d) => {
          setDriver(d);
          setScreen({ name: "home" });
        }}
      />
    );
  }
  if (screen.name === "home") {
    return (
      <HomeScreen
        driver={driver}
        onSelectLoad={(loadId) => setScreen({ name: "load", loadId })}
        onSettings={() => setScreen({ name: "settings" })}
      />
    );
  }
  if (screen.name === "load") {
    return (
      <LoadDetailScreen
        loadId={screen.loadId}
        driver={driver}
        onBack={() => setScreen({ name: "home" })}
      />
    );
  }
  if (screen.name === "settings") {
    return (
      <SettingsScreen
        driver={driver}
        onBack={() => setScreen({ name: "home" })}
        onLogout={() => {
          setDriver(null);
          setScreen({ name: "login" });
        }}
      />
    );
  }
  return null;
}
