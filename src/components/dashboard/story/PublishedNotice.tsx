/**
 * Lot L5 : retour calme après une publication rapide (B-03). Une phrase en
 * role="status" au-dessus du récit, qui reste jusqu'au geste suivant du
 * membre (toucher, clavier) puis s'efface. Le paramètre ?publiee= quitte
 * l'adresse tout de suite, un rechargement ne la rejoue pas.
 */
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Check } from "lucide-react";
import { PUBLISHED_PARAM } from "@/lib/afterPublish";

/** Délai avant d'écouter le geste suivant : le toucher qui a publié ne compte pas. */
export const PUBLISHED_NOTICE_ARM_MS = 600;

export default function PublishedNotice() {
  const [params, setParams] = useSearchParams();
  const [shown] = useState(() => !!params.get(PUBLISHED_PARAM));
  const [visible, setVisible] = useState(shown);

  useEffect(() => {
    if (!params.get(PUBLISHED_PARAM)) return;
    const next = new URLSearchParams(params);
    next.delete(PUBLISHED_PARAM);
    setParams(next, { replace: true });
  }, [params, setParams]);

  useEffect(() => {
    if (!visible) return;
    const hide = () => setVisible(false);
    const t = window.setTimeout(() => {
      window.addEventListener("pointerdown", hide, { once: true });
      window.addEventListener("keydown", hide, { once: true });
    }, PUBLISHED_NOTICE_ARM_MS);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("pointerdown", hide);
      window.removeEventListener("keydown", hide);
    };
  }, [visible]);

  if (!visible) return null;
  return (
    <div
      role="status"
      data-testid="story-published-notice"
      className="flex items-start gap-[10px] rounded-[16px] border border-primary/30 bg-primary/5 p-[14px]"
    >
      <span className="mt-[1px] flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary" aria-hidden="true">
        <Check className="h-[14px] w-[14px]" />
      </span>
      <p className="text-[15px] leading-snug text-foreground">
        <span className="font-semibold">Votre annonce est en ligne.</span> Les gardiens peuvent maintenant vous proposer leur aide.
      </p>
    </div>
  );
}
