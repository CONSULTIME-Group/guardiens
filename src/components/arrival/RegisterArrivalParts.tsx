/**
 * Lot 1, parcours d'arrivée v2 : étapes C1 (choix) et C3 (email envoyé)
 * de l'inscription, affichées seulement drapeau arrival_v2 allumé.
 */
import { Link } from "react-router-dom";
import { Trans } from "@/i18n/react";
import { mailboxFor } from "@/lib/arrival";
import { trackEvent } from "@/lib/analytics";
import { Eyebrow, Gouache, useArrivalT, useArrivalViewed } from "./ArrivalUI";
const gouacheAnnonce = new URL("../../assets/aquarelles/univers-gardes-320.webp", import.meta.url).href;
const gouacheGarde = new URL("../../assets/aquarelles/final-arrivee-240.webp", import.meta.url).href;
// Lot INS1 étape 1 : illustration déjà présente dans le dépôt (gouache « jeux » de l'entraide).
const gouacheJeux = new URL("../../assets/missions/spot-jeux-160.webp", import.meta.url).href;
const mailbox = new URL("../../assets/aquarelles/arrivee-email-360.webp", import.meta.url).href;

export function ArrivalC1({ owner, sitter, onToggle, onContinue, loginHref }: {
  owner: boolean; sitter: boolean; onToggle: (r: "owner" | "sitter") => void; onContinue: () => void; loginHref: string;
}) {
  const t = useArrivalT();
  useArrivalViewed("C1");
  const cards: { role: "owner" | "sitter"; checked: boolean; title: string; text: string; img: string }[] = [
    { role: "owner", checked: owner, title: t("arrival.c1.owner_title"), text: t("arrival.c1.owner_text"), img: gouacheAnnonce },
    { role: "sitter", checked: sitter, title: t("arrival.c1.sitter_title"), text: t("arrival.c1.sitter_text"), img: gouacheGarde },
  ];
  return (
    <div className="space-y-4" data-testid="arrival-c1">
      <p className="text-center text-sm text-muted-foreground">{t("arrival.c1.header")}</p>
      <h2 className="text-3xl font-semibold">{t("arrival.c1.title")}</h2>

      {/* Lot INS1 étape 1 : la garde se coche (une case, les deux, ou aucune). */}
      <div role="group" aria-labelledby="arrival-c1-guard" aria-describedby="arrival-c1-guard-hint" className="space-y-2.5">
        <div>
          <p id="arrival-c1-guard" className="arrival-eyebrow">{t("arrival.c1.guard_eyebrow")}</p>
          <p id="arrival-c1-guard-hint" className="mt-1 text-[15px] leading-snug text-foreground/80">{t("arrival.c1.guard_hint")}</p>
        </div>
        <div className="space-y-2.5">
          {cards.map((c) => (
            <label key={c.role} htmlFor={`arrival-c1-${c.role}`} data-checked={c.checked ? "true" : "false"}
              className="arrival-card arrival-check-card flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left">
              <input
                id={`arrival-c1-${c.role}`}
                type="checkbox"
                checked={c.checked}
                onChange={() => onToggle(c.role)}
                aria-labelledby={`arrival-c1-${c.role}-title`}
                aria-describedby={`arrival-c1-${c.role}-text`}
                className="arrival-checkbox mx-1 h-6 w-6 shrink-0"
              />
              <span className="min-w-0 flex-1">
                <span id={`arrival-c1-${c.role}-title`} className="block text-[17px] font-semibold">{c.title}</span>
                <span id={`arrival-c1-${c.role}-text`} className="block text-sm leading-snug text-muted-foreground">{c.text}</span>
              </span>
              <img src={c.img} alt="" aria-hidden="true" width={56} height={56} className="illustration-blend h-14 w-14 shrink-0 object-contain" />
            </label>
          ))}
        </div>
      </div>

      {/* Entraide et sorties : acquises à tout membre, rien à cocher. */}
      <div className="space-y-2" data-testid="arrival-c1-included">
        <p className="arrival-eyebrow arrival-eyebrow-green">{t("arrival.c1.all_eyebrow")}</p>
        <div className="arrival-included flex items-center gap-3 px-3 py-3">
          <span role="img" aria-label={t("arrival.c1.included_badge")} className="arrival-included-badge flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[17px] font-semibold">{t("arrival.c1.included_title")}</span>
            <span className="arrival-included-text block text-sm leading-snug">{t("arrival.c1.included_text")}</span>
          </span>
          <img src={gouacheJeux} alt="" aria-hidden="true" width={56} height={56} className="illustration-blend h-14 w-14 shrink-0 object-contain" />
        </div>
      </div>

      <button type="button" className="arrival-primary" onClick={onContinue}>
        {t("arrival.continue")}
      </button>
      <p className="text-center text-sm text-muted-foreground">
        {t("arrival.c1.have_account")} <Link to={loginHref} className="arrival-link">{t("arrival.c1.sign_in")}</Link>
      </p>
    </div>
  );
}

