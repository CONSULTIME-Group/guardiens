/**
 * Lot I2 : « Lui proposer ma garde » depuis la fiche d'un gardien.
 *
 * Parcours (maquettes Claude Design « Proposer une garde ») :
 *  1. choisir la garde : publiée (invitation existante) ou brouillon privé ;
 *  2. si le brouillon est incomplet : écran pédagogique, ce qui manque et
 *     pourquoi (lieu, dates, une photo, ce qui est confié), la garde reste
 *     privée ; retour automatique ici après « Compléter ma garde » ;
 *  3. un mot pour le gardien, puis envoi (create_sit_proposal).
 * Aucune icône décorative, aucun tiret de ponctuation.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import InviteSitterDialog from "./InviteSitterDialog";
import type { EventType } from "@/lib/analytics";
import {
  SIT_PROPOSAL_LIMITS,
  createSitProposal,
  fetchProposalBlockers,
  proposalBlockedTitle,
  proposalChecklist,
  proposalErrorMessage,
  proposalPeriod,
  type ProposalBlocker,
} from "@/lib/sitProposal";

type OwnerSit = {
  id: string;
  title: string | null;
  start_date: string | null;
  end_date: string | null;
  city: string | null;
  status: "draft" | "published";
};

type Step =
  | { kind: "choose" }
  | { kind: "checking"; sit: OwnerSit }
  | { kind: "blocked"; sit: OwnerSit; blockers: ProposalBlocker[] }
  | { kind: "message"; sit: OwnerSit }
  | { kind: "sent"; sit: OwnerSit }
  | { kind: "invite"; sit: OwnerSit };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ownerId: string;
  sitter: { id: string; first_name: string };
  /** Garde à reprendre directement (retour après « Compléter ma garde »). */
  initialSitId?: string | null;
  /** Ouvre la conversation avec le gardien (« Lui écrire d'abord »). */
  onWriteFirst?: () => void;
}

const track = (event: EventType, metadata: Record<string, unknown>) => {
  void import("@/lib/analytics").then(({ trackEvent }) =>
    trackEvent(event, { source: "public_profile", metadata }),
  );
};

const primaryBtn =
  "inline-flex min-h-[48px] items-center justify-center rounded-[99px] bg-primary px-6 text-[15px] font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors";
const quietBtn = "text-[14px] font-semibold text-muted-foreground hover:text-foreground underline-offset-4 hover:underline";

