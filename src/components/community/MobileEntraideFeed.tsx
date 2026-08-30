import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { sanitizeUserTitle } from "@/lib/sanitizeTitle";
import { trackEvent } from "@/lib/analytics";
import { publicFirstName } from "@/lib/displayName";
import MissionCardCover from "@/components/missions/MissionCardCover";
import { MISSION_CATEGORY_LABEL } from "@/lib/missionCategories";

/**
 * MobileEntraideFeed — fil unique de l'entraide sur mobile.
 * Agrège Questions, Demandes et Offres triées par date DESC.
 * Multi-select chips Q / D / O persisté en sessionStorage, compteurs réels.
 * Un seul appel à l'action : « Publier ».
 *
 * Analytics :
 *  - entraide_feed_default_view : émis une seule fois par session mobile
 *  - entraide_feed_chip_toggled : émis à chaque toggle, avec { filter_types }
 */

type FeedType = "question" | "besoin" | "offre";

const CHIPS: { key: FeedType; label: string; short: string }[] = [
  { key: "question", label: "Questions", short: "Questions" },
  { key: "besoin", label: "Demandes d'aide", short: "Demandes" },
  { key: "offre", label: "Offres d'aide", short: "Offres" },
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
  slug?: string | null;
  title: string;
  description: string | null;
  exchange_offer?: string | null;
  category: string;
  city: string | null;
  created_at: string;
  status?: string | null;
  photos?: string[] | null;
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
  /** Action unique de publication (demande, offre ou question). */
  onPublish: () => void;
  /** Tri par proximité : actif seulement si la position est connue. */
  proximityActive?: boolean;
  getDistance?: (id: string) => number | null;
}

const MobileEntraideFeed = ({ missions, questions, loading, onPublish, proximityActive, getDistance }: Props) => {
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

  const counts = useMemo(() => {
    const c: Record<FeedType, number> = { question: questions.length, besoin: 0, offre: 0 };
    for (const m of missions) {
      c[(m.mission_type ?? "besoin") as "besoin" | "offre"] += 1;
    }
    return c;
  }, [missions, questions]);

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
    // Tri par proximité quand la position est connue, sinon chronologique.
    // La bannière ne promet jamais un tri sans effet.
    return list.sort((a, b) => {
      if (proximityActive && getDistance) {
        const da = getDistance(a.data.id);
        const db = getDistance(b.data.id);
        if (da != null && db != null && da !== db) return da - db;
        if (da != null) return -1;
        if (db != null) return 1;
      }
      return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
    });
  }, [active, missions, questions, proximityActive, getDistance]);

  return (
    <div className="md:hidden">
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
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors inline-flex items-center gap-1.5 ${
                on
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:bg-accent"
              }`}
            >
              <span>{c.short}</span>
              <span
                className={`text-[10px] tabular-nums px-1.5 py-px rounded-full ${
                  on ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground"
                }`}
              >
                {counts[c.key]}
              </span>
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
          {items.map((it, index) => {
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
                          {(publicFirstName(q.author_name) || "M").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate max-w-[10rem]">{publicFirstName(q.author_name) || "Membre"}</span>
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
            const badgeLabel = isOffer ? "Offre" : "Demande";
            // Même couple lisible que le fil desktop : encre sur terra-soft.
            const badgeCls = isOffer
              ? "bg-accent/25 text-accent-foreground"
              : "bg-terra-soft text-foreground border border-terra-border";
            const authorName = publicFirstName(m.profiles?.first_name) || "Membre";
            const statusBadge =
              m.status === "in_progress"
                ? { label: "En cours", aria: "Statut : en cours" }
                : m.status === "completed"
                  ? { label: "Terminée", aria: "Statut : terminée" }
                  : null;
            const dist = proximityActive && getDistance ? getDistance(m.id) : null;
            return (
              <li key={`m-${m.id}`}>
                <Link
                  to={`/petites-missions/${m.slug || m.id}`}
                  onClick={() => {
                    void trackEvent("mission_card_clicked", {
                      metadata: {
                        mission_id: m.id,
                        position: index + 1,
                        category: m.category,
                        mission_type: m.mission_type ?? "besoin",
                        surface: "feed_mobile",
                        distance_km: dist != null ? Math.round(dist) : null,
                      },
                    });
                  }}
                  className="flex gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/40 hover:shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  aria-label={`Voir la publication : ${sanitizeUserTitle(m.title) || m.title}`}
                >
                  <MissionCardCover
                    photo={m.photos && m.photos[0] ? m.photos[0] : null}
                    category={m.category}
                    title={m.title}
                    className="w-24 shrink-0 aspect-[4/3] rounded-lg"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${badgeCls}`}
                      >
                        {badgeLabel}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wide">
                        {MISSION_CATEGORY_LABEL[m.category as keyof typeof MISSION_CATEGORY_LABEL] || "Autre"}
                      </span>
                      {statusBadge && (
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground uppercase tracking-wide"
                          aria-label={statusBadge.aria}
                        >
                          {statusBadge.label}
                        </span>
                      )}
                      {dist != null && (
                        <span
                          className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary tabular-nums"
                          aria-label={dist < 1 ? "Distance : moins d'un kilomètre" : `Distance : environ ${Math.round(dist)} kilomètres`}
                        >
                          {dist < 1 ? "moins d'1 km" : `à ${Math.round(dist)} km`}
                        </span>
                      )}
                    </div>
                    <p className="font-heading text-base font-semibold text-foreground line-clamp-2">
                      {sanitizeUserTitle(m.title) || m.title}
                    </p>
                    {m.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{m.description}</p>
                    )}
                    {m.exchange_offer && (
                      <p className="mt-1.5 text-sm text-foreground/90 line-clamp-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mr-1.5">
                          En échange
                        </span>
                        {m.exchange_offer}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <Avatar className="h-5 w-5 shrink-0">
                        <AvatarImage src={m.profiles?.avatar_url || undefined} alt="" loading="lazy" />
                        <AvatarFallback className="text-[9px]">
                          {authorName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate max-w-[8rem]">{authorName}</span>
                      {m.city && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="truncate">{m.city}</span>
                        </>
                      )}
                      <span className="ml-auto shrink-0">{formatRelative(m.created_at)}</span>
                    </div>
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
              onClick={onPublish}
              className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              Publier
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileEntraideFeed;
