/**
 * Lot L6 (09/11/2026, arène tableau de bord v2, B-05 avec A-06) : une
 * candidature reçue a sa page, /candidatures/:id.
 *
 * Le propriétaire lit la candidature en entier sur un écran : qui est le
 * gardien (identité vérifiée, gardes, avis, membre depuis), son mot, ce qui
 * vous rapproche, son dernier avis. Trois gestes, un seul bouton plein :
 * « Répondre à {prénom} » (la conversation), « Choisir {prénom} » (contour,
 * confirmation), « Décliner avec un mot aimable » (feuille, mot proposé et
 * modifiable). Après un déclin, retour au récit de l'accueil sur téléphone
 * (« Camille a votre réponse. », B-07), à la liste des candidatures sur
 * ordinateur. Ouvrir la page marque la candidature lue (mark_application_viewed).
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useHideBottomNav } from "@/components/layout/ChromeVisibility";
import { useAcceptApplication } from "@/hooks/useAcceptApplication";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import VerifiedBadge from "@/components/profile/VerifiedBadge";
import OwnerToSitterAffinity from "@/components/matching/OwnerToSitterAffinity";
import type { AffinitySitterInput } from "@/lib/affinityScore";
import { avatarImageUrl } from "@/lib/storageImage";
import { memberSinceLabel } from "@/lib/responderTrust";
import { reviewDatesLine } from "@/lib/reviewDates";
import { storyDate } from "@/lib/dashboardStory";
import { DECLINE_MESSAGE_MAX, KIND_DECLINE_MESSAGES, declineApplication } from "@/lib/applicationDecline";
import { invalidateMyApplications } from "@/lib/dashboardShared";
import { afterReplyTarget, isDesktopViewport, noticeFirstName } from "@/lib/afterPublish";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const AFFINITY_COLUMNS =
  "user_id, experience_years, life_pace, lifestyle, availability_during, has_vehicle, has_license, languages, interests, work_during_sit, sensitivities, animal_types, sitter_type, travels_with_children, travels_with_own_animals, special_animal_skills, farm_animals_ok";

const OPEN_STATUSES = ["pending", "viewed", "discussing"];

export interface ApplicationPageData {
  application: { id: string; sit_id: string; sitter_id: string; status: string; message: string | null; created_at: string };
  sit: { id: string; title: string | null; start_date: string | null; end_date: string | null; status: string; user_id: string };
  sitter: {
    first_name?: string | null; city?: string | null; avatar_url?: string | null; bio?: string | null;
    identity_verified?: boolean | null; completed_sits_count?: number | null; created_at?: string | null;
  } | null;
  affinity: AffinitySitterInput | null;
  reviews: Array<{ overall_rating: number | null; comment: string | null; created_at: string; sit_start_date?: string | null; sit_end_date?: string | null; review_type?: string | null }>;
}

async function loadApplicationPage(id: string): Promise<ApplicationPageData | null> {
  const { data: app, error } = await supabase
    .from("applications")
    .select("id, sit_id, sitter_id, status, message, created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!app) return null;
  const [sitRes, profRes, affRes, revRes] = await Promise.all([
    supabase.from("sits").select("id, title, start_date, end_date, status, user_id").eq("id", app.sit_id).maybeSingle(),
    supabase.from("public_profiles")
      .select("id, first_name, city, avatar_url, bio, identity_verified, completed_sits_count, created_at")
      .eq("id", app.sitter_id).maybeSingle(),
    supabase.from("sitter_profiles_affinity").select(AFFINITY_COLUMNS).eq("user_id", app.sitter_id).maybeSingle(),
    supabase.rpc("public_profile_reviews", { p_user_id: app.sitter_id }),
  ]);
  if (!sitRes.data) return null;
  const aff = affRes.data as Record<string, unknown> | null;
  let affinity: AffinitySitterInput | null = null;
  if (aff) {
    const { user_id: _ignored, ...rest } = aff;
    affinity = rest as unknown as AffinitySitterInput;
  }
  const reviews = ((revRes.data as ApplicationPageData["reviews"] | null) ?? [])
    .filter((r) => (r.review_type ?? "garde") === "garde")
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  return {
    application: app as ApplicationPageData["application"],
    sit: sitRes.data as ApplicationPageData["sit"],
    sitter: (profRes.data as ApplicationPageData["sitter"]) ?? null,
    affinity,
    reviews,
  };
}

/** « 4,8 · 3 avis », null sans avis. */
export function ratingLine(reviews: ApplicationPageData["reviews"]): string | null {
  const notes = reviews.map((r) => r.overall_rating).filter((n): n is number => typeof n === "number");
  if (notes.length === 0) return null;
  const avg = (notes.reduce((a, b) => a + b, 0) / notes.length).toFixed(1).replace(".", ",");
  return `${avg} · ${notes.length} avis`;
}

