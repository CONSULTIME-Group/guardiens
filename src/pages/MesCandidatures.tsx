/**
 * /mes-candidatures — page dédiée gardien
 *
 * Liste toutes les candidatures (applications) du gardien connecté,
 * triées par date décroissante, avec :
 *  - photo + titre annonce
 *  - ville
 *  - dates
 *  - proprio (avatar + prénom)
 *  - badge statut (En attente / Vue par le propriétaire · Il y a X / Acceptée / Déclinée / Retirée)
 *  - lien vers la conversation
 *  - lien vers l'annonce
 *
 * Realtime : subscribe sur `applications` filtré sur sitter_id = auth.uid()
 * pour rafraîchir statuts et déclencher toasts (accepted / viewed).
 *
 * Editorial : vouvoiement, aucun emoji, pas de tiret cadratin.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar, MapPin, MessageSquare, Search as SearchIcon } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import EmptyState from "@/components/shared/EmptyState";
import { useToast } from "@/hooks/use-toast";
import { getOptimizedImageUrl } from "@/lib/imageOptim";
import { formatSitPeriod } from "@/lib/dateRange";
import { logger } from "@/lib/logger";
import HelpDuringSitDialog from "@/components/sits/HelpDuringSitDialog";


interface SitterApp {
  id: string;
  status: string;
  created_at: string;
  viewed_at: string | null;
  sit: {
    id: string;
    title: string | null;
    slug: string | null;
    start_date: string | null;
    end_date: string | null;
    status: string;
    user_id: string;
    property_id: string | null;
    city: string | null;
    properties: { photos: string[] | null } | null;
    owner: { id: string; first_name: string | null; avatar_url: string | null; city: string | null } | null;
  } | null;

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
      const { data, error } = await supabase
        .from("applications")
        .select(
          "id, status, created_at, viewed_at, sit:sits(id, title, slug, start_date, end_date, status, user_id, property_id, city, properties(photos), owner:profiles!sits_user_id_fkey(id, first_name, avatar_url, city))",
        )
        .eq("sitter_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data as any) as SitterApp[];
      setApps(rows || []);
      prevStatusRef.current = Object.fromEntries((rows || []).map((r) => [r.id, r.status]));
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

  const rendered = useMemo(() => apps.filter((a) => a.sit), [apps]);

  const openConversation = async (app: SitterApp) => {
    if (!user || !app.sit) return;
    const { startConversationAndNavigate } = await import("@/lib/conversation");
    await startConversationAndNavigate(
      { otherUserId: app.sit.user_id, context: "sit_application", sitId: app.sit.id },
      navigate,
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Mes candidatures | Guardiens</title>
        <meta name="description" content="Suivez l'état de vos candidatures aux annonces de garde." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 py-6 sm:py-8">
        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-heading font-semibold text-foreground">
            Mes candidatures
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Historique complet et statut en temps réel de vos candidatures.
          </p>
        </header>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : rendered.length === 0 ? (
          <EmptyState
            illustration="heartBookmark"
            title="Aucune candidature pour l'instant"
            description="Parcourez les annonces qui correspondent à votre profil et postulez en un clic."
            actionLabel="Rechercher une annonce"
            actionTo="/recherche"
            actionIcon={SearchIcon}
          />

        ) : (
          <ul className="space-y-3">
            {rendered.map((app) => {
              const sit = app.sit!;
              const cover = sit.properties?.photos?.[0];
              const city = sit.city || sit.owner?.city;
              const period = formatSitPeriod(sit.start_date, sit.end_date, null);
              const badge = appStatusBadge[app.status] || appStatusBadge.pending;
              return (
                <li
                  key={app.id}
                  className="rounded-2xl border border-border bg-card overflow-hidden transition-colors hover:border-primary/30"
                >
                  <div className="flex flex-col sm:flex-row">
                    <Link
                      to={`/sits/${sit.id}`}
                      className="relative sm:w-40 md:w-48 h-32 sm:h-auto sm:min-h-[128px] shrink-0 bg-muted overflow-hidden"
                      aria-label={`Voir l'annonce ${sit.title || ""}`}
                    >
                      {cover ? (
                        <img
                          src={getOptimizedImageUrl(cover, 320, 80)}
                          alt={sit.title || "Annonce de garde"}
                          className="w-full h-full object-cover"
                          width={320}
                          height={200}
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5" />
                      )}
                    </Link>

                    <div className="flex-1 min-w-0 p-4 flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-3 min-w-0">
                        <div className="min-w-0">
                          <Link
                            to={`/sits/${sit.id}`}
                            className="block font-heading font-semibold text-base text-foreground hover:text-primary transition-colors truncate"
                          >
                            {sit.title || "Annonce sans titre"}
                          </Link>
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

                      <div className="flex items-center justify-between gap-3 mt-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar className="h-7 w-7">
                            {sit.owner?.avatar_url ? (
                              <AvatarImage src={sit.owner.avatar_url} alt={sit.owner.first_name || "Propriétaire"} />
                            ) : null}
                            <AvatarFallback>{(sit.owner?.first_name || "?").charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground truncate">
                            {sit.owner?.first_name || "Propriétaire"} · Envoyée le{" "}
                            {format(new Date(app.created_at), "d MMM yyyy", { locale: fr })}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {app.status === "accepted" && sit.status === "in_progress" && (
                            <HelpDuringSitDialog
                              sitId={sit.id}
                              sitTitle={sit.title}
                              recipientUserId={sit.user_id}
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
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default MesCandidatures;
