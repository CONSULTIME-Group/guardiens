import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import ReportButton from "@/components/reports/ReportButton";
import { useAuth } from "@/contexts/AuthContext";
import { detectContactDetails, meetupWordContactMessage } from "@/lib/contactDetails";

export const WORD_MAX_LENGTH = 140;

/** Lot E19 : libellés de la fin d'un coup de main, repris par les tests. */
export const MEETUP_LABELS = {
  yes: "Oui, c'est fait",
  no: "À reprogrammer",
  cancelled: "Le coup de main a été annulé",
  publicOk: "Mon prénom et ce mot peuvent apparaître sur Guardiens, près de chez nous",
  report: "Un souci pendant l'échange ?",
} as const;

/** Phrase sous la case : un prénom public demande l'accord des deux personnes. */
export function publicConsentHint(otherFirstName: string): string {
  const who = otherFirstName.trim() || "l'autre personne";
  return `Vos deux prénoms s'affichent quand ${who} l'accepte aussi. Avec un seul accord, la ville seule apparaît.`;
}

/**
 * « Le coup de main a eu lieu ? » : trois issues (oui, à reprogrammer,
 * annulé) et un mot facultatif sur la personne.
 *
 * Lot E19 : la case de publication est décochée par défaut ; un prénom
 * n'apparaît publiquement qu'avec l'accord des deux personnes ; un mot qui
 * contient un numéro, un email ou une adresse est signalé avant l'envoi
 * (le serveur le vérifie aussi par moderate-content) ; l'issue « annulé »
 * n'enregistre ni rencontre ni avis, et le lien Signaler reste à portée.
 */
const MeetupAnswer = ({ otherFirstName, onYes, onNo, onCancelled, missionId, busy = false }: {
  otherFirstName: string;
  onYes: (word: string, publicOk: boolean) => void;
  onNo: () => void;
  onCancelled?: () => void;
  missionId?: string | null;
  busy?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const [word, setWord] = useState("");
  const [publicOk, setPublicOk] = useState(false);
  const who = otherFirstName.trim() || "cette personne";
  const contactKinds = detectContactDetails(word);
  const wordBlocked = contactKinds.length > 0;

  if (!open) {
    return (
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button type="button" onClick={() => setOpen(true)} disabled={busy}>{MEETUP_LABELS.yes}</Button>
          <Button type="button" variant="outline" onClick={onNo} disabled={busy}>{MEETUP_LABELS.no}</Button>
          {onCancelled && (
            <Button type="button" variant="ghost" onClick={onCancelled} disabled={busy} data-testid="meetup-cancelled">
              {MEETUP_LABELS.cancelled}
            </Button>
          )}
        </div>
        {missionId && <MeetupReportLine missionId={missionId} />}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label htmlFor="meetup-word" className="text-sm font-semibold text-foreground">Un mot sur {who} ?</Label>
      <Textarea
        id="meetup-word"
        value={word}
        maxLength={WORD_MAX_LENGTH}
        rows={3}
        placeholder="Facultatif, en une phrase."
        aria-invalid={wordBlocked || undefined}
        aria-describedby={wordBlocked ? "meetup-word-contact" : undefined}
        onChange={(event) => setWord(event.target.value.slice(0, WORD_MAX_LENGTH))}
      />
      <p className="text-xs text-muted-foreground">{word.length} / {WORD_MAX_LENGTH}</p>
      {wordBlocked && (
        <p id="meetup-word-contact" role="alert" className="text-sm text-destructive">
          {meetupWordContactMessage(contactKinds)}
        </p>
      )}
      <div className="flex items-start gap-2">
        <Checkbox
          id="meetup-public"
          checked={publicOk}
          onCheckedChange={(value) => setPublicOk(value === true)}
        />
        <div className="space-y-1">
          <Label htmlFor="meetup-public" className="text-sm font-normal leading-relaxed text-muted-foreground">
            {MEETUP_LABELS.publicOk}
          </Label>
          <p className="text-xs text-muted-foreground">{publicConsentHint(otherFirstName)}</p>
        </div>
      </div>
      <Button
        type="button"
        className="w-full"
        onClick={() => onYes(word.trim(), publicOk)}
        disabled={busy || wordBlocked}
      >
        {busy ? "Envoi en cours" : "Valider"}
      </Button>
    </div>
  );
};

/**
 * Session lue sans exiger le fournisseur : useAuth appelle toujours
 * useContext (ordre des hooks stable), seule son exception est absorbée.
 */
function useSignedInUser() {
  try {
    return useAuth().user ?? null;
  } catch {
    return null;
  }
}

/** Lien Signaler : la modale existante pour un membre connecté, la connexion sinon. */
function MeetupReportLine({ missionId }: { missionId: string }) {
  const user = useSignedInUser();
  const location = useLocation();
  const redirect = `${location.pathname}${location.search}`;
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground" data-testid="meetup-report">
      <span>{MEETUP_LABELS.report}</span>
      {user ? (
        <ReportButton targetId={missionId} targetType="small_mission" />
      ) : (
        <Link
          to={`/login?redirect=${encodeURIComponent(redirect)}`}
          className="underline underline-offset-4 hover:text-foreground"
        >
          Signaler
        </Link>
      )}
    </div>
  );
}

export default MeetupAnswer;
