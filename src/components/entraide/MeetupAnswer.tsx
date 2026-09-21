import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export const WORD_MAX_LENGTH = 140;

/**
 * « Vous vous êtes rencontrés ? » : deux réponses, et un mot facultatif sur la
 * personne. La case de publication est cochée par défaut, visible sous le champ.
 */
const MeetupAnswer = ({ otherFirstName, onYes, onNo, busy = false }: {
  otherFirstName: string;
  onYes: (word: string, publicOk: boolean) => void;
  onNo: () => void;
  busy?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const [word, setWord] = useState("");
  const [publicOk, setPublicOk] = useState(true);
  const who = otherFirstName.trim() || "cette personne";

  if (!open) {
    return (
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" onClick={() => setOpen(true)} disabled={busy}>Oui, c'est fait</Button>
        <Button type="button" variant="outline" onClick={onNo} disabled={busy}>À reprogrammer</Button>
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
        onChange={(event) => setWord(event.target.value.slice(0, WORD_MAX_LENGTH))}
      />
      <p className="text-xs text-muted-foreground">{word.length} / {WORD_MAX_LENGTH}</p>
      <div className="flex items-start gap-2">
        <Checkbox
          id="meetup-public"
          checked={publicOk}
          onCheckedChange={(value) => setPublicOk(value === true)}
        />
        <Label htmlFor="meetup-public" className="text-sm font-normal leading-relaxed text-muted-foreground">
          Ce mot peut apparaître près de chez nous
        </Label>
      </div>
      <Button type="button" className="w-full" onClick={() => onYes(word.trim(), publicOk)} disabled={busy}>
        {busy ? "Envoi en cours" : "Valider"}
      </Button>
    </div>
  );
};

export default MeetupAnswer;
