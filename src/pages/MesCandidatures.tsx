/**
 * /mes-candidatures, page dédiée gardien
 *
 * Liste TOUTES les candidatures du gardien, quel que soit l'état de l'annonce,
 * via la RPC sécurisée `get_my_applications` (le contenu des annonces en
 * brouillon reste masqué). Deux sections : candidatures en cours, puis
 * candidatures sans suite avec la mention explicite de l'état de l'annonce.
 *
 * Realtime : subscribe sur `applications` filtré sur sitter_id = auth.uid().
 *
 * Editorial : vouvoiement, aucun emoji, pas de tiret cadratin.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Head from "@/components/seo/Head";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar, MapPin, MessageSquare, Search as SearchIcon } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import EmptyState from "@/components/shared/EmptyState";
import ProBadge from "@/components/badges/ProBadge";
import { specialtyLabel } from "@/lib/proSpecialties";
import { useToast } from "@/hooks/use-toast";
import { getOptimizedImageUrl } from "@/lib/imageOptim";
import { formatSitPeriod } from "@/lib/dateRange";
import { logger } from "@/lib/logger";
import HelpDuringSitDialog from "@/components/sits/HelpDuringSitDialog";
import {
  canShowSitContent,
  groupApplications,
  sitStateNote,
} from "@/lib/applicationSitState";

interface SitterApp {
  application_id: string;
  status: string;
  created_at: string;
  viewed_at: string | null;
  sit_id: string;
  sit_status: string;
  sit_title: string | null;
  sit_start_date: string | null;
  sit_end_date: string | null;
  sit_city: string | null;
  owner_id: string;
  cover_photo: string | null;
  content_visible: boolean;
  owner?: { id: string; first_name: string | null; avatar_url: string | null; city: string | null } | null;
}

const appStatusBadge: Record<string, { label: (viewedAt: string | null) => string; className: string }> = {
  pending: {
    label: () => "En attente",
    className: "bg-primary/10 text-primary",
  },
  viewed: {
    label: (viewedAt) =>
      viewedAt
        ? `Vue par le propriétaire ${formatDistanceToNow(new Date(viewedAt), { addSuffix: true, locale: fr })}`
        : "Vue par le propriétaire",
    className: "bg-secondary/10 text-secondary",
  },
  discussing: { label: () => "En discussion", className: "bg-accent text-foreground" },
  accepted: { label: () => "Acceptée", className: "bg-success-soft text-success border border-success-border" },
  rejected: { label: () => "Déclinée", className: "bg-muted text-muted-foreground" },
  cancelled: { label: () => "Retirée", className: "bg-muted text-muted-foreground" },
};

const MesCandidatures = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [apps, setApps] = useState<SitterApp[]>([]);
  const [loading, setLoading] = useState(true);
  const prevStatusRef = useRef<Record<string, string>>({});

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_my_applications");
      if (error) throw error;
      const rows = ((data as any[]) || []) as SitterApp[];

      // Hydratation RLS-safe des propriétaires via la vue publique.
      const ownerIds = Array.from(new Set(rows.map((r) => r.owner_id).filter(Boolean)));
      if (ownerIds.length > 0) {
        const { data: ownerProfs } = await supabase
          .from("public_profiles")
          .select("id, first_name, avatar_url, city")
          .in("id", ownerIds);
        const ownerMap = new Map<string, any>();
        (ownerProfs ?? []).forEach((p: any) => ownerMap.set(p.id, p));
        rows.forEach((r) => {
          r.owner = r.owner_id ? ownerMap.get(r.owner_id) ?? null : null;
        });
      }

      setApps(rows);
      prevStatusRef.current = Object.fromEntries(rows.map((r) => [r.application_id, r.status]));
    } catch (e) {
      logger.error("MesCandidatures.load", { error: String(e) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Realtime : rafraichit + toast discret sur transitions clés
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`mes-candidatures-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "applications", filter: `sitter_id=eq.${user.id}` },
        (payload) => {
          const next = (payload.new || {}) as any;
          const prev = prevStatusRef.current[next.id];
          if (next?.status && prev && prev !== next.status) {
            if (next.status === "accepted") {
              toast({ title: "Votre candidature a été acceptée" });
            } else if (next.status === "viewed" && prev === "pending") {
              toast({ title: "Votre candidature a été vue par le propriétaire" });
            } else if (next.status === "discussing" && (prev === "pending" || prev === "viewed")) {
              toast({ title: "Le propriétaire a ouvert la discussion avec vous" });
            } else if (next.status === "pending" && prev === "rejected") {
              toast({ title: "Votre candidature a été rouverte" });
            }
          }
          void load();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const { active, closed } = useMemo(() => groupApplications(apps), [apps]);

  // Rappel de statut professionnel (declared ou verified) et lien annuaire.
  const [proInfo, setProInfo] = useState<{ status: string; specialty: string | null; slug: string | null } | null>(null);
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const [profRes, proRes] = await Promise.all([
        supabase.from("profiles").select("pro_status, pro_specialty").eq("id", user.id).maybeSingle(),
        supabase.from("pro_profiles").select("slug").eq("user_id", user.id).eq("status", "approved").maybeSingle(),
      ]);
      if (cancelled) return;
      const status = (profRes.data as any)?.pro_status;
      if (status === "declared" || status === "verified") {
        setProInfo({
          status,
          specialty: (profRes.data as any)?.pro_specialty ?? null,
          slug: (proRes.data as any)?.slug ?? null,
        });
      } else {
        setProInfo(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const openConversation = async (app: SitterApp) => {
    if (!user) return;
    const { startConversationAndNavigate } = await import("@/lib/conversation");
    await startConversationAndNavigate(
      { otherUserId: app.owner_id, context: "sit_application", sitId: app.sit_id },
      navigate,
    );
  };

  const renderCard = (app: SitterApp) => {
    const showContent = canShowSitContent(app.sit_status) && app.content_visible;
    const cover = showContent ? app.cover_photo : null;
    const city = showContent ? app.sit_city || app.owner?.city : null;
    const period = showContent ? formatSitPeriod(app.sit_start_date, app.sit_end_date, null) : null;
    const badge = appStatusBadge[app.status] || appStatusBadge.pending;
    const note = sitStateNote(app.sit_status);
    const title = showContent ? app.sit_title || "Annonce sans titre" : "Annonce non publiée";

    return (
      <li
        key={app.application_id}
        className="rounded-2xl border border-border bg-card overflow-hidden transition-colors hover:border-primary/30"
      >
        <div className="flex flex-col sm:flex-row">
          {showContent ? (
            <Link
              to={`/sits/${app.sit_id}`}
              className="relative sm:w-40 md:w-48 h-32 sm:h-auto sm:min-h-[128px] shrink-0 bg-muted overflow-hidden"
              aria-label={`Voir l'annonce ${app.sit_title || ""}`}
            >
              {cover ? (
                <img
                  src={getOptimizedImageUrl(cover, 320, 80)}
                  alt={app.sit_title || "Annonce de garde"}
                  className="w-full h-full object-cover"
                  width={320}
                  height={200}
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5" />
              )}
            </Link>
          ) : (
            <div className="sm:w-40 md:w-48 h-32 sm:h-auto sm:min-h-[128px] shrink-0 bg-muted/60" aria-hidden="true" />
          )}

          <div className="flex-1 min-w-0 p-4 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-3 min-w-0">
              <div className="min-w-0">
                {showContent ? (
                  <Link
                    to={`/sits/${app.sit_id}`}
                    className="block font-heading font-semibold text-base text-foreground hover:text-primary transition-colors truncate"
                  >
                    {title}
                  </Link>
                ) : (
                  <p className="font-heading font-semibold text-base text-foreground truncate">{title}</p>
                )}
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {city && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" aria-hidden="true" />
                      {city}
                    </span>
                  )}
                  {period && (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" aria-hidden="true" />
                      {period}
                    </span>
                  )}
                </div>
              </div>
              <span
                className={`text-[11px] font-medium px-2 py-1 rounded-full whitespace-nowrap ${badge.className}`}
              >
                {badge.label(app.viewed_at)}
              </span>
            </div>

            {note && (
              <p className="text-xs text-muted-foreground bg-muted/60 rounded-lg px-2.5 py-1.5 w-fit">
                {note}
              </p>
            )}

            <div className="flex items-center justify-between gap-3 mt-1">
              <div className="flex items-center gap-2 min-w-0">
                <Avatar className="h-7 w-7">
                  {app.owner?.avatar_url ? (
                    <AvatarImage src={app.owner.avatar_url} alt={app.owner.first_name || "Propriétaire"} />
                  ) : null}
                  <AvatarFallback>{(app.owner?.first_name || "?").charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground truncate">
                  {app.owner?.first_name || "Propriétaire"} · Envoyée le{" "}
                  {format(new Date(app.created_at), "d MMM yyyy", { locale: fr })}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {app.status === "accepted" && app.sit_status === "in_progress" && (
                  <HelpDuringSitDialog
                    sitId={app.sit_id}
                    sitTitle={app.sit_title}
                    recipientUserId={app.owner_id}
                    size="sm"
                    variant="outline"
                    className="rounded-xl"
                  />
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => openConversation(app)}
                >
                  <MessageSquare className="h-4 w-4 mr-1.5" />
                  Message
                </Button>
              </div>
            </div>
          </div>
        </div>
      </li>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Head>
        <title>Mes candidatures | Guardiens</title>
        <meta name="description" content="Suivez l'état de vos candidatures aux annonces de garde." />
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 py-6 sm:py-8">
        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-heading font-semibold text-foreground">
            Mes candidatures
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Toutes vos candidatures, y compris celles portant sur des annonces qui ne sont plus ouvertes.
          </p>
        </header>

        {proInfo && (
          <div className="mb-6 rounded-2xl border border-border bg-accent/40 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <ProBadge status={proInfo.status} size="sm" />
              <p className="text-sm text-foreground">
                Votre statut professionnel est visible par les propriétaires
                {specialtyLabel(proInfo.specialty) ? ` (${specialtyLabel(proInfo.specialty)})` : ""}.
              </p>
            </div>
            <Link
              to={proInfo.slug ? `/pros/${proInfo.slug}` : "/pros/inscription"}
              className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
            >
              {proInfo.slug ? "Voir ma fiche dans l'annuaire des pros" : "Créer ma fiche dans l'annuaire des pros"}
            </Link>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : apps.length === 0 ? (
          <EmptyState
            illustration="heartBookmark"
            title="Aucune candidature pour l'instant"
            description="Parcourez les annonces qui correspondent à votre profil et postulez en un clic."
            actionLabel="Rechercher une annonce"
            actionTo="/recherche"
            actionIcon={SearchIcon}
          />
        ) : (
          <div className="space-y-8">
            {active.length > 0 && (
              <section>
                <h2 className="text-sm font-medium text-foreground mb-3">
                  Candidatures en cours ({active.length})
                </h2>
                <ul className="space-y-3">{active.map(renderCard)}</ul>
              </section>
            )}

            {closed.length > 0 && (
              <section>
                <h2 className="text-sm font-medium text-foreground mb-1">
                  Candidatures sans suite ({closed.length})
                </h2>
                <p className="text-xs text-muted-foreground mb-3">
                  Ces annonces ne sont plus ouvertes. Nous les gardons ici pour que vous sachiez ce qu'elles
                  sont devenues.
                </p>
                <ul className="space-y-3">{closed.map(renderCard)}</ul>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MesCandidatures;
