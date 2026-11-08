/**
 * Retour calme au récit de l'accueil (lots L5 et L6). Une phrase en
 * role="status" au-dessus du récit, jusqu'au geste suivant du membre
 * (toucher, clavier), puis elle s'efface. Le paramètre quitte l'adresse tout
 * de suite, un rechargement ne la rejoue pas.
 *  - ?publiee= (L5, B-03) : « Votre annonce est en ligne. »
 *  - ?reponse=Prénom (L6, B-07) : « Camille a votre réponse. », suivi de
 *    « Théo attend la sienne. » quand une autre candidature attend.
 */
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Check } from "lucide-react";
import { PUBLISHED_PARAM, REPLIED_PARAM, noticeFirstName } from "@/lib/afterPublish";

/** Délai avant d'écouter le geste suivant : le toucher qui a mené ici ne compte pas. */
export const PUBLISHED_NOTICE_ARM_MS = 600;

type Notice = { kind: "published" } | { kind: "replied"; name: string };

function readNotice(params: URLSearchParams): Notice | null {
  if (params.get(PUBLISHED_PARAM)) return { kind: "published" };
  const name = noticeFirstName(params.get(REPLIED_PARAM));
  return name ? { kind: "replied", name } : null;
}

interface Props {
  /** Prénom du prochain candidat en attente (B-07), s'il y en a un. */
  waitingName?: string | null;
}

export default function PublishedNotice({ waitingName }: Props) {
  const [params, setParams] = useSearchParams();
  const [notice] = useState<Notice | null>(() => readNotice(params));
  const [visible, setVisible] = useState(!!notice);

  useEffect(() => {
    if (!params.has(PUBLISHED_PARAM) && !params.has(REPLIED_PARAM)) return;
    const next = new URLSearchParams(params);
    next.delete(PUBLISHED_PARAM);
    next.delete(REPLIED_PARAM);
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

  if (!visible || !notice) return null;
  const waiting = noticeFirstName(waitingName);
  return (
    <div
      role="status"
      data-testid="story-published-notice"
      data-kind={notice.kind}
      className="flex items-start gap-[10px] rounded-[16px] border border-primary/30 bg-primary/5 p-[14px]"
    >
      <span className="mt-[1px] flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary" aria-hidden="true">
        <Check className="h-[14px] w-[14px]" />
      </span>
      {notice.kind === "published" ? (
        <p className="text-[15px] leading-snug text-foreground">
          <span className="font-semibold">Votre annonce est en ligne.</span> Les gardiens peuvent maintenant vous proposer leur aide.
        </p>
      ) : (
        <p className="text-[15px] leading-snug text-foreground">
          <span className="font-semibold">{notice.name} a votre réponse.</span>
          {waiting && waiting !== notice.name ? ` ${waiting} attend la sienne.` : ""}
        </p>
      )}
    </div>
  );
}
