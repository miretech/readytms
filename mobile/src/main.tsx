import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "./App";
import { initNative } from "./native";
import "./styles.css";

// Detect whether we're running inside the native Capacitor shell
// (versus a regular browser preview). The hook is async-fire-and-forget;
// once permissions clear, GPS tracking will start automatically when the
// driver toggles "On Duty".
initNative().catch((err) => {
  console.error("[Mobile] native init failed:", err);
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