/**
 * `recap` : une clé arrival.* (traduite ici, une fois les textes du parcours
 * chargés avec ce module) ou un libellé déjà traduit. Recette du 01/11/2026 :
 * traduite par la page d'inscription, la clé s'affichait brute.
 */
export function ArrivalC2Header({ recap, onModify }: { recap: string; onModify: () => void }) {
  const t = useArrivalT();
  const recapLabel = recap.startsWith("arrival.") ? t(recap) : recap;
  useArrivalViewed("C2");
  return (
    <div className="space-y-4" data-testid="arrival-c2">
      <p className="text-center text-sm text-muted-foreground">{t("arrival.c2.header")}</p>
      <div className="space-y-3">
        <Eyebrow>{t("arrival.c2.eyebrow")}</Eyebrow>
        <h2 className="text-3xl font-semibold">{t("arrival.c2.title")}</h2>
      </div>
      <div className="flex items-center justify-between rounded-xl bg-card px-4 py-3">
        <span className="font-medium">{recapLabel}</span>
        <button type="button" onClick={onModify} className="arrival-link text-sm">{t("arrival.c2.modify")}</button>
      </div>
    </div>
  );
}

export function ArrivalC3({ email, onResend, resendDisabled, cooldown, onFixEmail }: {
  email: string; onResend: () => void; resendDisabled: boolean; cooldown: number; onFixEmail: () => void;
}) {
  const t = useArrivalT();
  useArrivalViewed("C3");
  const box = mailboxFor(email);
  return (
    <div className="space-y-5" data-testid="arrival-c3">
      <p className="text-center text-sm text-muted-foreground">{t("arrival.c3.header")}</p>
      <Gouache src={mailbox} size={180} />
      <div className="space-y-3">
        <Eyebrow>{t("arrival.c3.eyebrow")}</Eyebrow>
        <h2 className="text-3xl font-semibold">{t("arrival.c3.title")}</h2>
        <p className="text-foreground/80 break-words">
          <Trans i18nKey="arrival.c3.text" values={{ email }} />
        </p>
      </div>
      {box && (
        <a href={box.url} target="_blank" rel="noopener noreferrer"
          className="arrival-primary inline-flex items-center justify-center"
          onClick={() => { void trackEvent("signup_mailbox_opened", { source: "/inscription", metadata: { provider: box.provider } }); }}>
          {box.label}
        </a>
      )}
      <ol className="space-y-3 text-sm">
        {[t("arrival.c3.tip1"), t("arrival.c3.tip2")].map((tip, i) => (
          <li key={i} className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-card font-semibold">{i + 1}</span>
            <span>{tip}</span>
          </li>
        ))}
      </ol>
      <div className="flex flex-col items-center gap-1">
        <button type="button" className="arrival-link text-sm" onClick={onResend} disabled={resendDisabled}>
          {cooldown > 0 ? t("arrival.c3.resend_wait", { s: cooldown }) : t("arrival.c3.resend")}
        </button>
        <button type="button" className="arrival-link text-sm" onClick={onFixEmail}>{t("arrival.c3.fix_email")}</button>
      </div>
    </div>
  );
}
