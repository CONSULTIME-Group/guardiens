import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Heart } from "lucide-react";

interface Highlight {
  id: string;
  photo_url: string | null;
  text: string;
  created_at: string;
  sitter?: { first_name: string; avatar_url: string | null } | null;
}

interface Props {
  highlights: Highlight[];
  maxItems?: number;
}

const PASTEL_BG = [
  "bg-orange-50 dark:bg-orange-950/20",
  "bg-blue-50 dark:bg-blue-950/20",
  "bg-green-50 dark:bg-green-950/20",
  "bg-purple-50 dark:bg-purple-950/20",
  "bg-pink-50 dark:bg-pink-950/20",
];

const OwnerHighlights = ({ highlights, maxItems }: Props) => {
  if (highlights.length === 0) return null;

  const items = maxItems ? highlights.slice(0, maxItems) : highlights;

  return (
    <div className="space-y-3">
      <h3 className="font-heading font-semibold text-sm flex items-center gap-1.5">
        <Heart className="h-4 w-4 text-primary" /> Ce que les gardiens ont aimé
      </h3>

      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
        {items.map((h, i) => (
          <div
            key={h.id}
            className={`shrink-0 w-64 rounded-xl border border-border overflow-hidden snap-start ${!h.photo_url ? PASTEL_BG[i % PASTEL_BG.length] : ""}`}
          >
            {h.photo_url && (
              <img src={h.photo_url} alt="" className="w-full h-32 object-cover" />
            )}
            <div className="p-3 space-y-2">
              <p className="text-sm italic text-foreground leading-snug">"{h.text}"</p>
              <div className="flex items-center gap-2">
                {h.sitter?.avatar_url ? (
                  <img src={h.sitter.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">
                    {h.sitter?.first_name?.charAt(0) || "?"}
                  </div>
                )}
                <span className="text-xs text-muted-foreground">
                  {h.sitter?.first_name || "Gardien"} · {format(new Date(h.created_at), "MMM yyyy", { locale: fr })}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OwnerHighlights;
