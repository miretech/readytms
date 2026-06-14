import { logout, type MobileDriver } from "../api";
import { isNativeApp } from "../native";

export function SettingsScreen({
  driver,
  onBack,
  onLogout,
}: {
  driver: MobileDriver;
  onBack: () => void;
  onLogout: () => void;
}) {
  async function handleLogout() {
    await logout();
    onLogout();
  }

  return (
    <div className="screen">
      <header className="header">
        <button className="icon" onClick={onBack} aria-label="Back">
          ←
        </button>
        <div className="strong">Settings</div>
        <span />
      </header>

      <section className="card">
        <div className="section-title">Account</div>
        <div className="row-between">
          <div className="muted small">Name</div>
          <div>{driver.name}</div>
        </div>
        <div className="row-between">
          <div className="muted small">Email</div>
          <div>{driver.email}</div>
        </div>
        <div className="row-between">
          <div className="muted small">Phone</div>
          <div>{driver.phone}</div>
        </div>
        <div className="row-between">
          <div className="muted small">Status</div>
          <div>{driver.status}</div>
        </div>
      </section>

      <section className="card">
        <div className="section-title">App</div>
        <div className="row-between">
          <div className="muted small">Mode</div>
          <div>{isNativeApp() ? "Native app" : "Web browser"}</div>
        </div>
        <div className="row-between">
          <div className="muted small">Backend</div>
          <div className="small">{import.meta.env.VITE_API_BASE_URL}</div>
        </div>
      </section>

      <button className="destructive" onClick={handleLogout}>
        Sign out
      </button>
    </div>
  );
}
