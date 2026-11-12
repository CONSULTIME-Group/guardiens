import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import PageMeta from "@/components/PageMeta";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ReportButton from "@/components/reports/ReportButton";
import { useAuth } from "@/contexts/AuthContext";
import { useOutingsEnabled } from "@/hooks/useOutingsEnabled";
import { useHideBottomNav } from "@/components/layout/ChromeVisibility";
import {
  cancelOuting,
  fetchMyOutingStatus,
  fetchOutingAttendees,
  fetchOutingBySlug,
  joinOuting,
  leaveOuting,
  removeOutingAttendee,
  type MyOutingStatus,
  type OutingAttendee,
} from "@/lib/outingsData";
import {
  JOIN_REFUSAL,
  OUTING_COPY,
  feeLabel,
  joinSourceFromSearch,
  outingCategory,
  outingDateLabel,
  outingPath,
  outingPlaceLine,
  outingShareText,
  outingShareUrl,
  outingState,
  placesLeft,
  placesLine,
  settingLabel,
  takenLine,
  type PublicOuting,
} from "@/lib/outings";
import { startConversationAndNavigate } from "@/lib/conversation";
import { capitalizeFirstName } from "@/lib/displayName";
import { trackEvent } from "@/lib/analytics";
import { toast } from "sonner";

const JOIN_PARAM = "je-viens";

const memberSince = (iso: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `Membre depuis ${new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(d)}`;
};

const Banner = ({ tone, title, children }: { tone: "ok" | "info"; title: string; children: React.ReactNode }) => (
  <div role="status" className={`flex flex-col gap-1 rounded-2xl px-4 py-3.5 ${tone === "ok" ? "bg-primary/10" : "bg-accent/40"}`}>
    <p className={`text-[17px] font-semibold ${tone === "ok" ? "text-primary" : ""}`}>{title}</p>
    <p className="text-sm leading-relaxed">{children}</p>
  </div>
);

const Fact = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-[14px] border border-border bg-card px-3.5 py-3">
    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
    <dd className="mt-1 text-[15px] font-semibold leading-snug">{value}</dd>
  </div>
);

