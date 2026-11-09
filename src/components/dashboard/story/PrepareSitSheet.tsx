/**
 * Lot L9 (09/11/2026, arène tableau de bord v2, emprunt A-15 depuis B-13) :
 * « Préparer votre arrivée ». Feuille du bas ouverte par le récit du gardien
 * retenu (garde confirmée, guide ouvert). Le gardien choisit son heure
 * d'arrivée (obligatoire) et, s'il le souhaite, un appel ou une visite avant
 * la garde ; le message proposé ne cite que ces choix, la date de la garde
 * et les prénoms, il reste modifiable. Un seul bouton plein.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { startConversation } from "@/lib/conversation";
import { describeRetainedText, moderateContent } from "@/lib/moderation";
import { trackEvent } from "@/lib/analytics";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ARRIVAL_SLOTS,
  MEETING_CHOICES,
  PREPARE_EVENTS,
  prepareMessage,
  type ArrivalSlot,
  type MeetingChoice,
} from "@/lib/prepareSitMessage";

export interface PrepareSitTarget {
  sitId: string;
  ownerId: string;
  ownerFirstName?: string | null;
  startDate?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: PrepareSitTarget | null;
  userId: string;
  sitterFirstName?: string | null;
  chapter?: string;
}

const MESSAGE_MAX = 1000;

const chip = (on: boolean) =>
  cn(
    "min-h-[44px] rounded-full border-[1.5px] px-[14px] text-[14px] font-semibold transition-colors",
    on ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card text-foreground",
  );

export default function PrepareSitSheet({ open, onOpenChange, target, userId, sitterFirstName, chapter }: Props) {
  const [slot, setSlot] = useState<ArrivalSlot | null>(null);
  const [meeting, setMeeting] = useState<MeetingChoice | null>(null);
  const [text, setText] = useState("");
  const [edited, setEdited] = useState(false);
  const [busy, setBusy] = useState(false);
  const [retained, setRetained] = useState<string | null>(null);
  const openedRef = useRef(false);

  const owner = (target?.ownerFirstName ?? "").trim().split(/\s+/)[0] || null;
  const proposed = useMemo(
    () => prepareMessage({ ownerFirstName: owner, sitterFirstName, startDate: target?.startDate, slot, meeting }),
    [owner, sitterFirstName, target?.startDate, slot, meeting],
  );

  // Tant que le gardien n'a rien réécrit, le message suit ses choix.
  useEffect(() => {
    if (!edited) setText(proposed);
  }, [proposed, edited]);

  useEffect(() => {
    if (open && !openedRef.current) {
      openedRef.current = true;
      trackEvent(PREPARE_EVENTS.opened, { source: "/dashboard", metadata: { chapter: chapter ?? null } });
    }
    if (!open) {
      openedRef.current = false;
      setRetained(null);
    }
  }, [open, chapter]);

  const canSend = !!target && !!slot && text.trim().length > 0 && !busy;

  const onSend = async () => {
    if (!target || !slot || !text.trim()) return;
    setBusy(true);
    setRetained(null);
    try {
      const verdict = await moderateContent("message", text.trim());
      if (verdict.status === "block") {
        setRetained(describeRetainedText("message", verdict));
        return;
      }
      const { conversationId } = await startConversation({
        otherUserId: target.ownerId,
        context: "sit_application",
        sitId: target.sitId,
      });
      if (!conversationId) throw new Error("conversation_missing");
      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: userId,
        content: text.trim(),
        is_system: false,
      });
      if (error) throw error;
      trackEvent(PREPARE_EVENTS.sent, {
        source: "/dashboard",
        metadata: { slot, meeting: meeting ?? "none", edited, chapter: chapter ?? null },
      });
      toast.success(owner ? `Message envoyé à ${owner}.` : "Message envoyé.");
      onOpenChange(false);
      setSlot(null);
      setMeeting(null);
      setEdited(false);
    } catch {
      toast.error("L'envoi n'a pas abouti. Votre message est gardé, réessayez dans un instant.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[90dvh] overflow-y-auto overflow-x-hidden rounded-t-3xl px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
        data-testid="prepare-sheet"
      >
        <SheetHeader className="pr-10 text-left">
          <SheetTitle className="font-heading text-[22px]">Préparer votre arrivée</SheetTitle>
          <SheetDescription className="text-[15px]">
            {owner ? `${owner} saura quand vous arrivez.` : "Le propriétaire saura quand vous arrivez."} Se rencontrer avant reste au choix.
          </SheetDescription>
        </SheetHeader>

        <p id="prepare-slot-label" className="mt-4 text-[14px] font-semibold text-foreground">Vous arrivez</p>
        <div className="mt-2 flex flex-wrap gap-[8px]" role="group" aria-labelledby="prepare-slot-label" data-testid="prepare-slots">
          {ARRIVAL_SLOTS.map((s) => (
            <button key={s.value} type="button" aria-pressed={slot === s.value} onClick={() => setSlot(s.value)} className={chip(slot === s.value)}>
              {s.label}
            </button>
          ))}
        </div>

        <p id="prepare-meeting-label" className="mt-4 text-[14px] font-semibold text-foreground">
          Se rencontrer avant <span className="font-normal text-foreground/70">(facultatif)</span>
        </p>
        <div className="mt-2 flex flex-wrap gap-[8px]" role="group" aria-labelledby="prepare-meeting-label" data-testid="prepare-meeting">
          {MEETING_CHOICES.map((m) => (
            <button
              key={m.value}
              type="button"
              aria-pressed={meeting === m.value}
              onClick={() => setMeeting((cur) => (cur === m.value ? null : m.value))}
              className={chip(meeting === m.value)}
            >
              {m.label}
            </button>
          ))}
        </div>

        {slot && (
          <>
            <label htmlFor="prepare-message" className="mt-4 block text-[14px] font-semibold text-foreground">
              {owner ? `${owner} lira :` : "Le propriétaire lira :"}
            </label>
            <textarea
              id="prepare-message"
              value={text}
              maxLength={MESSAGE_MAX}
              rows={6}
              onChange={(e) => {
                setEdited(true);
                setText(e.target.value);
              }}
              className="mt-1 w-full resize-none rounded-xl border border-field bg-background p-3 text-[16px] leading-snug"
              data-testid="prepare-message"
            />
          </>
        )}

        {retained && (
          <p role="alert" className="mt-3 text-[14px] leading-snug text-destructive" data-testid="prepare-retained">
            {retained}
          </p>
        )}

        {/* Bouton tenu en bas de la feuille : visible à 130 % quand le message défile. */}
        <div className="sticky bottom-[calc(-1.25rem-env(safe-area-inset-bottom))] -mx-5 mt-2 bg-background px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-2" data-testid="prepare-send-bar">
          <button
            type="button"
            disabled={!canSend}
            onClick={() => {
              void onSend();
            }}
            className="flex min-h-[50px] w-full items-center justify-center rounded-full bg-primary px-5 text-center text-[16px] font-semibold text-primary-foreground disabled:opacity-60"
            data-testid="prepare-send"
          >
            {busy ? "Envoi…" : slot ? (owner ? `Envoyer à ${owner}` : "Envoyer") : "Choisissez votre heure d'arrivée"}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
