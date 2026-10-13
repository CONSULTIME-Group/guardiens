/**
 * /mes-candidatures, page dédiée gardien
 *
 * Liste TOUTES les candidatures du gardien, quel que soit l'état de l'annonce,
 * via la RPC sécurisée `get_my_applications` (le contenu des annonces en
 * brouillon reste masqué). Trois sections : candidatures en cours, gardes
 * réalisées (lot Z, avec accès à l'avis), puis candidatures sans suite avec
 * la mention explicite de l'état de l'annonce.
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
import { Calendar, MapPin, MessageSquare, Search as SearchIcon, Star } from "lucide-react";
import { isSitReviewable } from "@/lib/reviewEligibility";

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
  cancelledApplicationLabel,
  groupApplications,
  isOpenApplicationStatus,
  sitStateNote,
} from "@/lib/applicationSitState";
import { sitterWaitingDays, sitterWaitingNote } from "@/lib/applicationsAwaiting";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  /** Lot X3a : le gardien a lui-même annulé sa participation (migration X3a). */
  sit_cancelled_by_me?: boolean | null;
  owner?:{ id: string; first_name: string | null; avatar_url: string | null; city: string | null } | null;
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
  // Lot I2 : candidatures nées d'une proposition privée (garde en brouillon).
  const [proposalBySit, setProposalBySit] = useState<Record<string, string>>({});
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

      if (rows.some((r) => r.sit_status === "draft")) {
        const { data: proposals } = await (supabase as any)
          .from("sit_invitations")
          .select("id, sit_id")
          .eq("sitter_id", user.id)
          .eq("kind", "private");
        setProposalBySit(
          Object.fromEntries(((proposals as { id: string; sit_id: string }[] | null) ?? []).map((p) => [p.sit_id, p.id])),
        );
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

  // Lot X3a (B-07) : un oui à une proposition privée reste « en cours ».
  // Lot Z : les gardes réalisées ont leur propre section (avant, elles
  // tombaient sous « Candidatures sans suite »).
  const { active, done, closed } = useMemo(
    () => groupApplications(apps, { isProposal: (a) => !!proposalBySit[a.sit_id] }),
    [apps, proposalBySit],
  );
  const doneIds = useMemo(() => new Set(done.map((a) => a.application_id)), [done]);

  // Avis déjà déposés par le gardien sur ses gardes réalisées (une lecture).
  const [reviewedSitIds, setReviewedSitIds] = useState<Set<string>>(new Set());
  const doneSitKey = done.map((a) => a.sit_id).sort().join(",");
  useEffect(() => {
    if (!user?.id || !doneSitKey) {
      setReviewedSitIds(new Set());
      return;
    }
    let cancelled = false;
    supabase
      .from("reviews")
      .select("sit_id")
      .eq("reviewer_id", user.id)
      .in("sit_id", doneSitKey.split(","))
      .then(({ data }) => {
        if (cancelled) return;
        setReviewedSitIds(new Set(((data as { sit_id: string | null }[] | null) ?? []).map((r) => String(r.sit_id))));
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, doneSitKey]);

  // Lot X3a (B-08) : retrait depuis la carte, même écriture que /sits.
  const [withdrawApp, setWithdrawApp] = useState<SitterApp | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const confirmWithdraw = async () => {
    if (!withdrawApp || !user) return;
    setWithdrawing(true);
    try {
      const { error } = await supabase
        .from("applications")
        .update({ status: "cancelled" as any })
        .eq("id", withdrawApp.application_id)
        .eq("sitter_id", user.id);
      if (error) throw error;
      const { data: conv } = await supabase
        .from("conversations")
        .select("id")
        .eq("sit_id", withdrawApp.sit_id)
        .eq("sitter_id", user.id)
        .limit(1)
        .maybeSingle();
      if ((conv as { id?: string } | null)?.id) {
        await supabase.from("messages").insert({
          conversation_id: (conv as { id: string }).id,
          sender_id: user.id,
          content: "Le gardien a retiré sa candidature.",
          is_system: true,
        });
      }
      toast({ title: "Candidature retirée" });
      setWithdrawApp(null);
      void load();
    } catch (e) {
      logger.error("MesCandidatures.withdraw", { error: String(e) });
      toast({ variant: "destructive", title: "Retrait impossible", description: "Réessayez dans un instant." });
    } finally {
      setWithdrawing(false);
    }
  };

  // Rappel de statut professionnel déclaré (visible par les propriétaires).
  const [proInfo, setProInfo] = useState<{ status: string; specialty: string | null } | null>(null);
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const profRes = await supabase
        .from("profiles")
        .select("pro_status, pro_specialty")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const status = (profRes.data as any)?.pro_status;
      if (status === "declared" || status === "verified") {
        setProInfo({
          status,
          specialty: (profRes.data as any)?.pro_specialty ?? null,
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
    // Lot X3a (B-04) : une clôture système n'est jamais lue comme un retrait.
    const badgeLabel = app.status === "cancelled"
      ? cancelledApplicationLabel(app.sit_status, !!app.sit_cancelled_by_me)
      : badge.label(app.viewed_at);
    const isDone = doneIds.has(app.application_id);
    const note = isDone
      ? "Garde terminée"
      : sitStateNote(app.sit_status, {
          appStatus: app.status,
          fromProposal: !!proposalBySit[app.sit_id],
          cancelledByMe: !!app.sit_cancelled_by_me,
        });
    // Lot Z : accès à l'avis tant que la garde est évaluable (terminée, ou
    // archivée après sa date de fin), même règle que /review.
    const canReview =
      isDone &&
      !reviewedSitIds.has(app.sit_id) &&
      isSitReviewable({ status: app.sit_status, end_date: app.sit_end_date });
    // Lot X3a (B-08) : sans réponse depuis plus de 7 jours, ce que le gardien peut faire.
    const waitingDays = sitterWaitingDays(app.status, app.sit_status, app.created_at);
    const canWithdraw = isOpenApplicationStatus(app.status) && app.sit_status === "published";
    const proposalId = !showContent ? proposalBySit[app.sit_id] : undefined;
    const title = showContent
      ? app.sit_title || "Annonce sans titre"
      : proposalId
        ? `Garde proposée par ${app.owner?.first_name || "un propriétaire"}`
        : "Annonce non publiée";

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
                ) : proposalId ? (
                  <Link
                    to={`/propositions/${proposalId}`}
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
                {badgeLabel}
              </span>
            </div>

            {note && (
              <p className="text-xs text-muted-foreground bg-muted/60 rounded-lg px-2.5 py-1.5 w-fit">
                {note}
              </p>
            )}

            {waitingDays !== null && (
              <p
                data-testid="application-waiting-note"
                className="text-xs text-foreground bg-accent/50 rounded-lg px-2.5 py-1.5 w-fit"
              >
                {sitterWaitingNote(waitingDays)}
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
                {canReview && (
                  <Button asChild size="sm" className="rounded-xl">
                    <Link to={`/review/${app.sit_id}`}>
                      <Star className="h-4 w-4 mr-1.5" aria-hidden="true" />
                      Laisser un avis
                    </Link>
                  </Button>
                )}
                {isDone && reviewedSitIds.has(app.sit_id) && (
                  <span className="text-xs text-muted-foreground">Avis déposé</span>
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
                {canWithdraw && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-xl text-muted-foreground"
                    onClick={() => setWithdrawApp(app)}
                  >
                    Retirer
                  </Button>
                )}
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

            {done.length > 0 && (
              <section>
                <h2 className="text-sm font-medium text-foreground mb-1">
                  Gardes réalisées ({done.length})
                </h2>
                <p className="text-xs text-muted-foreground mb-3">
                  Les gardes que vous avez menées. Votre avis aide la communauté à se faire confiance.
                </p>
                <ul className="space-y-3">{done.map(renderCard)}</ul>
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

      <AlertDialog open={!!withdrawApp} onOpenChange={(o) => { if (!o && !withdrawing) setWithdrawApp(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer votre candidature ?</AlertDialogTitle>
            <AlertDialogDescription>
              Votre place se libère pour d'autres gardiens et vous restez libre de postuler ailleurs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={withdrawing}>Garder ma candidature</AlertDialogCancel>
            <AlertDialogAction
              disabled={withdrawing}
              onClick={(e) => {
                e.preventDefault();
                void confirmWithdraw();
              }}
            >
              {withdrawing ? "Retrait…" : "Retirer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MesCandidatures;
