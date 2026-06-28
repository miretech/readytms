import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Share, Plus, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "rtms-driver-install-dismissed";

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as any).standalone === true
  );
}

function isIOS() {
  return (
    /iphone|ipad|ipod/i.test(window.navigator.userAgent) &&
    !(window.navigator as any).MSStream
  );
}

/**
 * Prompts drivers to install the app to their home screen.
 * - Android/Chrome: uses the native beforeinstallprompt flow.
 * - iOS/Safari: shows manual "Add to Home Screen" instructions (no native prompt exists).
 * Hidden once installed or dismissed.
 */
export function InstallPWA() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOS, setShowIOS] = useState(false);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISS_KEY) === "1"
  );

  useEffect(() => {
    if (isStandalone() || dismissed) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // iOS never fires beforeinstallprompt — offer manual instructions instead.
    if (isIOS()) setShowIOS(true);

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, [dismissed]);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") setDeferred(null);
  };

  if (dismissed || isStandalone()) return null;
  if (!deferred && !showIOS) return null;

  return (
    <div
      className="relative rounded-lg border border-primary/30 bg-primary/5 p-4"
      data-testid="banner-install-pwa"
    >
      <button
        onClick={dismiss}
        className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground hover:bg-muted"
        aria-label="Dismiss"
        data-testid="button-dismiss-install"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Download className="h-5 w-5" />
        </div>
        <div className="flex-1 space-y-2">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Install the ReadyTMS Driver app
            </p>
            <p className="text-sm text-muted-foreground">
              Add it to your home screen for one-tap access to your loads and GPS.
            </p>
          </div>

          {deferred ? (
            <Button size="sm" onClick={install} data-testid="button-install-pwa">
              <Download className="mr-2 h-4 w-4" />
              Install app
            </Button>
          ) : (
            <p className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
              Tap
              <Share className="mx-0.5 inline h-4 w-4 text-foreground" />
              <span className="font-medium text-foreground">Share</span>, then
              <Plus className="mx-0.5 inline h-4 w-4 text-foreground" />
              <span className="font-medium text-foreground">Add to Home Screen</span>.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
