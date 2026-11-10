import { useEffect, useId, useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { detectContactDetails } from "@/lib/contactDetails";
import { moderateContent } from "@/lib/moderation";
import { OTHER_PASSIONS_MAX, OTHER_PASSION_MAX_LENGTH } from "@/lib/profileMatchingOptions";
import FieldRole from "./FieldRole";

/** Espaces regroupés, bords retirés, 30 caractères au plus. */
export function cleanPassion(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, OTHER_PASSION_MAX_LENGTH);
}

/** Refus avant tout appel réseau : vide, doublon, plein, coordonnées. */
export function passionRefusal(text: string, current: string[]): string | null {
  if (!text) return "Écrivez quelques mots.";
  if (current.length >= OTHER_PASSIONS_MAX) return "Deux passions, c'est complet.";
  if (current.some((p) => p.toLocaleLowerCase("fr") === text.toLocaleLowerCase("fr"))) return "Cette passion figure déjà sur votre profil.";
  if (detectContactDetails(text).length > 0) return "Les coordonnées passent par la messagerie, gardez ici le nom d'une passion.";
  return null;
}

interface Props {
  table: "sitter_profiles" | "owner_profiles";
  initial: string[];
}

/**
 * « Une autre passion ? » (lot SC5, 10/11/2026) : deux passions en texte libre,
 * 30 caractères chacune, relues par la modération, enregistrées aussitôt dans
 * other_passions (à part du bouton Enregistrer, pour qu'une colonne absente ne
 * bloque jamais le reste du profil), affichées sur la fiche, hors calcul
 * d'affinité.
 */
const OtherPassionsField = ({ table, initial }: Props) => {
  const id = useId();
  const { user } = useAuth();
  const userId = user?.id;
  const [items, setItems] = useState<string[]>(initial);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => { setItems(initial); }, [initial.join("\u0000")]); // eslint-disable-line react-hooks/exhaustive-deps

  const write = async (next: string[]) => {
    if (!userId) return false;
    const { data, error } = await (supabase as any)
      .from(table)
      .update({ other_passions: next })
      .eq("user_id", userId)
      .select("user_id");
    return !error && Array.isArray(data) && data.length > 0;
  };

  const add = async () => {
    const text = cleanPassion(draft);
    const refusal = passionRefusal(text, items);
    if (refusal) { setMessage(refusal); return; }
    setBusy(true);
    setMessage(null);
    const verdict = await moderateContent("bio", text);
    if (verdict.status === "block") {
      setBusy(false);
      setMessage("Ce texte est retenu par une vérification automatique. Choisissez d'autres mots.");
      return;
    }
    const next = [...items, text];
    const ok = await write(next);
    setBusy(false);
    if (!ok) { setMessage("Enregistrement impossible pour le moment. Réessayez."); return; }
    setItems(next);
    setDraft("");
    setMessage(next.length >= OTHER_PASSIONS_MAX ? "Deux passions, c'est complet." : "C'est sur votre profil.");
  };

  const remove = async (p: string) => {
    const next = items.filter((x) => x !== p);
    setBusy(true);
    const ok = await write(next);
    setBusy(false);
    if (!ok) { setMessage("Enregistrement impossible pour le moment. Réessayez."); return; }
    setItems(next);
    setMessage(null);
  };

  const full = items.length >= OTHER_PASSIONS_MAX;

  return (
    <div className="space-y-2.5" data-field="other_passions">
      <label htmlFor={`${id}-input`} className="block text-base font-medium leading-snug">Une autre passion ?</label>
      <p id={`${id}-help`} className="text-sm text-muted-foreground">Deux au plus, quelques mots chacune.</p>
      {items.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Vos autres passions">
          {items.map((p) => (
            <li key={p} className="inline-flex min-h-11 items-center gap-0.5 rounded-full bg-pastel-honey pl-3.5 pr-0 text-[15px] font-medium text-pastel-honey-ink">
              {p}
              <button
                type="button"
                onClick={() => remove(p)}
                disabled={busy}
                aria-label={`Retirer ${p}`}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-card/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      {!full && (
        <div className="flex gap-2">
          <input
            id={`${id}-input`}
            aria-describedby={`${id}-help`}
            value={draft}
            maxLength={OTHER_PASSION_MAX_LENGTH}
            onChange={(e) => { setDraft(e.target.value); setMessage(null); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void add(); } }}
            placeholder="Par exemple : céramique"
            className="min-h-12 min-w-0 flex-1 rounded-xl border border-field bg-background px-3.5 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="button"
            onClick={() => void add()}
            disabled={busy || !draft.trim()}
            className="min-h-12 shrink-0 rounded-xl border border-border bg-card px-4 text-[15px] font-medium disabled:opacity-50"
          >
            {busy ? "…" : "Ajouter"}
          </button>
        </div>
      )}
      {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
      <FieldRole roles={["public"]} />
    </div>
  );
};

export default OtherPassionsField;
