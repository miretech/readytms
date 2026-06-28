// Registers the driver PWA service worker (production only) and wires
// update handling so a fresh deploy activates without a hard reload loop.
export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  // Skip in dev so Vite HMR isn't shadowed by a cached shell.
  if (import.meta.env.DEV) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        // When a new SW is installed and an old one controls the page,
        // ask it to take over so drivers get updates promptly.
        reg.addEventListener("updatefound", () => {
          const sw = reg.installing;
          if (!sw) return;
          sw.addEventListener("statechange", () => {
            if (sw.state === "installed" && navigator.serviceWorker.controller) {
              sw.postMessage("SKIP_WAITING");
            }
          });
        });
      })
      .catch(() => {
        /* registration failures are non-fatal */
      });

    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  });
}
