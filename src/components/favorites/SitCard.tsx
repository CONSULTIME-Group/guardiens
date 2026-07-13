import { Link } from "react-router-dom";
import FavoriteButton from "@/components/shared/FavoriteButton";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import AffinityBadge from "@/components/matching/AffinityBadge";
import { useAffinityWithShadow } from "@/hooks/useAffinityWithShadow";
import { useViewerSitterForAffinity } from "@/hooks/useViewerSitterForAffinity";

interface Sit {
  id: string;
  title?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: string | null;
  ownerAffinity?: any | null;
  pets?: { species?: string | null; special_needs?: string | null }[] | null;
  accepts_sitter_pets?: string | null;
  accepts_sitter_children?: string | null;
}

interface SitCardProps {
  sit: Sit;
  fallbackLabel: string;
  locale: string;
}

const formatDate = (d: string, locale: string) =>
  new Date(d).toLocaleDateString(locale, { day: "numeric", month: "short" });

const SitCard = ({ sit, fallbackLabel, locale }: SitCardProps) => {
  const { t } = useTranslation();
  const { sitter: viewerSitter } = useViewerSitterForAffinity();

  const ownerInput = sit.ownerAffinity
    ? {
        ...sit.ownerAffinity,
        pets: sit.pets || [],
        accepts_sitter_pets: sit.accepts_sitter_pets ?? null,
        accepts_sitter_children: sit.accepts_sitter_children ?? null,
      }
    : null;

  const { full } = useAffinityWithShadow(ownerInput, viewerSitter, {
    context: "favorites_sits",
    targetId: sit.id,
    enabled: !!ownerInput && !!viewerSitter,
  });

  const dateLabel =
    sit.start_date && sit.end_date
      ? `${formatDate(sit.start_date, locale)} au ${formatDate(sit.end_date, locale)}`
      : sit.start_date
      ? `Dès le ${formatDate(sit.start_date, locale)}`
      : null;

  const isActive = sit.status === "open" || sit.status === "published";

  return (
    <article className="flex items-center gap-3 px-3 py-3 min-h-[60px] rounded-xl border border-border bg-card hover:bg-accent/40 transition-colors">
      <div className="flex-1 min-w-0">
        <Link
          to={`/annonces/${sit.id}`}
          className="block text-sm font-medium text-foreground hover:text-primary transition-colors line-clamp-1 leading-snug"
        >
          {sit.title ?? fallbackLabel}
        </Link>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {dateLabel && (
            <span className="text-xs text-muted-foreground">{dateLabel}</span>
          )}
          {isActive && (
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5 py-0 leading-none">
              Ouverte
            </Badge>
          )}
          {full?.displayed && (
            <AffinityBadge
              result={full}
              size="sm"
              trackingContext="favorites_sits"
              trackingId={sit.id}
            />
          )}
        </div>
      </div>

      <FavoriteButton targetType="sit" targetId={sit.id} size="md" className="shrink-0" />
    </article>
  );
};

export default SitCard;
