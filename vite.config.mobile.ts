import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Mobile-only Vite config. Builds a stripped-down driver bundle
// (no dispatcher pages) into dist-mobile/, which Capacitor packages
// into the iOS/Android apps.
//
// API requests still hit the production server at readytms.com.
export default defineConfig({
  base: "/m/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "mobile"),
  define: {
    // Hard-code production API host for the bundled mobile app.
    // Override with `VITE_API_BASE_URL=http://192.168.1.42:5000 npm run mobile:build`
    // for local dev against a laptop.
    "import.meta.env.VITE_API_BASE_URL": JSON.stringify(
      process.env.VITE_API_BASE_URL || "https://readytms.com",
    ),
    "import.meta.env.VITE_MOBILE_BUILD": JSON.stringify("true"),
  },
  build: {
    outDir: path.resolve(import.meta.dirname, "dist-mobile"),
    emptyOutDir: true,
    target: "es2020",
    sourcemap: false,
  },
});
