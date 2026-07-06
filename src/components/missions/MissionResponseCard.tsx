import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Heart, CheckCircle2, MessageSquare, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Props {
  response: any;
  isAuthor: boolean;
  currentUserId?: string;
  missionOwnerId: string;
  processing: boolean;
  pendingCount?: number;
  onSelect: (mode: "keep" | "decline_others") => void;
  onDecline: () => void;
  onOpenMessages: () => void;
}

/**
 * Carte "réponse" (esprit commentaire) sur une petite mission.
 * - Lecture publique.
 * - L'auteur de la mission peut « Retenir cette personne » ou décliner.
 * - Tout membre connecté (sauf l'auteur de la réponse et l'auteur de la mission) peut dire « Merci » (helpful_count).
 */
const MissionResponseCard = ({
  response: r,
  isAuthor,
  currentUserId,
  missionOwnerId,
  processing,
  pendingCount = 0,
  onSelect,
  onDecline,
  onOpenMessages,
}: Props) => {
  const { toast } = useToast();
  const [count, setCount] = useState<number>(r.helpful_count ?? 0);
  const [thanked, setThanked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [acceptMode, setAcceptMode] = useState<"keep" | "decline_others">("keep");

  const isOwnResponse = currentUserId && r.responder_id === currentUserId;
  const canThank =
    !!currentUserId &&
    !isOwnResponse &&
    currentUserId !== missionOwnerId; // l'auteur de la mission a déjà « Retenir »

  useEffect(() => {
    if (!currentUserId) return;
    let cancelled = false;
    supabase
      .from("small_mission_response_thanks" as any)
      .select("response_id")
      .eq("response_id", r.id)
      .eq("user_id", currentUserId)
      .maybeSingle()
      .then(({ data }) => { if (!cancelled) setThanked(!!data); });
    return () => { cancelled = true; };
  }, [r.id, currentUserId]);

  const toggleThanks = async () => {
    if (!currentUserId || busy) return;
    setBusy(true);
    if (thanked) {
      const { error } = await supabase
        .from("small_mission_response_thanks" as any)
        .delete()
        .eq("response_id", r.id)
        .eq("user_id", currentUserId);
      if (!error) { setThanked(false); setCount((c) => Math.max(c - 1, 0)); }
    } else {
      const { error } = await supabase
        .from("small_mission_response_thanks" as any)
        .insert({ response_id: r.id, user_id: currentUserId });
      if (error) {
        toast({ variant: "destructive", title: "Merci non enregistré", description: error.message });
      } else {
        setThanked(true); setCount((c) => c + 1);
      }
    }
    setBusy(false);
  };

  return (
    <article
      className={cn(
        "bg-card rounded-2xl border p-4 md:p-5 transition-colors",
        r.status === "accepted" ? "border-success/40 bg-success-soft/30" : "border-border",
      )}
    >
      <div className="flex items-start gap-3 md:gap-4">
        {r.responder?.avatar_url ? (
          <Link to={`/gardiens/${r.responder_id}`} className="shrink-0">
            <img src={r.responder.avatar_url} alt="" className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover" />
          </Link>
        ) : (
          <Link to={`/gardiens/${r.responder_id}`} className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-muted flex items-center justify-center font-bold shrink-0">
            {r.responder?.first_name?.charAt(0) || "?"}
          </Link>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
            <Link
              to={`/gardiens/${r.responder_id}`}
              className="font-semibold text-sm hover:underline inline-flex items-center gap-1.5"
            >
              {r.responder?.first_name || "Un membre"}
              {r.status === "accepted" && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-success bg-success/10 px-2 py-0.5 rounded-full">
                  <ShieldCheck className="h-3 w-3" /> Personne retenue
                </span>
              )}
            </Link>
            <p className="text-xs text-muted-foreground">
              {format(new Date(r.created_at), "d MMM à HH:mm", { locale: fr })}
            </p>
          </div>
          <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap">{r.message}</p>

          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {/* Merci (tous les membres, sauf auteur de la mission et de la réponse) */}
            {canThank && (
              <button
                type="button"
                onClick={toggleThanks}
                disabled={busy}
                aria-pressed={thanked}
                aria-busy={busy}
                aria-label={`${thanked ? "Retirer le merci" : "Dire merci"} à ${r.responder?.first_name || "cette personne"}${count > 0 ? ` (${count} merci${count > 1 ? "s" : ""} pour l'instant)` : ""}`}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                  thanked
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-foreground/70 border-border hover:bg-accent",
                )}
              >
                <Heart aria-hidden="true" className={cn("h-3.5 w-3.5", thanked && "fill-current")} />
                <span>Merci {count > 0 && <span className="tabular-nums">· {count}</span>}</span>
              </button>
            )}
            {!canThank && count > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground" aria-label={`${count} merci${count > 1 ? "s" : ""} reçu${count > 1 ? "s" : ""}`}>
                <Heart aria-hidden="true" className="h-3.5 w-3.5" /> <span aria-hidden="true">{count} merci{count > 1 ? "s" : ""}</span>
              </span>
            )}

            {/* Actions auteur */}
            {isAuthor && r.status === "pending" && (
              <>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      disabled={processing}
                      aria-disabled={processing}
                      aria-busy={processing}
                      aria-label={`Retenir ${r.responder?.first_name || "cette personne"} pour aider`}
                      className="rounded-full ml-auto min-h-11"
                    >
                      <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5 mr-1" />
                      <span>{processing ? "…" : "Retenir cette personne"}</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Retenir {r.responder?.first_name || "cette personne"} pour aider ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Vous confirmez publiquement que cette personne vous aide sur cette mission.
                        Elle apparaîtra comme « Personne retenue » ici et sur son profil public.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    {pendingCount > 1 && (
                      <div className="rounded-xl border border-border bg-muted/40 p-3">
                        <p className="text-xs font-semibold text-foreground mb-2">
                          {pendingCount - 1} autre{pendingCount - 1 > 1 ? "s" : ""} réponse{pendingCount - 1 > 1 ? "s" : ""} en attente
                        </p>
                        <RadioGroup
                          value={acceptMode}
                          onValueChange={(v) => setAcceptMode(v as "keep" | "decline_others")}
                          className="space-y-2"
                        >
                          <div className="flex items-start gap-2">
                            <RadioGroupItem value="keep" id={`mode-keep-${r.id}`} className="mt-0.5" />
                            <Label htmlFor={`mode-keep-${r.id}`} className="text-sm font-normal leading-snug cursor-pointer">
                              Garder les autres réponses ouvertes (au cas où)
                            </Label>
                          </div>
                          <div className="flex items-start gap-2">
                            <RadioGroupItem value="decline_others" id={`mode-decline-${r.id}`} className="mt-0.5" />
                            <Label htmlFor={`mode-decline-${r.id}`} className="text-sm font-normal leading-snug cursor-pointer">
                              Écarter les autres réponses (elles seront prévenues)
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>
                    )}
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onSelect(acceptMode)}>Confirmer</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onDecline}
                  disabled={processing}
                  aria-disabled={processing}
                  aria-label={`Écarter la réponse de ${r.responder?.first_name || "cette personne"}`}
                  className="rounded-full text-muted-foreground min-h-11"
                >
                  Écarter
                </Button>
              </>
            )}
            {isAuthor && r.status === "accepted" && (
              <Button
                size="sm"
                variant="outline"
                onClick={onOpenMessages}
                aria-label={`Ouvrir la messagerie avec ${r.responder?.first_name || "cette personne"}`}
                className="rounded-full gap-2 ml-auto min-h-11"
              >
                <MessageSquare aria-hidden="true" className="h-3.5 w-3.5" />
                <span>Messagerie</span>
              </Button>
            )}
            {!isAuthor && r.status === "declined" && (
              <span className="text-[10px] text-muted-foreground italic ml-auto" role="status">Non retenu(e)</span>
            )}
          </div>

        </div>
      </div>
    </article>
  );
};

export default MissionResponseCard;
