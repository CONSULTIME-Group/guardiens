import { useEffect, useId, useRef, useState } from "react";
import { formatFirstName } from "@/lib/formatFirstName";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import AlmaAvatar from "@/components/ai/alma/AlmaAvatar";
import { hasMoneyMention } from "@/lib/missionContentGuards";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

export const HELPS_WITH_EXAMPLES = [
  "Cueillir des fruits au verger",
  "Aider pour un dossier en ligne",
  "Promener un chien le week-end",
] as const;

export const HELPS_WITH_MONEY_MESSAGE = "Ici on s'échange des services : proposez plutôt un coup de main.";
export const HELPS_WITH_AVAILABILITY_NOTE =
  "Votre ligne sera visible sur la page Entraide, et vous recevrez les besoins près de chez vous.";
export const HELPS_WITH_HELP_TEXT = "Elle apparaît avec votre prénom et votre ville sur la page Entraide.";
export const HELPS_WITH_CONFIRMATION = "Votre ligne est en ligne. Les gens du coin vous voient maintenant.";

export type SaveLine = (text: string) => Promise<{ ok: boolean; reason?: string }>;

interface Props {
  firstName: string;
  initialValue?: string;
  onSave: SaveLine;
  source: "token" | "session";
}

/** Écran unique « Ma ligne d'entraide » : une question, un champ, un bouton. */
const HelpsWithLineForm = ({ firstName, initialValue = "", onSave, source }: Props) => {
  const queryClient = useQueryClient();
  const [value, setValue] = useState(initialValue);
  const [moneyShown, setMoneyShown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const savingRef = useRef(false);
  const ids = { title: useId(), field: useId(), help: useId(), count: useId(), msg: useId() };

  useEffect(() => { setValue(initialValue); }, [initialValue]);

  const checkMoney = (text: string) => {
    const bad = hasMoneyMention(text);
    if (bad && !moneyShown) trackEvent("helps_line_money_shown", { source, metadata: { mode: source } });
    setMoneyShown(bad);
    return bad;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (savingRef.current) return;
    const clean = value.trim();
    if (!clean) { fieldRef.current?.focus(); return; }
    if (checkMoney(clean)) { fieldRef.current?.focus(); return; }
    savingRef.current = true;
    setSaving(true);
    setError(null);
    const result = await onSave(clean);
    savingRef.current = false;
    setSaving(false);
    if (!result.ok) {
      if (result.reason === "money") { setMoneyShown(true); return; }
      setError(result.reason === "rate_limited"
        ? "Beaucoup d'essais en peu de temps. Réessayez dans quelques minutes."
        : "L'enregistrement reprend dans un instant. Réessayez.");
      return;
    }
    trackEvent("helps_line_saved", { source, metadata: { mode: source, length: clean.length } });
    void queryClient.invalidateQueries({ queryKey: ["nearby-helpers"] });
    void queryClient.invalidateQueries({ queryKey: ["helpers-proximity-count"] });
    setSaved(true);
  };

  const describedBy = [ids.help, ids.count, moneyShown ? ids.msg : null].filter(Boolean).join(" ");

  return (
    <div className="mx-auto flex w-full max-w-[36rem] flex-col gap-[52px] px-5 py-10 sm:py-16">
      <header>
        <p className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[2px] text-secondary">
          <span aria-hidden="true" className="block h-px w-5 bg-secondary" />
          Entraide
        </p>
        <h1 id={ids.title} className="mt-3 font-heading text-[1.75rem] font-semibold leading-tight text-foreground sm:text-4xl">
          Une chose que vous aimez faire pour les gens du coin ?
        </h1>
        <p className="mt-3 font-body text-base text-muted-foreground">
          {formatFirstName(firstName)
            ? `Bonjour ${formatFirstName(firstName)}. Se rendre utile, c'est aussi se faire du bien : une ligne suffit pour commencer.`
            : "Se rendre utile, c'est aussi se faire du bien : une ligne suffit pour commencer."}
        </p>
      </header>

      {saved ? (
        <section aria-live="polite" className="flex flex-col gap-6">
          <div className="flex items-start gap-[14px] rounded-2xl border border-dashed border-border bg-card p-[18px]">
            <div
              className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full border border-border"
              style={{ background: "radial-gradient(circle at 35% 30%, hsl(var(--card)) 0%, hsl(var(--primary) / 0.12) 100%)" }}
            >
              <AlmaAvatar size={32} mood="gentle" aria-hidden={true} />
            </div>
            <p className="font-heading text-lg italic leading-snug text-foreground">{HELPS_WITH_CONFIRMATION}</p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Link to="/petites-missions" className="inline-flex min-h-[44px] items-center font-medium text-primary underline-offset-4 hover:underline">
              Voir la page Entraide
            </Link>
            <button
              type="button"
              onClick={() => { setSaved(false); window.setTimeout(() => fieldRef.current?.focus(), 0); }}
              className="inline-flex min-h-[44px] items-center font-medium text-primary underline-offset-4 hover:underline"
            >
              Modifier ma ligne
            </button>
          </div>
        </section>
      ) : (
        <form onSubmit={submit} noValidate className="flex flex-col gap-6">
          <div>
            <textarea
              ref={fieldRef}
              id={ids.field}
              aria-labelledby={ids.title}
              value={value}
              maxLength={200}
              rows={3}
              aria-describedby={describedBy}
              aria-invalid={moneyShown || undefined}
              onChange={(event) => {
                setValue(event.target.value);
                if (moneyShown) checkMoney(event.target.value);
              }}
              onBlur={(event) => { if (event.target.value.trim()) checkMoney(event.target.value); }}
              className="mt-2 block w-full resize-none rounded-[12px] border border-border bg-accent px-4 py-3 font-body text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            <div className="mt-2 flex items-start justify-between gap-4">
              <p id={ids.help} className="text-sm text-muted-foreground">{HELPS_WITH_HELP_TEXT}</p>
              <span id={ids.count} className="shrink-0 text-xs text-muted-foreground">{value.length}/200</span>
            </div>
            <p id={ids.msg} aria-live="polite" className={cn("text-sm text-secondary", moneyShown ? "mt-2" : "sr-only")}>
              {moneyShown ? HELPS_WITH_MONEY_MESSAGE : ""}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {HELPS_WITH_EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  aria-label={`Écrire l'exemple : ${example}`}
                  onClick={() => {
                    setValue(example);
                    setMoneyShown(false);
                    trackEvent("helps_line_example_clicked", { source, metadata: { example } });
                    fieldRef.current?.focus();
                  }}
                  className="inline-flex min-h-[44px] items-center rounded-full bg-primary/10 px-4 text-sm font-medium text-primary transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-reduce:transition-none"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
          {error && <p role="alert" className="text-sm text-secondary">{error}</p>}
          <div className="flex flex-col gap-3">
            <button
              type="submit"
              disabled={saving}
              aria-busy={saving}
              className="inline-flex min-h-[48px] w-full items-center justify-center rounded-full bg-primary px-6 font-body text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-70 motion-reduce:transition-none sm:w-auto sm:self-start"
            >
              {saving ? "Enregistrement en cours..." : "Je l'enregistre"}
            </button>
            <p className="font-body text-sm text-muted-foreground">{HELPS_WITH_AVAILABILITY_NOTE}</p>
          </div>
        </form>
      )}
    </div>
  );
};

export default HelpsWithLineForm;
