import { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from "@/lib/logger";
import PublicMissionView from "@/components/missions/PublicMissionView";
import { Button } from "@/components/ui/button";

/** Même minimum de caractères que l'entraide (SmallMissionDetail). */
const MIN_MESSAGE_LEN = 10;

/** Titlecase pour une ville saisie en majuscules. */
function titlecaseCity(s?: string | null): string {
  if (!s) return "";
  const small = new Set(["de", "du", "des", "le", "la", "les", "et", "en", "sur", "sous", "lès", "aux"]);
  return s.toLowerCase().split(/(\s|-)/).map((part, i) => {
    if (part === " " || part === "-") return part;
    if (i > 0 && small.has(part)) return part;
    return part.charAt(0).toUpperCase() + part.slice(1);
  }).join("");
}

function timeAgoFr(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d < 1) return "aujourd'hui";
  if (d < 7) return `il y a ${d} j`;
  const w = Math.floor(d / 7);
  if (w < 5) return `il y a ${w} sem`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function memberSinceLong(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return `Membre depuis ${d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`;
}

const ProjetDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const { user } = useAuth();
  const [projet, setProjet] = useState<any | null>(null);
  const [author, setAuthor] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [applyMessage, setApplyMessage] = useState("");
  const [applying, setApplying] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!slug) return;
      setLoading(true);
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
      const query = (supabase as any)
        .from("public_small_missions")
        .select("*")
        .eq("category", "projet");
      const { data } = await (isUuid ? query.eq("id", slug) : query.eq("slug", slug)).maybeSingle();
      setProjet(data || null);
      if (data?.id) {
        const { data: a } = await supabase.rpc("get_mission_author_public", { _mission_id: data.id });
        const row: any = Array.isArray(a) ? a[0] : a;
        setAuthor(row ? { ...row, created_at: row.member_since } : null);
      }
      setLoading(false);
    };
    void load();
  }, [slug]);

  const onShare = useCallback(() => {
    const url = window.location.href;
    if (navigator.share) {
      void navigator.share({ url }).catch(() => undefined);
      return;
    }
    void navigator.clipboard.writeText(url);
    toast({ title: "Lien copié", description: "Vous pouvez le partager." });
  }, [toast]);

  if (loading) {
    return <div className="min-h-screen bg-background" aria-busy="true" />;
  }

  if (!projet) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-5">
          <h1 className="font-heading text-3xl font-bold text-foreground">Ce projet a été retiré</h1>
          <p className="text-muted-foreground">
            Vous pouvez découvrir les projets ouverts en ce moment.
          </p>
          <Link to="/projets">
            <Button className="rounded-full">Voir les projets participatifs</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <PublicMissionView
      mission={projet}
      author={author}
      catMeta={{ label: "Projet participatif" }}
      durationLabel={null}
      relatedMissions={[]}
      titlecaseCity={titlecaseCity}
      timeAgoFr={timeAgoFr}
      memberSinceLong={memberSinceLong}
      onShare={onShare}
    />
  );
};

export default ProjetDetail;
