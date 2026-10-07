/**
 * Lot 1, parcours d'arrivée v2 : briques communes des écrans C1 à P4.
 * Chargées à la demande avec les écrans, jamais dans l'entrée.
 */
import { useEffect, useRef, type ReactNode } from "react";
import i18n from "i18next";
import { useTranslation } from "react-i18next";
import arrivalFr from "@/i18n/locales/fr/arrival.json";
import { trackEvent } from "@/lib/analytics";
import type { ArrivalStep } from "@/lib/arrival";
import "./arrival.css";

// Textes sous la clé arrival.* du dictionnaire commun, ajoutés au chargement
// des écrans pour ne pas alourdir l'entrée (plafond 307 200 octets).
if (!i18n.exists?.("arrival.c1.title")) {
  i18n.addResourceBundle?.("fr", "common", { arrival: arrivalFr }, true, true);
}

export const useArrivalT = () => useTranslation().t;

export function trackArrival(kind: "viewed" | "completed", step: ArrivalStep) {
  void trackEvent(kind === "viewed" ? "arrival_step_viewed" : "arrival_step_completed", {
    source: "arrival",
    metadata: { step },
  });
}

/** Émet arrival_step_viewed une seule fois au montage. */
export function useArrivalViewed(step: ArrivalStep, enabled = true) {
  const done = useRef(false);
  useEffect(() => {
    if (!enabled || done.current) return;
    done.current = true;
    trackArrival("viewed", step);
  }, [step, enabled]);
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="arrival-eyebrow">{children}</p>;
}

export function Gouache({ src, className = "", size = 160 }: { src: string; className?: string; size?: number }) {
  return <img src={src} alt="" aria-hidden="true" width={size} height={size} loading="eager" className={`arrival-gouache mx-auto object-contain ${className}`} style={{ width: size, height: "auto" }} />;
}

export type OwnerStepKey = "you" | "departure" | "listing" | "affinities";
const OWNER_STEPS: OwnerStepKey[] = ["you", "departure", "listing", "affinities"];

export function OwnerStepBar({ current }: { current: OwnerStepKey }) {
  const t = useArrivalT();
  const idx = OWNER_STEPS.indexOf(current);
  return (
    <div className="space-y-1.5" aria-label={t(`arrival.steps.${current}`)}>
      <div className="arrival-stepbar">
        {OWNER_STEPS.map((s, i) => <span key={s} data-done={i <= idx ? "true" : "false"} />)}
      </div>
      <ol className="grid grid-cols-4 gap-1.5 text-[11px] text-muted-foreground">
        {OWNER_STEPS.map((s, i) => (
          <li key={s} className={i === idx ? "font-semibold text-foreground" : ""} aria-current={i === idx ? "step" : undefined}>
            {t(`arrival.steps.${s}`)}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function ArrivalShell({ header, children, stepBar }: { header: string; children: ReactNode; stepBar?: OwnerStepKey }) {
  return (
    <main className="arrival-root min-h-screen min-w-0">
      <div className="mx-auto w-full max-w-md px-5 pb-16 pt-6 space-y-6">
        <p className="text-center text-sm text-muted-foreground">{header}</p>
        {stepBar && <OwnerStepBar current={stepBar} />}
        {children}
      </div>
    </main>
  );
}

/** Choix multiple : bouton type="button" avec aria-pressed. */
export function MultiChoice({ options, value, onChange, label }: {
  options: { value: string; label: string }[]; value: string[]; onChange: (v: string[]) => void; label: string;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium mb-2">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = value.includes(o.value);
          return (
            <button key={o.value} type="button" aria-pressed={on} className="arrival-choice"
              onClick={() => onChange(on ? value.filter((x) => x !== o.value) : [...value, o.value])}>
              {o.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Choix unique : radiogroup. */
export function SingleChoice({ options, value, onChange, label, id }: {
  options: { value: string; label: string }[]; value: string; onChange: (v: string) => void; label: string; id: string;
}) {
  return (
    <div className="space-y-2">
      <p id={`${id}-label`} className="text-sm font-medium">{label}</p>
      <div role="radiogroup" aria-labelledby={`${id}-label`} className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button key={o.value} type="button" role="radio" aria-checked={value === o.value} className="arrival-choice"
            onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SaveError({ show }: { show: boolean }) {
  const t = useArrivalT();
  if (!show) return null;
  return <p role="alert" className="text-sm text-destructive">{t("arrival.error_save")}</p>;
}