const ProposeSitDialog = ({ open, onOpenChange, ownerId, sitter, initialSitId, onWriteFirst }: Props) => {
  const navigate = useNavigate();
  const [sits, setSits] = useState<OwnerSit[] | null>(null);
  const [proposed, setProposed] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<Step>({ kind: "choose" });
  const [message, setMessage] = useState("");
  // Lot I3 : « seulement lui ou elle » ou « en priorité, puis tous les gardiens ».
  const [publishAfter, setPublishAfter] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = sitter.first_name;

  const pickSit = useCallback(
    async (sit: OwnerSit) => {
      setError(null);
      if (sit.status === "published") {
        setStep({ kind: "invite", sit });
        return;
      }
      setStep({ kind: "checking", sit });
      try {
        const blockers = await fetchProposalBlockers(sit.id);
        if (blockers.length > 0) {
          track("sit_proposal_blocked", { sitter_id: sitter.id, sit_id: sit.id, blockers });
          setStep({ kind: "blocked", sit, blockers });
        } else {
          setMessage(
            `Bonjour ${name}, votre profil nous a beaucoup plu. Nous cherchons quelqu'un pour garder notre maison ${
              proposalPeriod(sit.start_date, sit.end_date).toLowerCase() || "prochainement"
            }. Toutes les photos sont dans la proposition.`,
          );
          setStep({ kind: "message", sit });
        }
      } catch (e) {
        setError(proposalErrorMessage(e, name));
        setStep({ kind: "choose" });
      }
    },
    [name, sitter.id],
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setStep({ kind: "choose" });
    setError(null);
    track("sit_proposal_opened", { sitter_id: sitter.id });
    (async () => {
      const [{ data: sitRows }, { data: invRows }] = await Promise.all([
        supabase
          .from("sits")
          .select("id, title, start_date, end_date, city, status")
          .eq("user_id", ownerId)
          .in("status", ["draft", "published"])
          .order("start_date", { ascending: true, nullsFirst: false }),
        (supabase as any)
          .from("sit_invitations")
          .select("sit_id")
          .eq("owner_id", ownerId)
          .eq("sitter_id", sitter.id),
      ]);
      if (cancelled) return;
      const list = ((sitRows as unknown as OwnerSit[] | null) ?? []).filter(
        (s) => s.status === "published" || !s.end_date || s.end_date >= new Date().toISOString().slice(0, 10),
      );
      setSits(list);
      setProposed(new Set(((invRows as { sit_id: string }[] | null) ?? []).map((r) => r.sit_id)));
      const initial = initialSitId ? list.find((s) => s.id === initialSitId) : null;
      if (initial) void pickSit(initial);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, ownerId, sitter.id, initialSitId, pickSit]);

  const close = () => onOpenChange(false);

  const send = async (sit: OwnerSit) => {
    setSending(true);
    setError(null);
    try {
      await createSitProposal(sit.id, sitter.id, message, publishAfter);
      track("sit_proposal_sent", { sitter_id: sitter.id, sit_id: sit.id, publish_after: publishAfter });
      try {
        const { sendTransactionalEmail } = await import("@/lib/sendTransactionalEmail");
        await sendTransactionalEmail({
          templateName: "sit-invitation",
          recipientUserId: sitter.id,
          idempotencyKey: `sit-invite-${sit.id}-${sitter.id}`,
          templateData: { sitId: sit.id },
        });
      } catch {
        // La notification dans l'application est déjà créée par la base.
      }
      setProposed((prev) => new Set(prev).add(sit.id));
      setStep({ kind: "sent", sit });
    } catch (e) {
      setError(proposalErrorMessage(e, name));
    } finally {
      setSending(false);
    }
  };

  const drafts = useMemo(() => (sits ?? []).filter((s) => s.status === "draft"), [sits]);
  const published = useMemo(() => (sits ?? []).filter((s) => s.status === "published"), [sits]);

  if (step.kind === "invite") {
    return (
      <InviteSitterDialog
        open={open}
        onOpenChange={(o) => (o ? null : close())}
        sitter={{ id: sitter.id, first_name: sitter.first_name }}
        sitId={step.sit.id}
        ownerId={ownerId}
        sitTitle={step.sit.title || ""}
        sitCity={step.sit.city}
        startDate={step.sit.start_date}
        endDate={step.sit.end_date}
      />
    );
  }

  const sitRow = (s: OwnerSit) => {
    const already = proposed.has(s.id);
    const period = proposalPeriod(s.start_date, s.end_date);
    return (
      <li key={s.id}>
        <button
          type="button"
          disabled={already}
          onClick={() => void pickSit(s)}
          className="w-full rounded-[16px] border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="block text-[15px] font-semibold text-foreground">{s.title || "Garde sans titre"}</span>
          <span className="mt-0.5 block text-[13px] text-muted-foreground">
            {[period || "Dates à préciser", s.city].filter(Boolean).join(", ")}
          </span>
          <span className="mt-1 block text-[12.5px] font-semibold text-primary">
            {already
              ? "Déjà proposée"
              : s.status === "published"
                ? "Publiée : vous l'invitez à candidater"
                : "Brouillon : la garde reste privée"}
          </span>
        </button>
      </li>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[640px] max-h-[92vh] overflow-y-auto" data-propose-sit>
        {step.kind === "choose" || step.kind === "checking" ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-heading text-[26px]">Lui proposer ma garde</DialogTitle>
              <DialogDescription>
                Choisissez la garde à proposer à {name}. Un brouillon peut lui être proposé sans être publié : il reste
                visible par {name} seulement.
              </DialogDescription>
            </DialogHeader>
            {sits === null ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Chargement…</p>
            ) : sits.length === 0 ? (
              <div className="rounded-[18px] bg-muted/50 p-5">
                <p className="text-[15px] font-semibold text-foreground">Présentez d'abord votre maison à {name}</p>
                <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">
                  Pour dire oui en confiance, {name} a besoin de savoir où et quand, et de voir votre logement en photos.
                  Préparez votre garde : vous pourrez la lui proposer sans la publier.
                </p>
                <Link
                  to="/sits/create"
                  onClick={() => track("sit_proposal_complete_start", { sitter_id: sitter.id, from: "none" })}
                  className={`${primaryBtn} mt-4`}
                >
                  Préparer ma garde
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {drafts.length > 0 && (
                  <section aria-label="Brouillons">
                    <h3 className="mb-2 text-[12px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                      Mes brouillons
                    </h3>
                    <ul className="space-y-2">{drafts.map(sitRow)}</ul>
                  </section>
                )}
                {published.length > 0 && (
                  <section aria-label="Gardes publiées">
                    <h3 className="mb-2 text-[12px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                      Mes gardes publiées
                    </h3>
                    <ul className="space-y-2">{published.map(sitRow)}</ul>
                  </section>
                )}
                <Link to="/sits/create" className={quietBtn}>
                  Préparer une autre garde
                </Link>
              </div>
            )}
            {step.kind === "checking" && <p className="text-sm text-muted-foreground">Vérification de la garde…</p>}
            {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
          </>
        ) : step.kind === "blocked" ? (
          <BlockedStep
            name={name}
            sit={step.sit}
            blockers={step.blockers}
            sitterId={sitter.id}
            onBack={() => setStep({ kind: "choose" })}
            onWriteFirst={onWriteFirst}
            onComplete={(href) => {
              track("sit_proposal_complete_start", { sitter_id: sitter.id, sit_id: step.sit.id, blockers: step.blockers });
              close();
              navigate(href);
            }}
          />
        ) : step.kind === "message" ? (
          <>
            <DialogHeader>
              <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-[#9A6A44]">Dernière étape</p>
              <DialogTitle className="font-heading text-[26px]">Un mot pour {name}</DialogTitle>
              <DialogDescription>
                « {step.sit.title || "Votre garde"} », {proposalPeriod(step.sit.start_date, step.sit.end_date).toLowerCase()}
                {step.sit.city ? `, ${step.sit.city}` : ""}.
              </DialogDescription>
            </DialogHeader>
            <div>
              <label htmlFor="propose-mot" className="block text-[15px] font-semibold text-foreground">
                Votre message
              </label>
              <p id="propose-aide" className="mb-2 mt-1 text-[13px] text-muted-foreground">
                Dites-lui pourquoi vous avez pensé à {name}. Un message personnel reçoit plus souvent une réponse.
              </p>
              <Textarea
                id="propose-mot"
                aria-describedby="propose-aide"
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 1000))}
                rows={5}
                className="text-[16px]"
              />
            </div>
            <fieldset className="space-y-2" data-proposal-visibility>
              <legend className="mb-2 text-[15px] font-semibold text-foreground">Qui peut voir cette garde ?</legend>
              {[
                {
                  value: false,
                  title: `${name} seulement`,
                  detail: "Votre garde reste privée. Vous pourrez la publier plus tard, à tout moment.",
                },
                {
                  value: true,
                  title: `${name} en priorité, puis tous les gardiens`,
                  detail: `${name} a ${SIT_PROPOSAL_LIMITS.priorityHours} heures pour répondre en priorité. Ensuite, votre garde est publiée et d'autres gardiens peuvent candidater.`,
                },
              ].map((o) => (
                <label
                  key={String(o.value)}
                  className={`flex cursor-pointer items-start gap-3 rounded-[16px] bg-card px-4 py-3 ${
                    publishAfter === o.value ? "border-2 border-primary" : "border border-border"
                  }`}
                >
                  <input
                    type="radio"
                    name="propose-visibilite"
                    checked={publishAfter === o.value}
                    onChange={() => setPublishAfter(o.value)}
                    className="mt-1 h-5 w-5 accent-[hsl(var(--primary))]"
                  />
                  <span>
                    <span className="block text-[15px] font-semibold text-foreground">{o.title}</span>
                    <span className="mt-0.5 block text-[13px] text-muted-foreground">{o.detail}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              {name} a {SIT_PROPOSAL_LIMITS.expiryDays} jours pour répondre. Vous pouvez proposer cette garde à{" "}
              {SIT_PROPOSAL_LIMITS.maxOpenPerSit} gardiens en même temps. Au premier oui, vous confirmez la garde ensemble
              et les autres propositions se ferment avec un mot de remerciement.
            </p>
            {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
            <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
              <button type="button" className={quietBtn} onClick={() => setStep({ kind: "choose" })}>
                Retour
              </button>
              <button
                type="button"
                className={primaryBtn}
                disabled={sending || message.trim().length < 10}
                onClick={() => void send(step.sit)}
              >
                {sending ? "Envoi…" : "Envoyer ma proposition"}
              </button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-heading text-[26px]">Proposition envoyée</DialogTitle>
              <DialogDescription>
                {name} la reçoit dans ses notifications et par email. Sa réponse vous arrive dans votre espace : en cas
                de oui, vous confirmez la garde ensemble.
                {publishAfter
                  ? ` Sans oui dans les ${SIT_PROPOSAL_LIMITS.priorityHours} heures, votre garde est publiée pour tous les gardiens.`
                  : ""}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Link to={`/sits/${step.sit.id}`} className={quietBtn}>
                Voir ma garde
              </Link>
              <button type="button" className={primaryBtn} onClick={close}>
                Revenir à la fiche
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

const BlockedStep = ({
  name,
  sit,
  blockers,
  sitterId,
  onBack,
  onWriteFirst,
  onComplete,
}: {
  name: string;
  sit: OwnerSit;
  blockers: ProposalBlocker[];
  sitterId: string;
  onBack: () => void;
  onWriteFirst?: () => void;
  onComplete: (href: string) => void;
}) => {
  const items = proposalChecklist(blockers, name);
  const back = `/gardiens/${sitterId}?proposer=${sit.id}`;
  // La commune se règle dans le profil, le reste dans l'édition de la garde.
  const onlyCity = blockers.length === 1 && blockers[0] === "city";
  const href = onlyCity ? "/profile" : `/sits/${sit.id}/edit?retour=${encodeURIComponent(back)}`;
  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-heading text-[26px] leading-tight">{proposalBlockedTitle(blockers.length)}</DialogTitle>
        <DialogDescription className="text-[15px] leading-relaxed text-foreground">
          {name} va vivre chez vous plusieurs jours. Pour dire oui en confiance, {name} a besoin de savoir où et quand, et
          de voir votre logement en photos. Ces mêmes informations permettront à chacun de laisser un avis après la garde.
        </DialogDescription>
      </DialogHeader>
      <div className="rounded-[16px] bg-primary/[0.07] px-4 py-3 text-[14.5px] leading-relaxed text-foreground">
        <strong>Votre garde reste privée.</strong> Elle n'est visible que par {name}. La publier pour d'autres gardiens
        reste votre choix, à tout moment.
      </div>
      <section aria-labelledby="propose-requis">
        <h3 id="propose-requis" className="mb-2 text-[12px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
          Ce qu'il faut pour proposer votre garde
        </h3>
        <ul className="rounded-[18px] border border-border bg-card" data-proposal-checklist>
          {items.map((it) => (
            <li key={it.id} className="flex items-center gap-4 border-b border-border/60 px-4 py-3 last:border-b-0">
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-foreground">{it.label}</span>
                <span className="mt-0.5 block text-[13px] text-muted-foreground">{it.detail}</span>
              </span>
              <span className={`shrink-0 text-[13px] font-semibold ${it.done ? "text-primary" : "text-[#7A5233]"}`}>
                {it.done ? "Renseigné" : "À compléter"}
              </span>
            </li>
          ))}
        </ul>
      </section>
      {blockers.includes("photo") && (
        <p className="rounded-[16px] border border-dashed border-border px-4 py-3 text-[14px] leading-relaxed text-muted-foreground">
          <strong className="text-foreground">Conseil : montrez la chambre où dormira {name}.</strong> Un beau lieu donne
          envie, des photos de la chambre, de la salle de bain et des pièces à vivre donnent confiance.
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4">
        <div className="flex gap-4">
          <button type="button" className={quietBtn} onClick={onBack}>
            Retour
          </button>
          {onWriteFirst && (
            <button type="button" className={quietBtn} onClick={onWriteFirst}>
              Lui écrire d'abord
            </button>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <button type="button" className={primaryBtn} onClick={() => onComplete(href)}>
            Compléter ma garde
          </button>
          {!onlyCity && (
            <span className="text-[12px] text-muted-foreground">Ensuite, vous revenez ici pour l'envoyer à {name}.</span>
          )}
        </div>
      </div>
    </>
  );
};

export default ProposeSitDialog;