export default function ApplicationDetail() {
  useHideBottomNav(true);
  const { id = "" } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [chooseOpen, setChooseOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineWord, setDeclineWord] = useState<string>(KIND_DECLINE_MESSAGES[0]);
  const [busy, setBusy] = useState(false);

  const key = ["application-page", id];
  const { data, isLoading, error } = useQuery({ queryKey: key, enabled: !!id && !!user, queryFn: () => loadApplicationPage(id) });
  const reload = () => qc.invalidateQueries({ queryKey: key });

  const isOwner = !!data && !!user && data.sit.user_id === user.id;
  const app = data?.application;
  const firstName = noticeFirstName(data?.sitter?.first_name) ?? "ce gardien";
  const displayName = noticeFirstName(data?.sitter?.first_name) ?? "Le gardien";

  // La candidature ouverte par le propriétaire passe de « nouvelle » à « lue ».
  useEffect(() => {
    if (!isOwner || !app || app.status !== "pending") return;
    void (async () => {
      const { error: e } = await supabase.rpc("mark_application_viewed" as never, { p_application_id: app.id } as never);
      if (!e && user) invalidateMyApplications(user.id);
    })();
    trackEvent("application_page_opened", { source: "/candidatures", metadata: { application_id: app.id, status: app.status } });
  }, [isOwner, app?.id, app?.status, user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Un gardien qui ouvre sa propre candidature va à ses candidatures.
  useEffect(() => {
    if (data && user && !isOwner && data.application.sitter_id === user.id) navigate("/mes-candidatures", { replace: true });
  }, [data, user, isOwner, navigate]);

  const { acceptApplication, accepting, accordDialog } = useAcceptApplication({
    onAccepted: () => { setChooseOpen(false); if (user) invalidateMyApplications(user.id); void reload(); },
    onAccordClosed: () => { void reload(); },
  });

  const sitDates = useMemo(() => {
    if (!data) return null;
    const a = storyDate(data.sit.start_date);
    const b = storyDate(data.sit.end_date);
    return a && b ? `du ${a} au ${b}` : null;
  }, [data]);

  if (isLoading) {
    return <div className="mx-auto max-w-[640px] px-4 pt-6 text-[15px] text-muted-foreground">Chargement de la candidature…</div>;
  }
  if (error || !data || (!isOwner && data.application.sitter_id !== user?.id)) {
    return (
      <div className="mx-auto max-w-[640px] px-4 pt-10 text-center" data-testid="application-page-missing">
        <h1 className="font-heading text-[24px] text-foreground">Cette candidature est introuvable</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">Elle a peut-être été retirée par le gardien.</p>
        <Link to="/dashboard" className="mt-6 inline-flex min-h-[44px] items-center rounded-full border border-border px-5 text-[15px] font-semibold">
          Retour à l'accueil
        </Link>
      </div>
    );
  }

  const { sit, sitter } = data;
  const open = OPEN_STATUSES.includes(app!.status);
  const since = memberSinceLabel(sitter?.created_at ?? null);
  const rating = ratingLine(data.reviews);
  const lastReview = data.reviews.find((r) => (r.comment ?? "").trim()) ?? null;
  const done = sitter?.completed_sits_count ?? 0;
  const backHref = `/sits/${sit.id}#candidatures`;

  const onReply = async () => {
    if (!user || busy) return;
    setBusy(true);
    trackEvent("application_page_reply", { source: "/candidatures", metadata: { application_id: app!.id } });
    const { startConversationAndNavigate } = await import("@/lib/conversation");
    const convId = await startConversationAndNavigate({ otherUserId: app!.sitter_id, context: "sit_application", sitId: sit.id }, navigate);
    if (convId && (app!.status === "pending" || app!.status === "viewed")) {
      await supabase.from("applications").update({ status: "discussing" as never }).eq("id", app!.id);
      invalidateMyApplications(user.id);
    }
    setBusy(false);
  };

  const onDecline = async () => {
    if (!user || busy) return;
    setBusy(true);
    try {
      await declineApplication({
        applicationId: app!.id, sitId: sit.id, sitterId: app!.sitter_id, sitTitle: sit.title ?? "", ownerId: user.id, message: declineWord,
      });
      trackEvent("application_page_declined", {
        source: "/candidatures",
        metadata: { application_id: app!.id, kind_word: KIND_DECLINE_MESSAGES.indexOf(declineWord) },
      });
      setDeclineOpen(false);
      navigate(afterReplyTarget({ sitId: sit.id, firstName: sitter?.first_name ?? null, phone: !isDesktopViewport() }));
    } catch {
      toast({ title: "Le déclin n'a pas abouti", description: "Réessayez dans un instant.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-[calc(11rem+env(safe-area-inset-bottom))]" data-testid="application-page" data-status={app!.status}>
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-background/95 px-2 py-2 backdrop-blur">
        <Link to={backHref} aria-label="Toutes les candidatures" className="flex h-[44px] w-[44px] items-center justify-center rounded-full hover:bg-muted">
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Link>
        <p className="min-w-0 flex-1 truncate text-[15px] font-semibold text-foreground">{sit.title || "Votre annonce"}</p>
      </header>

      <main className="mx-auto w-full max-w-[640px] space-y-4 px-4 pt-5">
        <section className="flex items-start gap-4">
          {sitter?.avatar_url ? (
            <img src={avatarImageUrl(sitter.avatar_url, 128)} alt="" className="h-16 w-16 shrink-0 rounded-full object-cover" />
          ) : (
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 font-heading text-[24px] text-primary" aria-hidden="true">
              {displayName.charAt(0)}
            </span>
          )}
          <div className="min-w-0">
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-secondary">Candidature{sitDates ? ` · ${sitDates}` : ""}</p>
            <h1 className="mt-1 flex flex-wrap items-center gap-2 font-heading text-[28px] leading-tight text-foreground">
              {displayName}
              {sitter?.identity_verified && <VerifiedBadge size="sm" />}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-foreground/80">
              {sitter?.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{sitter.city}</span>}
              <span>{done} garde{done > 1 ? "s" : ""} sur Guardiens</span>
              {rating && <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-current text-primary" aria-hidden="true" />{rating}</span>}
            </p>
            {since && <p className="mt-0.5 text-[14px] text-foreground/70">{since}</p>}
          </div>
        </section>

        {app!.message && (
          <section className="rounded-2xl border border-border bg-card p-4" data-testid="application-message">
            <h2 className="text-[14px] font-semibold text-foreground">Son mot</h2>
            <p className="mt-2 whitespace-pre-line text-[16px] leading-relaxed text-foreground">{app!.message}</p>
          </section>
        )}

        {data.affinity && (
          <section className="rounded-2xl border border-border bg-card p-4">
            <h2 className="text-[14px] font-semibold text-foreground">Ce qui vous rapproche</h2>
            <div className="mt-2">
              <OwnerToSitterAffinity
                sitterProfile={data.affinity}
                context="owner_application_page"
                targetId={app!.sitter_id}
                size="md"
                showCta={false}
                scope="single"
                displayKey="score"
              />
            </div>
          </section>
        )}

        {lastReview && (
          <section className="rounded-2xl border border-border bg-card p-4" data-testid="application-last-review">
            <h2 className="text-[14px] font-semibold text-foreground">Son dernier avis</h2>
            <p className="mt-2 text-[15px] italic leading-relaxed text-foreground/90">« {lastReview.comment!.trim()} »</p>
            <p className="mt-1 text-[13px] text-foreground/70">{reviewDatesLine(lastReview)}</p>
          </section>
        )}

        {sitter?.bio && (
          <section className="rounded-2xl border border-border bg-card p-4">
            <h2 className="text-[14px] font-semibold text-foreground">En quelques mots</h2>
            <p className="mt-2 line-clamp-6 whitespace-pre-line text-[15px] leading-relaxed text-foreground/90">{sitter.bio}</p>
          </section>
        )}

        <Link to={`/gardiens/${app!.sitter_id}`} className="inline-flex min-h-[44px] items-center text-[15px] font-semibold text-primary underline underline-offset-4">
          Voir le profil complet de {displayName}
        </Link>

        {!open && (
          <p role="status" className="rounded-2xl bg-muted/60 p-4 text-[15px] text-foreground" data-testid="application-closed">
            {app!.status === "accepted"
              ? `Vous avez choisi ${displayName}. La garde est confirmée.`
              : app!.status === "rejected"
                ? `Vous avez décliné la candidature de ${displayName}.`
                : `${displayName} a retiré sa candidature.`}
          </p>
        )}
      </main>

      {open && (
        <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur" data-testid="application-actions">
          <div className="mx-auto w-full max-w-[640px]">
            <button
              type="button"
              onClick={() => { void onReply(); }}
              disabled={busy}
              className="flex min-h-[50px] w-full items-center justify-center rounded-full bg-primary px-5 text-[16px] font-semibold text-primary-foreground disabled:opacity-60"
            >
              Répondre à {displayName}
            </button>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setChooseOpen(true)}
                className="min-h-[44px] rounded-full border-[1.5px] border-foreground/70 px-3 text-[15px] font-semibold text-foreground"
              >
                Choisir {displayName}
              </button>
              <button
                type="button"
                onClick={() => { setDeclineWord(KIND_DECLINE_MESSAGES[0]); setDeclineOpen(true); }}
                className="min-h-[44px] rounded-full px-3 text-[15px] font-medium text-foreground/80 underline underline-offset-4"
              >
                Décliner avec un mot aimable
              </button>
            </div>
          </div>
        </footer>
      )}

      {app!.status === "accepted" && (
        <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur">
          <div className="mx-auto w-full max-w-[640px]">
            <button
              type="button"
              onClick={() => { void onReply(); }}
              className="flex min-h-[50px] w-full items-center justify-center rounded-full bg-primary px-5 text-[16px] font-semibold text-primary-foreground"
            >
              Écrire à {displayName}
            </button>
          </div>
        </footer>
      )}

      <Dialog open={chooseOpen} onOpenChange={setChooseOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Choisir {displayName} pour cette garde ?</DialogTitle>
            <DialogDescription>
              La garde sera confirmée avec {displayName}, et les autres candidats seront prévenus.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setChooseOpen(false)} className="min-h-[44px] rounded-full border border-border px-5 text-[15px] font-semibold">
              Revenir à la candidature
            </button>
            <button
              type="button"
              disabled={accepting}
              onClick={() => { void acceptApplication({ applicationId: app!.id, sitId: sit.id, sitterId: app!.sitter_id, sitterFirstName: sitter?.first_name ?? null }); }}
              className="min-h-[44px] rounded-full bg-primary px-5 text-[15px] font-semibold text-primary-foreground disabled:opacity-60"
            >
              Confirmer mon choix
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Sheet open={declineOpen} onOpenChange={setDeclineOpen}>
        <SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto rounded-t-3xl px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]" data-testid="decline-sheet">
          <SheetHeader className="text-left">
            <SheetTitle className="font-heading text-[22px]">Décliner avec un mot aimable</SheetTitle>
            <SheetDescription className="text-[15px]">{displayName} lira ce mot dans vos messages. Modifiez-le librement.</SheetDescription>
          </SheetHeader>
          <ul className="mt-4 space-y-2" role="radiogroup" aria-label="Mots proposés">
            {KIND_DECLINE_MESSAGES.map((m, i) => (
              <li key={i}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={declineWord === m}
                  onClick={() => setDeclineWord(m)}
                  className={cn(
                    "w-full rounded-2xl border-[1.5px] p-3 text-left text-[14px] leading-snug",
                    declineWord === m ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card text-foreground/85",
                  )}
                >
                  {m}
                </button>
              </li>
            ))}
          </ul>
          <label htmlFor="decline-word" className="mt-4 block text-[14px] font-semibold text-foreground">Votre mot</label>
          <textarea
            id="decline-word"
            value={declineWord}
            maxLength={DECLINE_MESSAGE_MAX}
            rows={4}
            onChange={(e) => setDeclineWord(e.target.value)}
            className="mt-1 w-full resize-none rounded-xl border border-field bg-background p-3 text-[16px] leading-snug"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => { void onDecline(); }}
            className="mt-4 flex min-h-[50px] w-full items-center justify-center rounded-full bg-primary px-5 text-[16px] font-semibold text-primary-foreground disabled:opacity-60"
            data-testid="decline-confirm"
          >
            Envoyer et décliner
          </button>
        </SheetContent>
      </Sheet>

      {accordDialog}
    </div>
  );
}
