import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { sanitizeUserTitle } from "@/lib/sanitizeTitle";
import { trackEvent } from "@/lib/analytics";

/**
 * MobileEntraideFeed — Chantier 5 Pass 3.
 * Feed unifié mobile : agrège Questions, Besoins et Offres triés par date DESC.
 * Multi-select chips Q / D / O persisté en sessionStorage.
 *
 * Analytics :
 *  - entraide_feed_default_view : émis une seule fois par session mobile
 *  - entraide_feed_chip_toggled : émis à chaque toggle, avec { filter_types }
 */

type FeedType = "question" | "besoin" | "offre";

const CHIPS: { key: FeedType; label: string; short: string; badge: string }[] = [
  { key: "question", label: "Questions", short: "Questions", badge: "bg-primary/10 text-primary" },
  { key: "besoin", label: "Demandes d'aide", short: "Demandes", badge: "bg-secondary/15 text-secondary-foreground" },
  { key: "offre", label: "Offres d'aide", short: "Offres", badge: "bg-accent/25 text-accent-foreground" },
];

const STORAGE_KEY = "entraide-feed-chips-v1";
const SESSION_VIEW_KEY = "entraide-feed-default-view-tracked";

const readChips = (): FeedType[] => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return ["question", "besoin", "offre"];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const valid = parsed.filter((v): v is FeedType => v === "question" || v === "besoin" || v === "offre");
      return valid.length ? valid : ["question", "besoin", "offre"];
    }
  } catch { /* ignore */ }
  return ["question", "besoin", "offre"];
};

const writeChips = (chips: FeedType[]) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(chips));
  } catch { /* ignore */ }
};

const formatRelative = (iso: string) => {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: fr });
  } catch {
    return "";
  }
};

export interface FeedMission {
  id: string;
  title: string;
  description: string | null;
  category: string;
  city: string | null;
  created_at: string;
  mission_type: "besoin" | "offre" | null;
  profiles?: { first_name: string | null; avatar_url: string | null } | null;
}

export interface FeedQuestion {
  id: string;
  title: string;
  body?: string | null;
  category?: string | null;
  created_at: string;
  author_name?: string | null;
  author_avatar?: string | null;
  answers_count?: number | null;
}

interface Props {
  missions: FeedMission[];
  questions: FeedQuestion[];
  loading?: boolean;
  onAsk: () => void;
  onNeed: () => void;
  onOffer: () => void;
}

