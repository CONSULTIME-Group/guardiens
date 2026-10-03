import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from "@/lib/logger";
import PublicMissionView from "@/components/missions/PublicMissionView";
import { Button } from "@/components/ui/button";
import { isIndexableProjetMission } from "../../supabase/functions/_shared/entraideMissionIndexability.js";
import PageMeta from "@/components/PageMeta";
import { classifyProjetLookup, isUuid, projetCanonicalUrl, projetStatusCode, type ProjetLookup } from "@/lib/projetSeo";

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

type ProjetView = {
  key: string | null;
  state: ProjetLookup["state"];
  projet: any | null;
  author: any | null;
};

export const PROJET_LOADING_TITLE = "Chargement du projet | Guardiens";

/**
 * Retire les balises déclarées par un projet précédent (navigation interne) :
 * titre, description, og/twitter, canonical, JSON-LD posés par PageMeta
 * (data-page-meta) et consignes Prerender. Titre neutre pendant le chargement.
 */
export function scrubStaleProjetHead(): void {
  if (typeof document === "undefined") return;
  (window as any).prerenderReady = false;
  window.prerenderMetaPending = true;
  document.head
    .querySelectorAll(
      '[data-page-meta="true"], link[rel="canonical"], meta[name="prerender-status-code"], meta[name="prerender-header"]',
    )
    .forEach((n) => n.remove());
  document.title = PROJET_LOADING_TITLE;
}

const ProjetDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const { user } = useAuth();
  const [reloadKey, setReloadKey] = useState(0);
  // Clé de la lecture attendue : un changement de projet ou « Réessayer »
  // invalide l'état affiché dès le rendu, avant tout effet.
  const routeKey = `${slug ?? ""}#${reloadKey}`;
  const [view, setView] = useState<ProjetView>({ key: null, state: "loading", projet: null, author: null });
  const generation = useRef(0);
  const isCurrent = view.key === routeKey && view.state !== "loading";
  const projet: any | null = isCurrent ? view.projet : null;
  const author: any | null = isCurrent ? view.author : null;
  const lookup: ProjetLookup["state"] = isCurrent ? view.state : "loading";
  const loading = !isCurrent;
  const [applyMessage, setApplyMessage] = useState("");
  const [applying, setApplying] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);

  // Tant que la lecture du paramètre courant n'a pas répondu, aucune balise
  // de l'ancien projet ne reste déclarée et Prerender attend.
  useLayoutEffect(() => {
    if (isCurrent) return;
    scrubStaleProjetHead();
  }, [isCurrent, routeKey]);

  useEffect(() => {
    if (!slug) return;
    const gen = ++generation.current;
    const key = routeKey;
    const alive = () => generation.current === gen;
    const load = async () => {
      const query = (supabase as any)
        .from("public_small_missions")
        .select("*")
        .eq("category", "projet");
      let res: { data: unknown; error: unknown } | null = null;
      try {
        res = await (isUuid(slug) ? query.eq("id", slug) : query.eq("slug", slug)).maybeSingle();
      } catch (err) {
        logger.error("[ProjetDetail.load]", { err: String(err) });
        res = null;
      }
      if (!alive()) return;
      // Une lecture en échec n'est jamais une absence : sinon une panne
      // passagère servirait un 404 aux robots pour un projet réel.
      const result = classifyProjetLookup(res);
      const data: any = result.state === "found" ? result.row : null;
      // Le contenu du projet libère la page tout de suite, auteur inconnu.
      setView({ key, state: result.state, projet: data, author: null });
      if (!data?.id) return;
      // Lecture secondaire : une panne laisse l'auteur vide, jamais la page.
      try {
        const { data: a, error } = await supabase.rpc("get_mission_author_public", { _mission_id: data.id });
        if (error) throw error;
        if (!alive()) return;
        const row: any = Array.isArray(a) ? a[0] : a;
        const nextAuthor = row ? { ...row, created_at: row.member_since } : null;
        setView((v) => (v.key === key ? { ...v, author: nextAuthor } : v));
      } catch (err) {
        logger.error("[ProjetDetail.author]", { err: String(err) });
      }
    };
    void load();
    return () => {
      // Démontage ou nouveau paramètre : toute réponse en vol est ignorée.
      if (generation.current === gen) generation.current += 1;
    };
  }, [slug, routeKey]);

  const onShare = useCallback(() => {
    const url = window.location.href;
    if (navigator.share) {
      void navigator.share({ url }).catch(() => undefined);
      return;
    }
    void navigator.clipboard.writeText(url);
    toast({ title: "Lien copié", description: "Vous pouvez le partager." });
  }, [toast]);

  /** Candidature d'un membre connecté, même mécanique que handleRespond de l'entraide. */
  const handleApply = useCallback(async () => {
    if (!user || !projet || applying || hasApplied) return;
    const msg = applyMessage.trim();
    if (!msg) {
      toast({ variant: "destructive", title: "Message vide", description: "Écrivez un mot avant d'envoyer votre candidature." });
      return;
    }
    if (msg.length < MIN_MESSAGE_LEN) {
      toast({
        variant: "destructive",
        title: "Message trop court",
        description: `Ajoutez au moins ${MIN_MESSAGE_LEN} caractères pour que le porteur du projet comprenne votre proposition.`,
      });
      return;
    }
    setApplying(true);
    try {
      const { data: fresh } = await supabase
        .from("small_missions")
        .select("status, user_id")
        .eq("id", projet.id)
        .single();
      if (!fresh) throw new Error("Projet introuvable.");
      if (fresh.status !== "open") {
        toast({ variant: "destructive", title: "Projet clôturé", description: "Ce projet accepte les candidatures jusqu'à sa clôture, qui est passée." });
        return;
      }
      if (fresh.user_id === user.id) {
        toast({ variant: "destructive", title: "Action impossible", description: "Vous portez ce projet, la candidature est réservée aux participants." });
        return;
      }

      const { error } = await supabase
        .from("small_mission_responses")
        .insert({ mission_id: projet.id, responder_id: user.id, message: msg });

      if (error) {
        const hint = (error as any)?.hint || "";
        const raw = String(error.message || "");
        if (error.code === "23505") {
          toast({ variant: "destructive", title: "Déjà envoyé", description: "Vous avez déjà candidaté à ce projet." });
          setHasApplied(true);
        } else if (hint === "account_not_active" || raw.includes("account_not_active")) {
          toast({ variant: "destructive", title: "Compte non actif", description: "Contactez le support pour rétablir l'accès." });
        } else if (hint === "mission_response_cap_reached" || raw.includes("mission_response_cap_reached")) {
          toast({
            variant: "destructive",
            title: "Projet temporairement fermé",
            description: "Le nombre de candidatures en attente est atteint. Une place se libérera si le porteur du projet en décline une.",
          });
        } else {
          throw error;
        }
      } else {
        setHasApplied(true);
        setApplyMessage("");
        toast({ title: "Candidature envoyée", description: "Le porteur du projet va être prévenu." });
      }
    } catch (err: any) {
      logger.error("[ProjetDetail.handleApply]", { err: String(err) });
      toast({ variant: "destructive", title: "Erreur", description: err?.message || "Impossible d'envoyer votre candidature." });
    } finally {
      setApplying(false);
    }
  }, [user, projet, applying, hasApplied, applyMessage, toast]);

  if (loading) {
    return <div className="min-h-screen bg-background" aria-busy="true" />;
  }

  if (lookup === "error") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <PageMeta
          title="Projet momentanément indisponible"
          description="Ce projet n'a pas pu être chargé. Réessayez dans un instant."
          noindex
          statusCode={projetStatusCode("error")}
          noCanonical
        />
        <div className="max-w-md text-center space-y-5">
          <h1 className="font-heading text-3xl font-bold text-foreground">Ce projet n'a pas pu être chargé</h1>
          <p className="text-muted-foreground">
            La connexion a échoué. Le projet existe peut-être toujours : vous pouvez réessayer.
          </p>
          <Button className="rounded-full" onClick={() => setReloadKey((k) => k + 1)}>Réessayer</Button>
        </div>
      </div>
    );
  }

  if (!projet) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <PageMeta
          title="Projet introuvable"
          description="Ce projet participatif n'existe pas ou a été retiré. Découvrez les projets ouverts en ce moment."
          noindex
          statusCode={projetStatusCode("absent")}
          noCanonical
        />
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
      noindex={!isIndexableProjetMission(projet)}
      canonical={projetCanonicalUrl(projet)}
      onApply={user ? handleApply : undefined}
      hasApplied={hasApplied}
      applying={applying}
      applyMessage={applyMessage}
      onApplyMessageChange={setApplyMessage}
    />
  );
};

export default ProjetDetail;
