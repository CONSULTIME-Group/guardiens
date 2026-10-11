/**
 * Lot I2 : page d'une proposition de garde privée (/propositions/:id).
 *
 * Le gardien invité y voit tout ce qu'il faut pour dire oui en confiance :
 * photos du logement, dates, lieu, ce qui lui est confié, le mot du
 * propriétaire. Il répond par oui, par une question ou par un non avec un
 * mot. Le propriétaire y voit sa proposition et son état.
 * Données lues par get_sit_proposal (aucune lecture directe d'un brouillon).
 */
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Textarea } from "@/components/ui/textarea";
import { avatarImageUrl, storageImageUrl } from "@/lib/storageImage";
import type { EventType } from "@/lib/analytics";
import {
  getSitProposal,
  petsLabel,
  propertyLabel,
  proposalErrorMessage,
  proposalPeriod,
  proposalTimeLeft,
  respondSitProposal,
  type SitProposal as Proposal,
} from "@/lib/sitProposal";

const track = (event: EventType, metadata: Record<string, unknown>) => {
  void import("@/lib/analytics").then(({ trackEvent }) => trackEvent(event, { source: "sit_proposal_page", metadata }));
};

const primaryBtn =
  "flex w-full min-h-[48px] items-center justify-center rounded-[99px] bg-primary px-5 text-[15px] font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors";
const secondaryBtn =
  "flex w-full min-h-[46px] items-center justify-center rounded-[99px] border border-border bg-card px-5 text-[14px] font-semibold text-foreground hover:border-primary/50 transition-colors";

type Panel = null | "accept" | "decline";

const STATE_COPY: Record<Exclude<Proposal["state"], "open">, string> = {
  applied: "Vous avez dit oui. Le propriétaire confirme la garde avec vous, vous recevez une notification dès que c'est fait.",
  declined: "Vous avez décliné cette proposition. Merci d'avoir répondu.",
  closed: "Cette proposition est close : la garde n'est plus disponible.",
  expired: "Cette proposition a expiré.",
};

const OWNER_STATE_COPY: Record<Proposal["state"], string> = {
  open: "En attente de réponse.",
  applied: "Le gardien a dit oui : sa candidature vous attend dans votre garde, confirmez-la pour valider la garde.",
  declined: "Le gardien a décliné cette proposition.",
  closed: "Proposition close.",
  expired: "Proposition expirée, sans réponse.",
};

const SitProposalPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [allPhotos, setAllPhotos] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getSitProposal(id)
      .then((p) => {
        if (cancelled) return;
        setProposal(p);
        if (p.viewer === "sitter") track("sit_proposal_viewed", { proposal_id: p.id, state: p.state });
      })
      .catch((e) => !cancelled && setLoadError(proposalErrorMessage(e)));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loadError) {
    return (
      <div className="mx-auto max-w-[720px] px-4 py-16 text-center">
        <h1 className="font-heading text-[28px] font-semibold text-foreground">Proposition introuvable</h1>
        <p className="mt-3 text-[15px] text-muted-foreground">{loadError}</p>
        <Link to="/dashboard" className="mt-6 inline-block font-semibold text-primary">
          Retour à mon espace
        </Link>
      </div>
    );
  }
  if (!proposal) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Chargement…</p>;
  }

  const owner = proposal.owner.first_name || "Le propriétaire";
  const period = proposalPeriod(proposal.sit.start_date, proposal.sit.end_date);
  const timeLeft = proposal.state === "open" ? proposalTimeLeft(proposal.expires_at) : null;
  const confided = petsLabel(proposal.pets);
  const home = propertyLabel(proposal.property);
  const photos = proposal.photos;
  const shownPhotos = allPhotos ? photos : photos.slice(0, 5);
  const isSitter = proposal.viewer === "sitter";
  const facts = [
    { label: "Dates", value: period },
    { label: "Lieu", value: proposal.sit.city ?? "" },
    { label: "Ce qui vous est confié", value: confided },
    { label: "Logement", value: home },
  ].filter((f) => f.value);

  const respond = async (accept: boolean) => {
    setBusy(true);
    setActionError(null);
    try {
      await respondSitProposal(proposal.id, accept, note);
      track(accept ? "sit_proposal_accepted" : "sit_proposal_declined", { proposal_id: proposal.id });
      setProposal({ ...proposal, state: accept ? "applied" : "declined" });
      setPanel(null);
    } catch (e) {
      setActionError(proposalErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const askQuestion = async () => {
    track("sit_proposal_question", { proposal_id: proposal.id });
    const { startConversation } = await import("@/lib/conversation");
    const { conversationId } = await startConversation({
      otherUserId: proposal.owner_id,
      context: "sit_application",
      sitId: proposal.sit.id,
    });
    if (conversationId) navigate(`/messages?c=${conversationId}`);
    else setActionError("Impossible d'ouvrir la conversation.");
  };

  return (
    <div className="mx-auto w-full max-w-[1120px] px-4 py-8 md:px-8 md:py-10" data-sit-proposal>
      <section aria-label="Proposition" className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-[13px] font-bold text-primary">
              {isSitter ? "Proposition pour vous" : "Votre proposition"}
            </span>
            <span className="text-[13px] text-muted-foreground">
              {isSitter ? "Visible par vous seulement" : "Garde privée, visible par le gardien invité"}
            </span>
          </div>
          <h1 className="mt-2 font-heading text-[30px] font-semibold leading-tight text-foreground md:text-[40px]">
            {proposal.sit.title || (isSitter ? "Une garde vous est proposée" : "Votre garde")}
          </h1>
          <p className="mt-1 text-[16px] text-muted-foreground">
            {isSitter ? `${owner} vous propose de garder sa maison` : "Vous proposez votre maison"}
            {period ? ` ${period.charAt(0).toLowerCase()}${period.slice(1)}` : ""}
            {proposal.sit.city ? `, à ${proposal.sit.city}` : ""}.
          </p>
        </div>
        {timeLeft && <p className="text-[14px] font-semibold text-[#7A5233]">{timeLeft}</p>}
      </section>

      {photos.length > 0 && (
        <section aria-label="Photos du logement" className="mt-6 grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
          {shownPhotos.map((url, i) => (
            <img
              key={url}
              src={storageImageUrl(url, i === 0 ? { width: 960, height: 720 } : { width: 480, height: 360 })}
              alt={i === 0 ? "Photo principale du logement" : `Photo ${i + 1} du logement`}
              loading={i === 0 ? "eager" : "lazy"}
              className={`h-full w-full rounded-[16px] bg-muted object-cover ${
                i === 0 ? "col-span-2 md:row-span-2 aspect-[4/3]" : "aspect-[4/3]"
              }`}
            />
          ))}
          {!allPhotos && photos.length > 5 && (
            <button
              type="button"
              onClick={() => setAllPhotos(true)}
              className="flex aspect-[4/3] items-center justify-center rounded-[16px] bg-primary/10 text-[15px] font-semibold text-primary"
            >
              Voir les {photos.length} photos
            </button>
          )}
        </section>
      )}

      <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-[3] space-y-7">
          {facts.length > 0 && (
            <dl className="grid grid-cols-1 gap-x-8 rounded-[18px] border border-border bg-card px-5 sm:grid-cols-2">
              {facts.map((f) => (
                <div key={f.label} className="border-b border-border/60 py-4 last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0">
                  <dt className="text-[13px] text-muted-foreground">{f.label}</dt>
                  <dd className="mt-1 text-[16px] font-semibold text-foreground">{f.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {proposal.message && (
            <figure className="border-l-2 border-primary pl-5">
              <blockquote className="font-heading text-[19px] italic leading-relaxed text-foreground whitespace-pre-line">
                {proposal.message}
              </blockquote>
              <figcaption className="mt-2 text-[14px] text-muted-foreground">{owner}, propriétaire</figcaption>
            </figure>
          )}

          {proposal.sit.description && (
            <section>
              <h2 className="mb-2 text-[16px] font-bold text-foreground">La garde en détail</h2>
              <p className="whitespace-pre-line text-[15px] leading-relaxed text-foreground">{proposal.sit.description}</p>
            </section>
          )}
          {proposal.property?.description && (
            <section>
              <h2 className="mb-2 text-[16px] font-bold text-foreground">Le logement</h2>
              <p className="whitespace-pre-line text-[15px] leading-relaxed text-foreground">{proposal.property.description}</p>
            </section>
          )}
        </div>

        <aside aria-label={isSitter ? `Répondre à ${owner}` : "État de la proposition"} className="flex-1 lg:sticky lg:top-6">
          <div className="space-y-3 rounded-[22px] border border-border bg-card p-5 shadow-[0_14px_34px_-16px_hsl(var(--foreground)/0.25)]">
            <div className="flex items-center gap-3">
              {proposal.owner.avatar_url ? (
                <img
                  src={avatarImageUrl(proposal.owner.avatar_url, 112)}
                  alt=""
                  className="h-14 w-14 rounded-[6px] object-cover shadow-[0_6px_14px_rgba(29,27,22,.14)] -rotate-3"
                />
              ) : null}
              <div className="min-w-0">
                <p className="text-[16px] font-semibold text-foreground">{owner}</p>
                {proposal.owner.identity_verified && <p className="text-[13px] text-muted-foreground">Identité vérifiée</p>}
                <Link to={`/gardiens/${proposal.owner_id}?tab=proprio`} className="text-[13px] font-semibold text-primary">
                  Voir son profil
                </Link>
              </div>
            </div>

            {!isSitter ? (
              <p className="text-[14px] leading-relaxed text-foreground">{OWNER_STATE_COPY[proposal.state]}</p>
            ) : proposal.state !== "open" ? (
              <p className="text-[14px] leading-relaxed text-foreground" role="status">
                {STATE_COPY[proposal.state]}
              </p>
            ) : panel ? (
              <div className="space-y-3">
                <label htmlFor="proposal-note" className="block text-[14px] font-semibold text-foreground">
                  {panel === "accept" ? `Un mot pour ${owner} (facultatif)` : `Un mot pour ${owner}`}
                </label>
                <Textarea
                  id="proposal-note"
                  rows={4}
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, 1000))}
                  placeholder={panel === "accept" ? "Avec plaisir, je garderai votre maison avec soin." : "Merci d'avoir pensé à moi, je ne suis pas disponible à ces dates."}
                  className="text-[16px]"
                />
                <button type="button" className={primaryBtn} disabled={busy} onClick={() => void respond(panel === "accept")}>
                  {busy ? "Envoi…" : panel === "accept" ? "Envoyer mon oui" : "Décliner"}
                </button>
                <button type="button" className="w-full text-center text-[14px] text-muted-foreground" onClick={() => setPanel(null)}>
                  Retour
                </button>
              </div>
            ) : (
              <>
                <button type="button" className={primaryBtn} onClick={() => setPanel("accept")}>
                  Dire oui à {owner}
                </button>
                <button type="button" className={secondaryBtn} onClick={() => void askQuestion()}>
                  Poser une question à {owner}
                </button>
                <button
                  type="button"
                  className="w-full text-center text-[14px] text-muted-foreground underline-offset-4 hover:underline"
                  onClick={() => setPanel("decline")}
                >
                  Décliner avec un mot
                </button>
                <p className="text-center text-[13px] leading-relaxed text-muted-foreground">
                  Après votre oui, {owner} confirme la garde avec vous, puis vous validez ensemble l'accord de garde. Une
                  rencontre avant la garde, si vous le souhaitez.
                </p>
              </>
            )}
            {actionError && (
              <p role="alert" className="text-[14px] font-medium text-destructive">
                {actionError}
              </p>
            )}
            {!isSitter && (
              <Link to={`/sits/${proposal.sit.id}`} className={secondaryBtn}>
                Voir ma garde
              </Link>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default SitProposalPage;
