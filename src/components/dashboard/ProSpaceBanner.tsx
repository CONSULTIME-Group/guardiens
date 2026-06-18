import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const STORAGE_KEY = "pro_space_banner_dismissed";

interface ProInfo {
  raison_sociale: string | null;
  status: "pending" | "approved" | "rejected" | string;
}

const ProSpaceBanner = () => {
  const { user } = useAuth();
  const [pro, setPro] = useState<ProInfo | null>(null);
  const [dismissed, setDismissed] = useState(
    () => typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) === "1",
  );

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("pro_profiles")
        .select("raison_sociale, status")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled && data) setPro(data as ProInfo);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (!pro || dismissed) return null;

  const label =
    pro.status === "pending"
      ? "Fiche en attente de validation"
      : pro.status === "rejected"
        ? "Fiche à corriger"
        : "Fiche publiée";

  return (
    <div className="bg-founder-soft border border-founder-border/60 rounded-lg px-4 py-3 text-sm text-foreground flex items-center justify-between gap-4">
      <Link to="/pros/mon-espace" className="min-w-0 hover:underline">
        <span className="font-medium">Reprendre mon espace pro</span>
        <span className="text-muted-foreground">
          {" "}
          · {pro.raison_sociale ?? "Votre fiche"} · {label} →
        </span>
      </Link>
      <button
        type="button"
        onClick={() => {
          try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
          setDismissed(true);
        }}
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Fermer"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default ProSpaceBanner;