const MobileEntraideFeed = ({ missions, questions, loading, onAsk, onNeed, onOffer }: Props) => {
  const navigate = useNavigate();
  const [active, setActive] = useState<FeedType[]>(() => readChips());
  const viewFiredRef = useRef(false);

  useEffect(() => {
    if (viewFiredRef.current) return;
    try {
      if (sessionStorage.getItem(SESSION_VIEW_KEY)) {
        viewFiredRef.current = true;
        return;
      }
      sessionStorage.setItem(SESSION_VIEW_KEY, "1");
    } catch { /* ignore */ }
    viewFiredRef.current = true;
    try { void trackEvent("entraide_feed_default_view", { metadata: { filter_types: active } }); } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleChip = (key: FeedType) => {
    setActive((prev) => {
      const has = prev.includes(key);
      let next: FeedType[];
      if (has) {
        next = prev.filter((k) => k !== key);
        if (next.length === 0) next = prev; // toujours ≥ 1 chip
      } else {
        next = [...prev, key];
      }
      writeChips(next);
      try { void trackEvent("entraide_feed_chip_toggled", { metadata: { filter_types: next } }); } catch { /* ignore */ }
      return next;
    });
  };

  const items = useMemo(() => {
    const list: Array<
      | { kind: "question"; date: string; data: FeedQuestion }
      | { kind: FeedType & ("besoin" | "offre"); date: string; data: FeedMission }
    > = [];
    if (active.includes("question")) {
      for (const q of questions) list.push({ kind: "question", date: q.created_at, data: q });
    }
    for (const m of missions) {
      const t = (m.mission_type ?? "besoin") as "besoin" | "offre";
      if (active.includes(t)) list.push({ kind: t, date: m.created_at, data: m });
    }
    return list.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [active, missions, questions]);

  const emptyCta =
    active.length === 1
      ? active[0] === "question"
        ? { label: "Poser une question", action: onAsk }
        : active[0] === "besoin"
          ? { label: "Publier une demande", action: onNeed }
          : { label: "Proposer mon aide", action: onOffer }
      : { label: "Publier une demande", action: onNeed };

  return (
    <div className="md:hidden">
      <div className="mb-3">
        <h2 className="font-heading text-lg font-semibold text-foreground">Fil de l'entraide</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Tout ce qui bouge près de chez vous, du plus récent au plus ancien.
        </p>
      </div>

      <div
        role="group"
        aria-label="Filtrer le fil de l'entraide"
        className="mb-4 flex items-center gap-2 flex-wrap"
      >
        {CHIPS.map((c) => {
          const on = active.includes(c.key);
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => toggleChip(c.key)}
              aria-pressed={on}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                on
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:bg-accent"
              }`}
            >
              {c.short}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-3" aria-busy="true" aria-live="polite">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : items.length > 0 ? (
        <ul className="space-y-3">
          {items.map((it) => {
            if (it.kind === "question") {
              const q = it.data;
              return (
                <li key={`q-${q.id}`}>
                  <Link
                    to={`/questions/${q.id}`}
                    className="block p-4 rounded-xl bg-card border border-border hover:border-primary/40 hover:shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    aria-label={`Voir la question : ${q.title}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wide">
                        Question
                      </span>
                      <span className="ml-auto text-[11px] text-muted-foreground">{formatRelative(q.created_at)}</span>
                    </div>
                    <p className="font-heading text-base font-semibold text-foreground line-clamp-2">{q.title}</p>
                    {q.body && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{q.body}</p>
                    )}
                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <Avatar className="h-5 w-5 shrink-0">
                        <AvatarImage src={q.author_avatar || undefined} alt="" loading="lazy" />
                        <AvatarFallback className="text-[9px]">
                          {(q.author_name || "M").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate max-w-[10rem]">{q.author_name || "Membre"}</span>
                      {typeof q.answers_count === "number" && (
                        <span className="ml-auto">
                          {q.answers_count} réponse{q.answers_count > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              );
            }
            const m = it.data;
            const isOffer = it.kind === "offre";
            const badgeLabel = isOffer ? "Offre" : "Besoin";
            const badgeCls = isOffer
              ? "bg-accent/25 text-accent-foreground"
              : "bg-secondary/15 text-secondary-foreground";
            const authorName = m.profiles?.first_name || "Membre";
            return (
              <li key={`m-${m.id}`}>
                <Link
                  to={`/petites-missions/${m.id}`}
                  className="block p-4 rounded-xl bg-card border border-border hover:border-primary/40 hover:shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  aria-label={`Voir la publication : ${sanitizeUserTitle(m.title) || m.title}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${badgeCls}`}
                    >
                      {badgeLabel}
                    </span>
                    <span className="ml-auto text-[11px] text-muted-foreground">{formatRelative(m.created_at)}</span>
                  </div>
                  <p className="font-heading text-base font-semibold text-foreground line-clamp-2">
                    {sanitizeUserTitle(m.title) || m.title}
                  </p>
                  {m.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{m.description}</p>
                  )}
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <Avatar className="h-5 w-5 shrink-0">
                      <AvatarImage src={m.profiles?.avatar_url || undefined} alt="" loading="lazy" />
                      <AvatarFallback className="text-[9px]">
                        {authorName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate max-w-[10rem]">{authorName}</span>
                    {m.city && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="truncate">{m.city}</span>
                      </>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="p-6 rounded-2xl border border-dashed border-border bg-accent/20 text-center">
          <p className="font-heading text-base text-foreground">Rien de neuf pour ces filtres.</p>
          <p className="text-sm text-muted-foreground mt-2">
            Élargissez la sélection ou lancez le mouvement, votre publication apparaît immédiatement.
          </p>
          <div className="mt-4">
            <button
              type="button"
              onClick={emptyCta.action}
              className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              {emptyCta.label}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileEntraideFeed;
