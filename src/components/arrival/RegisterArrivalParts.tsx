/**
 * Lot 1, parcours d'arrivée v2 : étapes C1 (choix) et C3 (email envoyé)
 * de l'inscription, affichées seulement drapeau arrival_v2 allumé.
 */
import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { Trans } from "react-i18next";
import { mailboxFor } from "@/lib/arrival";
import { trackEvent } from "@/lib/analytics";
import { Eyebrow, Gouache, useArrivalT, useArrivalViewed } from "./ArrivalUI";
import gouacheAnnonce from "@/assets/illustrations/howto-step-1-annonce-224.webp";
import gouacheGarde from "@/assets/onboarding/gouache-garde.png";
import mailbox from "@/assets/empty-states/v2/responsive/rural-mailbox-384.webp";

type Role = "owner" | "sitter" | "both";

export function ArrivalC1({ selected, onSelect, onEntraide, onContinue, loginHref }: {
  selected: Role | null; onSelect: (r: Role) => void; onEntraide: () => void; onContinue: () => void; loginHref: string;
}) {
  const t = useArrivalT();
  useArrivalViewed("C1");
  const cards: { role: Role; title: string; text: string; img: string }[] = [
    { role: "owner", title: t("arrival.c1.owner_title"), text: t("arrival.c1.owner_text"), img: gouacheAnnonce },
    { role: "sitter", title: t("arrival.c1.sitter_title"), text: t("arrival.c1.sitter_text"), img: gouacheGarde },
  ];
  return (
    <div className="space-y-5" data-testid="arrival-c1">
      <p className="text-center text-sm text-muted-foreground">{t("arrival.c1.header")}</p>
      <div className="space-y-3">
        <Eyebrow>{t("arrival.c1.eyebrow")}</Eyebrow>
        <h2 className="text-3xl font-semibold">{t("arrival.c1.title")}</h2>
        <p className="text-foreground/80">{t("arrival.c1.text")}</p>
      </div>
      <div role="radiogroup" aria-label={t("arrival.c1.title")} className="space-y-3">
        {cards.map((c) => (
          <button key={c.role} type="button" role="radio" aria-checked={selected === c.role} onClick={() => onSelect(c.role)}
            className="arrival-card flex w-full items-center gap-4 p-4 text-left">
            <img src={c.img} alt="" aria-hidden="true" className="illustration-blend h-20 w-20 shrink-0 object-contain" />
            <span>
              <span className="block text-lg font-semibold">{c.title}</span>
              <span className="block text-sm text-muted-foreground">{c.text}</span>
            </span>
          </button>
        ))}
      </div>
      <button type="button" onClick={onEntraide} className="arrival-link inline-flex items-center gap-2 text-sm">
        <Heart className="h-4 w-4" aria-hidden="true" />
        {t("arrival.c1.entraide_link")}
      </button>
      <button type="button" className="arrival-primary" disabled={selected !== "owner" && selected !== "sitter"} onClick={onContinue}>
        {t("arrival.continue")}
      </button>
      <p className="text-center text-sm text-muted-foreground">
        {t("arrival.c1.have_account")} <Link to={loginHref} className="arrival-link">{t("arrival.c1.sign_in")}</Link>
      </p>
    </div>
  );
}

export function ArrivalC2Header({ recap, onModify }: { recap: string; onModify: () => void }) {
  const t = useArrivalT();
  useArrivalViewed("C2");
  return (
    <div className="space-y-4" data-testid="arrival-c2">
      <p className="text-center text-sm text-muted-foreground">{t("arrival.c2.header")}</p>
      <div className="space-y-3">
        <Eyebrow>{t("arrival.c2.eyebrow")}</Eyebrow>
        <h2 className="text-3xl font-semibold">{t("arrival.c2.title")}</h2>
      </div>
      <div className="flex items-center justify-between rounded-xl bg-card px-4 py-3">
        <span className="font-medium">{recap}</span>
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
