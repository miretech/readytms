// Tiny API client. Points at the production server by default;
// For local development on mobile, set VITE_API_BASE_URL at build time:
//   VITE_API_BASE_URL=http://192.168.x.x:3001 npm run mobile:build
// Or set CAPACITOR_SERVER_URL in capacitor.config.ts to override

const BASE = import.meta.env.VITE_API_BASE_URL || "https://readytms.com";

const SESSION_KEY = "readytms-mobile-session";

export function getSession(): { token: string; driverId: string } | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSession(s: { token: string; driverId: string } | null) {
  if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  else localStorage.removeItem(SESSION_KEY);
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const session = getSession();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> || {}),
  };
  if (session?.token) {
    headers["Authorization"] = `Bearer ${session.token}`;
  }
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body.error || body.message || "";
    } catch {}
    throw new Error(detail || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// --- Auth ----------------------------------------------------------------

export async function login(email: string, password: string) {
  const result = await request<{ token: string; user: { id: string; email: string; type: string } }>(
    "/api/driver/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    },
  );
  // Store the token returned by the server for iOS WebView compatibility
  setSession({ token: result.token, driverId: result.user.id });
  return result.user;
}

export async function logout() {
  await request<void>("/api/logout", { method: "POST" }).catch(() => {});
  setSession(null);
}

// --- Driver ---------------------------------------------------------------

export interface MobileDriver {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  gpsEnabled: string;
  assignedTruckId: string | null;
}

export async function getMe(): Promise<{ user: any; driver: MobileDriver | null }> {
  // The server returns the driver record directly when type === 'driver'.
  const user = await request<any>("/api/auth/user");
  const driver = user?.type === "driver" ? (user as MobileDriver) : null;
  return { user, driver };
}

// --- Loads ----------------------------------------------------------------

export interface MobileLoad {
  id: string;
  loadNumber: string;
  status: string;
  pickupLocation: string;
  pickupDate: string;
  deliveryLocation: string;
  deliveryDate: string;
  rate: string;
  commodity: string | null;
  weight: number | null;
  notes: string | null;
  assignedDriverId: string | null;
  brokerName: string | null;
  podAttachments: any[] | null;
}

export async function getLoadsForDriver(driverId: string): Promise<MobileLoad[]> {
  const loads = await request<MobileLoad[]>("/api/loads");
  return loads.filter((l) => l.assignedDriverId === driverId);
}

export async function updateLoadStatus(
  loadId: string,
  status: string,
): Promise<MobileLoad> {
  return request<MobileLoad>(`/api/loads/${loadId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function uploadPodPhoto(
  loadId: string,
  base64: string,
  filename: string,
): Promise<void> {
  return request<void>(`/api/driver/loads/${loadId}/pod`, {
    method: "POST",
    body: JSON.stringify({
      attachment: {
        filename,
        data: base64,
        type: "image/jpeg",
        uploadedAt: new Date().toISOString(),
      },
    }),
  });
}

// --- GPS ------------------------------------------------------------------

export async function pushGpsLocation(
  driverId: string,
  coords: { latitude: number; longitude: number; speed?: number | null; heading?: number | null },
): Promise<void> {
  return request<void>("/api/gps", {
    method: "POST",
    body: JSON.stringify({
      driverId,
      latitude: coords.latitude.toString(),
      longitude: coords.longitude.toString(),
      speed: coords.speed ?? null,
      heading: coords.heading ?? null,
    }),
  });
}

// --- Push notification token registration --------------------------------

export async function registerPushToken(driverId: string, token: string, platform: "ios" | "android") {
  return request<void>("/api/drivers/push-token", {
    method: "POST",
    body: JSON.stringify({ driverId, token, platform }),
  });
}