/** Lot SORT1 : fiche d'une sortie, lisible sans compte et hors index. */
const SortieDetail = () => {
  const { slug = "" } = useParams();
  const { enabled, loading: gateLoading } = useOutingsEnabled();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [outing, setOuting] = useState<PublicOuting | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [myStatus, setMyStatus] = useState<MyOutingStatus>(null);
  const [attendees, setAttendees] = useState<OutingAttendee[]>([]);
  const [busy, setBusy] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelNote, setCancelNote] = useState("");
  const viewed = useRef(false);
  const autoJoined = useRef(false);
  useHideBottomNav(true);

  const source = joinSourceFromSearch(location.search);
  const justPublished = searchParams.get("publiee") === "1";
  const justUpdated = searchParams.get("modifiee") === "1";
  const isOrganizer = !!user?.id && outing?.organizer_id === user.id;

  const load = useCallback(async () => {
    const { data, error } = await fetchOutingBySlug(slug);
    setOuting(data);
    setFailed(!!error);
    setLoading(false);
    return data;
  }, [slug]);

  const loadMine = useCallback(async (o: PublicOuting | null) => {
    if (!o || !user?.id) return;
    if (o.organizer_id === user.id) {
      const { data } = await fetchOutingAttendees(o.id);
      setAttendees(data);
    } else {
      setMyStatus(await fetchMyOutingStatus(o.id));
    }
  }, [user?.id]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    load().then((o) => { if (!cancelled) loadMine(o); });
    return () => { cancelled = true; };
  }, [enabled, load, loadMine]);

  useEffect(() => {
    if (!outing || viewed.current) return;
    viewed.current = true;
    trackEvent("outing_viewed", { source, metadata: { outing: outing.id, signed_in: isAuthenticated, state: outingState(outing) } });
  }, [outing, source, isAuthenticated]);

  const join = useCallback(async () => {
    if (!outing || busy) return;
    if (!isAuthenticated) {
      const back = `${outingPath(outing.slug)}?via=${source === "site" ? "site" : new URLSearchParams(location.search).get("via")}&${JOIN_PARAM}=1`;
      trackEvent("outing_join_needs_account", { source, metadata: { outing: outing.id } });
      navigate(`/inscription?redirect=${encodeURIComponent(back)}`);
      return;
    }
    setBusy(true);
    const result = await joinOuting(outing.id, source);
    setBusy(false);
    if (!result.ok) {
      toast.error(JOIN_REFUSAL[result.reason ?? ""] ?? "L'inscription a échoué. Réessayez dans un instant.");
      await load();
      return;
    }
    trackEvent("outing_joined", { source, metadata: { outing: outing.id } });
    setMyStatus("going");
    await load();
  }, [outing, busy, isAuthenticated, source, location.search, navigate, load]);

  // Retour d'inscription : la place se prend d'elle-même, une fois.
  useEffect(() => {
    if (autoJoined.current || !outing || !isAuthenticated || isOrganizer) return;
    if (searchParams.get(JOIN_PARAM) !== "1") return;
    autoJoined.current = true;
    const next = new URLSearchParams(searchParams);
    next.delete(JOIN_PARAM);
    setSearchParams(next, { replace: true });
    if (myStatus !== "going") join();
  }, [outing, isAuthenticated, isOrganizer, searchParams, setSearchParams, myStatus, join]);

  if (gateLoading || (enabled && loading)) {
    return <div className="mx-auto flex max-w-2xl flex-col gap-4 p-5" aria-busy="true"><Skeleton className="h-10 w-40" /><Skeleton className="h-60 w-full rounded-[20px]" /><Skeleton className="h-24 w-full rounded-2xl" /></div>;
  }
  if (!enabled) return <Navigate to="/petites-missions" replace />;

  if (!outing) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4 px-5 py-10">
        <PageMeta title="Sortie indisponible" description="Cette sortie est indisponible." noindex />
        <h1 className="font-heading text-2xl font-bold">{failed ? "Lecture impossible pour le moment" : "Cette sortie est indisponible"}</h1>
        <p className="text-base">D'autres sorties vous attendent près de chez vous.</p>
        <Button asChild className="h-12 self-start rounded-2xl"><Link to="/sorties">Voir les sorties</Link></Button>
      </div>
    );
  }

  const category = outingCategory(outing.category);
  const state = outingState(outing);
  const organizerName = capitalizeFirstName(outing.organizer_first_name) || "L'organisateur";
  const since = memberSince(outing.organizer_member_since);
  const setting = settingLabel(outing.setting);
  const going = myStatus === "going";
  const shareUrl = outingShareUrl(outing.slug, window.location.origin);

  const leave = async () => {
    if (busy) return;
    setBusy(true);
    const result = await leaveOuting(outing.id);
    setBusy(false);
    if (!result.ok) { toast.error("La place reste réservée : réessayez dans un instant."); return; }
    trackEvent("outing_left", { metadata: { outing: outing.id } });
    setMyStatus("left");
    await load();
  };

  const share = async () => {
    trackEvent("outing_link_shared", { metadata: { outing: outing.id, by: isOrganizer ? "organizer" : "visitor" } });
    const text = outingShareText(outing);
    try {
      if (navigator.share) { await navigator.share({ title: outing.title, text, url: shareUrl }); return; }
      await navigator.clipboard.writeText(`${text} ${shareUrl}`);
      toast.success("Lien copié, prêt à envoyer.");
    } catch {
      /* partage refermé par le membre */
    }
  };

  const remove = async (attendee: OutingAttendee) => {
    if (busy) return;
    setBusy(true);
    const result = await removeOutingAttendee(outing.id, attendee.user_id);
    setBusy(false);
    if (!result.ok) { toast.error("Le retrait a échoué. Réessayez dans un instant."); return; }
    trackEvent("outing_attendee_removed", { metadata: { outing: outing.id } });
    await load().then(loadMine);
  };

  const confirmCancel = async () => {
    if (busy) return;
    setBusy(true);
    const result = await cancelOuting(outing.id, cancelNote);
    setBusy(false);
    if (!result.ok) { toast.error("L'annulation a échoué. Réessayez dans un instant."); return; }
    trackEvent("outing_cancelled", { metadata: { outing: outing.id, attendees: attendees.length } });
    setCancelOpen(false);
    await load();
  };

  const write = (otherUserId: string) => startConversationAndNavigate({ otherUserId, context: "helper_inquiry" }, navigate);

  const bars = Array.from({ length: outing.capacity }, (_, i) => i < outing.taken);

  let stickyLabel = `${placesLine(outing)} · ${feeLabel(outing.participation_eur)}`;
  let stickySub = outingDateLabel(outing.starts_at);
  if (state === "cancelled") { stickyLabel = "Sortie annulée"; }
  else if (state === "past") { stickyLabel = "Sortie passée"; }
  else if (going) { stickyLabel = OUTING_COPY.going; }
  else if (isOrganizer) { stickyLabel = placesLine(outing); stickySub = takenLine(outing.taken); }
  else if (!isAuthenticated) { stickySub = "Compte gratuit, créé en une étape"; }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col">
      <PageMeta
        title={`${outing.title}, ${outingDateLabel(outing.starts_at).toLowerCase()}`}
        description={`${placesLine(outing)}. ${feeLabel(outing.participation_eur)}. ${outingPlaceLine(outing)}.`}
        path={outingPath(outing.slug)}
        noindex
      />
      <div className="flex flex-1 flex-col gap-5 px-5 pb-6 pt-3">
        <div className="flex items-center justify-between">
          <Link to="/sorties" className="flex min-h-11 items-center gap-1.5 text-[15px] font-medium no-underline">← Sorties</Link>
          <Button type="button" variant="outline" onClick={share} className="h-11 rounded-full px-3.5 text-sm">Partager</Button>
        </div>

        {justPublished && isOrganizer && <Banner tone="ok" title={OUTING_COPY.published}>{OUTING_COPY.shareBody}</Banner>}
        {justUpdated && isOrganizer && <Banner tone="ok" title={OUTING_COPY.updated}>{OUTING_COPY.editIntro}</Banner>}
        {!isAuthenticated && state === "open" && (
          <Banner tone="ok" title={`${organizerName} vous invite`}>Guardiens réunit les gens du coin autour de gardes, de coups de main et de sorties. Guardiens est gratuit.</Banner>
        )}
        {going && state !== "cancelled" && (
          <Banner tone="ok" title="Vous venez">Votre place est réservée. {organizerName} vous donne le rendez-vous par message.</Banner>
        )}
        {state === "cancelled" && (
          <Banner tone="info" title="Sortie annulée">
            {outing.cancel_note ? `${organizerName} a écrit : « ${outing.cancel_note} »` : "D'autres sorties vous attendent près de chez vous."}
          </Banner>
        )}

        <div className="flex justify-center rounded-[20px] bg-accent/30 p-3">
          <img src={category.art} alt={category.alt} width={240} height={240} className="h-60 w-60 object-contain" />
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sortie · {category.label}</p>
          <h1 className="font-heading text-[30px] font-bold leading-tight">{outing.title}</h1>
          {outing.description && <p className="whitespace-pre-line text-base leading-relaxed">{outing.description}</p>}
        </div>

        <dl className="grid grid-cols-2 gap-2.5">
          <Fact label="Quand" value={outingDateLabel(outing.starts_at)} />
          <Fact label="Où" value={outingPlaceLine(outing)} />
          <Fact label="Participation" value={feeLabel(outing.participation_eur).replace("Participation : ", "")} />
          {setting && <Fact label="Cadre" value={setting} />}
        </dl>

        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[17px] font-semibold" data-testid="outing-places">{state === "cancelled" ? "Sortie annulée" : placesLine(outing)}</p>
            <p className="text-sm text-muted-foreground">{takenLine(outing.taken)}</p>
          </div>
          <div role="img" aria-label={`${outing.taken} places prises sur ${outing.capacity}`} className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.min(outing.capacity, 10)}, minmax(0, 1fr))` }}>
            {bars.map((taken, i) => (
              <span key={i} className={`h-2.5 rounded-full ${taken ? "bg-primary" : "border border-dashed border-input bg-card"}`} />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div aria-hidden="true" className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-primary/10 font-heading text-[22px] font-bold text-primary">
            {organizerName.charAt(0)}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Proposée par</p>
            <p className="text-base font-semibold">{isOrganizer ? "Vous" : organizerName}</p>
            <p className="text-sm text-muted-foreground">{[since, outing.organizer_identity_verified ? "Identité vérifiée" : null].filter(Boolean).join(" · ")}</p>
          </div>
        </div>

        {isOrganizer && state !== "cancelled" && (
          <section className="flex flex-col gap-3 rounded-2xl bg-accent/30 p-4" data-testid="outing-organizer">
            <h2 className="text-[17px] font-semibold">{OUTING_COPY.shareTitle}</h2>
            <p className="break-all rounded-xl bg-card px-3 py-2.5 text-sm">{shareUrl}</p>
            <Button type="button" onClick={share} className="h-12 rounded-2xl text-base">Envoyer le lien</Button>
            <p className="text-sm leading-relaxed">{OUTING_COPY.shareBody}</p>
          </section>
        )}

        {isOrganizer && (
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Inscrits ({attendees.length})</h2>
            {attendees.length === 0 && <p className="text-[15px] text-muted-foreground">Les premières inscriptions arrivent souvent par le lien envoyé à vos proches.</p>}
            {attendees.map((a) => (
              <div key={a.user_id} className="flex flex-col gap-2.5 rounded-2xl border border-border bg-card p-3.5">
                <div>
                  <p className="text-base font-semibold">{capitalizeFirstName(a.first_name) || "Un membre"}</p>
                  <p className="text-sm text-muted-foreground">{[memberSince(a.member_since), a.identity_verified ? "Identité vérifiée" : null].filter(Boolean).join(" · ")}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="outline" onClick={() => write(a.user_id)} className="h-11 rounded-xl">{OUTING_COPY.write}</Button>
                  <Button type="button" variant="outline" disabled={busy || state !== "open" && state !== "full"} onClick={() => remove(a)} className="h-11 rounded-xl">Retirer de la sortie</Button>
                </div>
              </div>
            ))}
            {(state === "open" || state === "full") && (
              <div className="grid grid-cols-2 gap-2">
                <Button asChild variant="outline" className="h-12 rounded-2xl"><Link to={`/sorties/proposer?modifier=${outing.slug}`}>{OUTING_COPY.edit}</Link></Button>
                <Button type="button" variant="outline" onClick={() => setCancelOpen(true)} className="h-12 rounded-2xl">Annuler la sortie</Button>
              </div>
            )}
            {(state === "past" || state === "cancelled") && (
              <Button asChild className="h-12 rounded-2xl text-base" data-testid="outing-repropose"><Link to={`/sorties/proposer?depuis=${outing.slug}`}>{OUTING_COPY.repropose}</Link></Button>
            )}
          </section>
        )}

        {!isOrganizer && (
          <div className="flex flex-col gap-1.5 rounded-2xl bg-accent/30 p-4">
            <p className="text-[15px] font-semibold">Comment ça se passe</p>
            <p className="text-sm leading-relaxed">{isAuthenticated ? OUTING_COPY.how : `${OUTING_COPY.how} ${OUTING_COPY.guest}`}</p>
          </div>
        )}

        {!isOrganizer && <ReportButton targetId={outing.id} targetType="outing" variant="profile-link" />}
      </div>

      {!(isOrganizer && state !== "open" && state !== "full") && (
        <div className="sticky bottom-0 z-20 flex items-center gap-3 border-t border-border bg-card px-5 pb-4 pt-3">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-[15px] font-semibold">{stickyLabel}</span>
            <span className="text-[13px] text-muted-foreground">{stickySub}</span>
          </div>
          {state === "open" && !going && !isOrganizer && (
            <Button type="button" disabled={busy} onClick={join} className="h-[52px] rounded-full px-7 text-base" data-testid="outing-join">{OUTING_COPY.join}</Button>
          )}
          {going && (state === "open" || state === "full") && (
            <>
              <Button type="button" variant="outline" disabled={busy} onClick={leave} className="h-[52px] rounded-full px-4 text-[15px]">{OUTING_COPY.leave}</Button>
              <Button type="button" onClick={() => write(outing.organizer_id)} className="h-[52px] rounded-full px-5 text-[15px]">{OUTING_COPY.write}</Button>
            </>
          )}
          {!going && !isOrganizer && state !== "open" && (
            <Button asChild variant="outline" className="h-[52px] rounded-full px-5 text-[15px]"><Link to="/sorties">Voir les sorties</Link></Button>
          )}
          {isOrganizer && (state === "open" || state === "full") && (
            <Button type="button" onClick={share} className="h-[52px] rounded-full px-5 text-[15px]">Envoyer le lien</Button>
          )}
        </div>
      )}

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Annuler cette sortie ?</DialogTitle>
            <DialogDescription>
              {attendees.length > 0 ? `Les ${attendees.length} inscrits sont prévenus dans leur cloche.` : "La fiche affiche « Sortie annulée »."} Vous pouvez leur laisser un mot.
            </DialogDescription>
          </DialogHeader>
          <Textarea value={cancelNote} maxLength={300} rows={3} aria-label="Un mot pour les inscrits" placeholder="Un imprévu samedi, je la repropose la semaine suivante." onChange={(e) => setCancelNote(e.target.value)} />
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setCancelOpen(false)} className="h-11">Garder la sortie</Button>
            <Button type="button" variant="destructive" disabled={busy} onClick={confirmCancel} className="h-11">Annuler la sortie</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SortieDetail;
