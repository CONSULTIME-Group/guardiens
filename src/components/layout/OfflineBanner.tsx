import { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";

const OfflineBanner = () => {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="alert"
      className="fixed top-0 inset-x-0 z-[9999] flex items-center justify-center gap-2 bg-destructive text-destructive-foreground text-sm py-2 px-4 animate-in slide-in-from-top"
    >
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>Vous êtes hors connexion. Certaines fonctionnalités peuvent être indisponibles.</span>
    </div>
  );
};

export default OfflineBanner;
