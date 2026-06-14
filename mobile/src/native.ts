// Native-platform glue. All Capacitor plugins are loaded dynamically so
// the mobile bundle can still run in a regular browser for dev/testing
// (the dynamic imports just resolve to no-ops there).

import type { PluginListenerHandle } from "@capacitor/core";

let isNative = false;
let geolocation: typeof import("@capacitor/geolocation").Geolocation | null = null;
let camera: typeof import("@capacitor/camera").Camera | null = null;
let pushNotifications:
  | typeof import("@capacitor/push-notifications").PushNotifications
  | null = null;
let statusBar: typeof import("@capacitor/status-bar").StatusBar | null = null;
let network: typeof import("@capacitor/network").Network | null = null;

export async function initNative() {
  try {
    const { Capacitor } = await import("@capacitor/core");
    isNative = Capacitor.isNativePlatform();
    if (!isNative) {
      console.log("[Native] running in browser — native plugins disabled");
      return;
    }

    [geolocation, camera, pushNotifications, statusBar, network] = await Promise.all([
      import("@capacitor/geolocation").then((m) => m.Geolocation),
      import("@capacitor/camera").then((m) => m.Camera),
      import("@capacitor/push-notifications").then((m) => m.PushNotifications),
      import("@capacitor/status-bar").then((m) => m.StatusBar),
      import("@capacitor/network").then((m) => m.Network),
    ]);

    if (statusBar) {
      await statusBar.setBackgroundColor({ color: "#0d3b66" }).catch(() => {});
    }
  } catch (err) {
    console.warn("[Native] init failed:", err);
  }
}

export function isNativeApp(): boolean {
  return isNative;
}

// --- Geolocation -----------------------------------------------------------

export interface Coords {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number | null;
  heading?: number | null;
  altitude?: number | null;
  timestamp: number;
}

export async function requestLocationPermission(): Promise<boolean> {
  if (!isNative || !geolocation) {
    // Browser fallback — we'll prompt on first getCurrentPosition call.
    return "geolocation" in navigator;
  }
  try {
    const status = await geolocation.requestPermissions({ permissions: ["location"] });
    return status.location === "granted";
  } catch (err) {
    console.error("[Native] location permission error:", err);
    return false;
  }
}

export async function getCurrentLocation(): Promise<Coords> {
  if (isNative && geolocation) {
    const pos = await geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000,
    });
    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      speed: pos.coords.speed,
      heading: pos.coords.heading,
      altitude: pos.coords.altitude,
      timestamp: pos.timestamp,
    };
  }
  // Browser fallback.
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed,
          heading: pos.coords.heading,
          altitude: pos.coords.altitude,
          timestamp: pos.timestamp,
        }),
      (err) => reject(new Error(err.message)),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  });
}

// Continuous location watch. Returns a stop function.
export async function watchLocation(
  callback: (coords: Coords) => void,
): Promise<() => void> {
  if (isNative && geolocation) {
    const watchId = await geolocation.watchPosition(
      { enableHighAccuracy: true, timeout: 30000 },
      (pos, err) => {
        if (err || !pos) return;
        callback({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed,
          heading: pos.coords.heading,
          altitude: pos.coords.altitude,
          timestamp: pos.timestamp,
        });
      },
    );
    return async () => {
      if (geolocation) await geolocation.clearWatch({ id: watchId });
    };
  }
  // Browser fallback.
  const id = navigator.geolocation.watchPosition(
    (pos) =>
      callback({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        speed: pos.coords.speed,
        heading: pos.coords.heading,
        altitude: pos.coords.altitude,
        timestamp: pos.timestamp,
      }),
    (err) => console.error("[Geo]", err.message),
    { enableHighAccuracy: true, maximumAge: 0 },
  );
  return () => navigator.geolocation.clearWatch(id);
}

// --- Camera ---------------------------------------------------------------

export async function takePhotoBase64(): Promise<string | null> {
  if (isNative && camera) {
    try {
      const photo = await camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: 1, // CameraResultType.Base64
        source: 1, // CameraSource.Camera (not gallery)
      } as any);
      return photo.base64String || null;
    } catch (err) {
      console.error("[Native] camera error:", err);
      return null;
    }
  }
  return null;
}

// --- Push Notifications ---------------------------------------------------

export async function registerForPushNotifications(
  onToken: (token: string) => void,
): Promise<PluginListenerHandle | null> {
  if (!isNative || !pushNotifications) return null;
  const perm = await pushNotifications.requestPermissions();
  if (perm.receive !== "granted") return null;
  await pushNotifications.register();
  return pushNotifications.addListener("registration", (t) => onToken(t.value));
}

// --- Network --------------------------------------------------------------

export async function isOnline(): Promise<boolean> {
  if (isNative && network) {
    const status = await network.getStatus();
    return status.connected;
  }
  return navigator.onLine;
}
