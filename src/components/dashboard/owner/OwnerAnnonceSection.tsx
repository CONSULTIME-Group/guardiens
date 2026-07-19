/**
 * OwnerAnnonceSection (vague 11) — VOTRE ANNONCE.
 *
 * Rendu calme, une seule carte pour l'annonce la plus proche dans le temps,
 * rangées compactes pour les autres. Pas de bloc candidatures (la star les porte).
 * Si aucune annonce active : rien ne s'affiche (la star d'état "publier" couvre déjà).
 */
import { Link } from "react-router-dom";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { getOptimizedImageUrl } from "@/lib/imageOptim";
import { SectionHeader } from "../sitter/SitterMatchSection";
import type { SitRow } from "./types";

// Vague 15 : passe par un token CSS pour s'assombrir en dark.
const PLACEHOLDER_BG = "var(--photo-placeholder-sand)";

const humanStatus = (status: string): string | null => {
  switch (status) {
    case "published":
      return "En ligne";
    case "confirmed":
      return "Garde confirmée";
    case "in_progress":
      return "Garde en cours";
    default:
      return null;
  }
};

const formatDateRange = (start?: string | null, end?: string | null): string | null => {
  if (!start && !end) return null;
  try {
    const s = start ? format(new Date(start), "d MMM", { locale: fr }) : "";
    const e = end ? format(new Date(end), "d MMM yyyy", { locale: fr }) : "";
    return [s, e].filter(Boolean).join(" au ");
  } catch {
    return null;
  }
};

interface OwnerAnnonceSectionProps {
  sits: SitRow[];
  coverPhoto?: string | null;
  pendingAppCount: number;
  city?: string | null;
}

const OwnerAnnonceSection = ({
  sits,
  coverPhoto,
  pendingAppCount,
  city,
}: OwnerAnnonceSectionProps) => {
  const now = Date.now();
  const active = sits
    .filter((s) => ["published", "confirmed", "in_progress"].includes(s.status))
    .sort((a, b) => {
      const at = a.start_date ? new Date(a.start_date).getTime() : Number.POSITIVE_INFINITY;
      const bt = b.start_date ? new Date(b.start_date).getTime() : Number.POSITIVE_INFINITY;
      return at - bt;
    });

  if (active.length === 0) return null;

  const featured = active[0];
  const rest = active.slice(1);
  const cover = coverPhoto ? getOptimizedImageUrl(coverPhoto, 900, 78) : null;
  const dates = formatDateRange(featured.start_date, featured.end_date);
  const status = humanStatus(featured.status);
  const daysUntil = featured.start_date
    ? differenceInDays(new Date(featured.start_date), new Date(now))
    : null;
  const meta: string[] = [];
  if (dates) meta.push(dates);
  if (daysUntil !== null && daysUntil > 0 && daysUntil <= 60) {
    meta.push(`dans ${daysUntil} jour${daysUntil > 1 ? "s" : ""}`);
  }
  if (typeof featured.views_30d === "number" && featured.views_30d > 0) {
    meta.push(`${featured.views_30d} vue${featured.views_30d > 1 ? "s" : ""} sur 30 jours`);
  }
  if (pendingAppCount > 0) {
    meta.push(`${pendingAppCount} candidature${pendingAppCount > 1 ? "s" : ""} en attente`);
  }

  return (
    <section aria-label="Votre annonce" className="px-4 sm:px-5 md:px-8">
      <SectionHeader eyebrow="Votre annonce" title="Votre maison se présente." />

      <article
        className="bg-card border border-border overflow-hidden"
        style={{
          borderRadius: "20px",
          boxShadow:
            "0 1px 2px rgba(29,27,22,0.04), 0 8px 24px rgba(29,27,22,0.05)",
        }}
      >
        <div
          className="relative w-full"
          style={{ height: "150px", background: cover ? undefined : PLACEHOLDER_BG }}
        >
          {cover && (
            <img
              src={cover}
              alt={featured.title || "Photo de votre annonce"}
              className="w-full h-full object-cover"
              loading="lazy"
              width={900}
              height={300}
            />
          )}
          {(city || status) && (
            <div className="absolute top-[14px] left-[14px] right-[14px] flex items-start justify-between gap-2">
              {city && (
                <span
                  className="rounded-full text-foreground/90 bg-background/85 backdrop-blur-sm"
                  style={{
                    padding: "4px 12px",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                >
                  {city}
                </span>
              )}
              {status && (
                <span
                  className="rounded-full bg-primary/15 text-primary"
                  style={{
                    padding: "4px 12px",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                >
                  {status}
                </span>
              )}
            </div>
          )}
        </div>

        <div style={{ padding: "22px" }}>
          <h3
            className="font-heading text-foreground"
            style={{ fontSize: "18px", fontWeight: 600, lineHeight: 1.3 }}
          >
            {featured.title || "Votre annonce"}
          </h3>
          {meta.length > 0 && (
            <p
              className="text-muted-foreground mt-[8px]"
              style={{ fontSize: "13.5px", lineHeight: 1.4 }}
            >
              {meta.join(" · ")}
            </p>
          )}
          <div className="mt-[14px]">
            <Link
              to={`/sits/${featured.id}`}
              className="text-primary hover:underline underline-offset-4"
              style={{ fontSize: "13px", fontWeight: 700 }}
            >
              Voir et modifier l'annonce
            </Link>
          </div>
        </div>
      </article>

      {rest.length > 0 && (
        <ul className="mt-[14px] space-y-[8px]">
          {rest.map((s) => {
            const r = formatDateRange(s.start_date, s.end_date);
            const st = humanStatus(s.status);
            return (
              <li key={s.id}>
                <Link
                  to={`/sits/${s.id}`}
                  className="flex items-center justify-between gap-[14px] bg-card border border-border rounded-xl hover:bg-muted/40 transition-colors"
                  style={{ padding: "14px 18px" }}
                >
                  <div className="min-w-0 flex-1">
                    <p
                      className="font-heading text-foreground truncate"
                      style={{ fontSize: "14.5px", fontWeight: 600 }}
                    >
                      {s.title || "Annonce"}
                    </p>
                    {r && (
                      <p
                        className="text-muted-foreground truncate"
                        style={{ fontSize: "12.5px" }}
                      >
                        {r}
                      </p>
                    )}
                  </div>
                  {st && (
                    <span
                      className="rounded-full bg-primary/10 text-primary shrink-0"
                      style={{
                        padding: "4px 12px",
                        fontSize: "11.5px",
                        fontWeight: 600,
                      }}
                    >
                      {st}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default OwnerAnnonceSection;
