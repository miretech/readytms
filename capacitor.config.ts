import type { CapacitorConfig } from "@capacitor/cli";

// Capacitor configuration for the ReadyTMS Driver App.
// We ship a tiny mobile bundle that proxies most traffic back to the
// production server. The TMS web app at readytms.com stays the
// dispatcher tool; the mobile app is driver-focused.
const config: CapacitorConfig = {
  appId: "com.readytms.driver",
  appName: "ReadyTMS Driver",
  webDir: "dist-mobile",
  bundledWebRuntime: false,
  // The mobile WebView talks to the production API directly.
  // Override with CAPACITOR_SERVER_URL during dev to point at localhost.
  server: {
    androidScheme: "https",
    // For local dev only, uncomment & set this to your laptop IP:
    // url: "http://192.168.1.42:5000",
    // cleartext: true,
  },
  plugins: {
    Geolocation: {
      // iOS background tracking requires explicit user permission.
      // The driver portal asks once when the driver enables "On Duty".
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: "#0d3b66",
      androidScaleType: "CENTER_CROP",
    },
  },
  ios: {
    contentInset: "always",
    scheme: "ReadyTMSDriver",
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
