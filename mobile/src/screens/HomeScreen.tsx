import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getLoadsForDriver, pushGpsLocation, type MobileDriver, type MobileLoad } from "../api";
import {
  isNativeApp,
  requestLocationPermission,
  watchLocation,
  type Coords,
} from "../native";

const GPS_PUSH_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes

export function HomeScreen({
  driver,
  onSelectLoad,
  onSettings,
}: {
  driver: MobileDriver;
  onSelectLoad: (loadId: string) => void;
  onSettings: () => void;
}) {
  const [onDuty, setOnDuty] = useState(false);
  const [lastPing, setLastPing] = useState<Date | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const stopWatchRef = useRef<(() => void) | null>(null);
  const lastPushedAtRef = useRef<number>(0);
  const latestCoordsRef = useRef<Coords | null>(null);

  const { data: loads = [], isLoading, refetch } = useQuery<MobileLoad[]>({
    queryKey: ["mobile-loads", driver.id],
    queryFn: () => getLoadsForDriver(driver.id),
    refetchInterval: 60_000,
  });

  const activeLoads = loads.filter(
    (l) => l.status !== "Delivered" && l.status !== "Cancelled",
  );
  const deliveredCount = loads.length - activeLoads.length;

  // GPS watch lifecycle — start when on duty, stop when off.
  useEffect(() => {
    if (!onDuty) {
      stopWatchRef.current?.();
      stopWatchRef.current = null;
      return;
    }

    let cancelled = false;
    (async () => {
      const granted = await requestLocationPermission();
      if (!granted) {
        if (!cancelled) {
          setGpsError("Location permission denied. Enable in Settings.");
          setOnDuty(false);
        }
        return;
      }

      const stop = await watchLocation(async (coords) => {
        latestCoordsRef.current = coords;
        const now = Date.now();
        // Throttle server pushes; the watch may fire much more frequently.
        if (now - lastPushedAtRef.current < GPS_PUSH_INTERVAL_MS) return;
        lastPushedAtRef.current = now;
        try {
          await pushGpsLocation(driver.id, coords);
          setLastPing(new Date(now));
          setGpsError(null);
        } catch (err: any) {
          setGpsError(err.message || "Failed to send location");
        }
      });
      if (cancelled) {
        stop();
      } else {
        stopWatchRef.current = stop;
      }
    })();

    return () => {
      cancelled = true;
      stopWatchRef.current?.();
      stopWatchRef.current = null;
    };
  }, [onDuty, driver.id]);

  return (
    <div className="screen">
      <header className="header">
        <div>
          <div className="muted small">Hi,</div>
          <div className="strong">{driver.name}</div>
        </div>
        <button className="icon" onClick={onSettings} aria-label="Settings">
          ⚙
        </button>
      </header>

      <section className="card duty-card">
        <div className="duty-row">
          <div>
            <div className="strong">{onDuty ? "On Duty" : "Off Duty"}</div>
            <div className="muted small">
              {onDuty
                ? lastPing
                  ? `Last GPS ping ${lastPing.toLocaleTimeString()}`
                  : "Sharing location…"
                : "Toggle on to share your location with dispatch"}
            </div>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={onDuty}
              onChange={(e) => setOnDuty(e.target.checked)}
            />
            <span className="slider" />
          </label>
        </div>
        {gpsError && <div className="error small">{gpsError}</div>}
        {!isNativeApp() && onDuty && (
          <div className="warn small">
            ⚠ Running in browser — GPS only works while this tab is open.
            Install the ReadyTMS Driver app for background tracking.
          </div>
        )}
      </section>

      <section>
        <div className="section-title">
          Active loads
          <span className="muted small"> · {activeLoads.length}</span>
        </div>
        {isLoading ? (
          <div className="muted">Loading…</div>
        ) : activeLoads.length === 0 ? (
          <div className="empty">
            <div className="muted">No active loads assigned.</div>
            <button className="link" onClick={() => refetch()}>
              Refresh
            </button>
          </div>
        ) : (
          activeLoads.map((load) => (
            <button
              key={load.id}
              className="card load-card"
              onClick={() => onSelectLoad(load.id)}
            >
              <div className="load-head">
                <div className="strong">#{load.loadNumber}</div>
                <span className={`badge status-${load.status.toLowerCase()}`}>
                  {load.status}
                </span>
              </div>
              <div className="route">
                <div>{load.pickupLocation}</div>
                <div className="muted">↓</div>
                <div>{load.deliveryLocation}</div>
              </div>
              <div className="muted small">
                {load.brokerName ? `${load.brokerName} · ` : ""}${parseFloat(load.rate).toLocaleString()}
              </div>
            </button>
          ))
        )}
      </section>

      {deliveredCount > 0 && (
        <div className="muted small center" style={{ marginTop: 16 }}>
          {deliveredCount} completed this period
        </div>
      )}
    </div>
  );
}
