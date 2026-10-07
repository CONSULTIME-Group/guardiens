/**
 * Lot 1, parcours d'arrivée v2 : briques communes des écrans C1 à P4.
 * Chargées à la demande avec les écrans, jamais dans l'entrée.
 */
import { useEffect, useRef, type ReactNode } from "react";
import i18n from "i18next";
import { useTranslation } from "react-i18next";
import arrivalFr from "@/i18n/locales/fr/arrival.json";
import { trackEvent } from "@/lib/analytics";
import { supabase } from "@/integrations/supabase/client";
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
  return <img src={src} alt="" aria-hidden="true" width={size} height={size} loading="eager" className={`illustration-blend mx-auto object-contain ${className}`} style={{ width: size, height: "auto" }} />;
}

export type OwnerStepKey = "you" | "departure" | "listing" | "affinities";
const OWNER_STEPS: OwnerStepKey[] = ["you", "departure", "listing", "affinities"];

export type SitterStepKey = "you" | "affinities" | "skills" | "first";
const SITTER_STEPS: SitterStepKey[] = ["you", "affinities", "skills", "first"];
const ENTRAIDE_STEPS: SitterStepKey[] = ["you", "first"];

function StepBar({ keys, current, ns }: { keys: string[]; current: string; ns: string }) {
  const t = useArrivalT();
  const idx = keys.indexOf(current);
  const cols = { gridTemplateColumns: `repeat(${keys.length}, 1fr)` };
  return (
    <div className="space-y-1.5" aria-label={t(`arrival.${ns}.${current}`)}>
      <div className="arrival-stepbar" style={cols}>
        {keys.map((s, i) => <span key={s} data-done={i <= idx ? "true" : "false"} />)}
      </div>
      <ol className="grid gap-1.5 text-[11px] text-muted-foreground" style={cols}>
        {keys.map((s, i) => (
          <li key={s} className={i === idx ? "font-semibold text-foreground" : ""} aria-current={i === idx ? "step" : undefined}>
            {t(`arrival.${ns}.${s}`)}
          </li>
        ))}
      </ol>
    </div>
  );
}

export const OwnerStepBar = ({ current }: { current: OwnerStepKey }) => <StepBar keys={OWNER_STEPS} current={current} ns="steps" />;

export function ArrivalShell({ header, children, stepBar, sitterStep }: {
  header: string; children: ReactNode; stepBar?: OwnerStepKey; sitterStep?: { current: SitterStepKey; entraide?: boolean };
}) {
  return (
    <main className="arrival-root min-h-screen min-w-0">
      <div className="mx-auto w-full max-w-md px-5 pb-16 pt-6 space-y-6">
        <p className="text-center text-sm text-muted-foreground">{header}</p>
        {stepBar && <OwnerStepBar current={stepBar} />}
        {sitterStep && <StepBar keys={sitterStep.entraide ? ENTRAIDE_STEPS : SITTER_STEPS} current={sitterStep.current} ns="steps_sitter" />}
        {children}
      </div>
    </main>
  );
}

/** Envoi de l'avatar, même chemin que la modale d'accueil (bucket avatars). */
export async function uploadAvatar(userId: string, original: File): Promise<string> {
  const { compressAvatarFile } = await import("@/lib/compressImage");
  const file = await compressAvatarFile(original);
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${userId}/avatar.${ext}`;
  const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type || undefined });
  if (error) throw error;
  const url = `${supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl}?t=${Date.now()}`;
  const { error: e2 } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", userId);
  if (e2) throw e2;
  return url;
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
