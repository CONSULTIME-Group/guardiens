// Section « Annonces passées » de la page publique /annonces.
// Objectif : montrer l'activité de la communauté quand peu d'annonces sont
// ouvertes, sans laisser croire que ces gardes sont réservables.
// RLS : on ne lit QUE les annonces publiées (`status = 'published'`),
// dont les dates sont dépassées. Aucun brouillon, aucune annonce annulée.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PawPrint } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PastSit {
  id: string;
  slug: string | null;
  title: string;
  city: string | null;
  start_date: string | null;
  end_date: string | null;
  cover_photo_url: string | null;
}

const LIMIT = 12;

const formatDate = (iso: string | null) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "";
  }
};

export default function PastListingsSection() {
  const [items, setItems] = useState<PastSit[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const todayIso = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from("sits")
        .select("id, slug, title, city, start_date, end_date, cover_photo_url")
        .eq("status", "published")
        .not("end_date", "is", null)
        .lt("end_date", todayIso)
        .order("end_date", { ascending: false })
        .limit(LIMIT);
      if (cancelled) return;
      setItems((data as PastSit[]) || []);
    })();
    return () => { cancelled = true; };
  }, []);

  if (!items || items.length === 0) return null;

  return (
    <section
      aria-labelledby="past-listings-title"
      className="max-w-6xl mx-auto px-4 md:px-6 mt-10 md:mt-16"
    >
      <div className="flex items-end justify-between gap-4 mb-5 md:mb-7">
        <div className="min-w-0">
          <p className="text-xs font-body font-semibold tracking-widest uppercase text-primary/60 mb-2">
            Historique
          </p>
          <h2
            id="past-listings-title"
            className="font-heading text-2xl md:text-3xl font-semibold leading-snug text-foreground"
          >
            Annonces passées
          </h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Ces gardes ont déjà eu lieu, elles ne sont plus réservables. Elles témoignent de l'activité de la communauté.
          </p>
        </div>
      </div>

      <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
        {items.map((sit) => {
          const dateLabel = sit.start_date && sit.end_date
            ? `${formatDate(sit.start_date)} → ${formatDate(sit.end_date)}`
            : sit.end_date
            ? `Jusqu'au ${formatDate(sit.end_date)}`
            : null;
          const to = `/annonces/${sit.slug || sit.id}`;
          return (
            <li key={sit.id}>
              <Link
                to={to}
                className="group block opacity-75 hover:opacity-100 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 rounded-2xl"
                aria-label={`${sit.title}, annonce passée`}
              >
                <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted border border-border">
                  {sit.cover_photo_url ? (
                    <img
                      src={sit.cover_photo_url}
                      alt=""
                      className="w-full h-full object-cover object-[center_30%] grayscale-[0.15] transition-transform duration-500 group-hover:scale-[1.03]"
                      loading="lazy"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder.svg"; }}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/40">
                      <PawPrint className="h-10 w-10" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-background/30 pointer-events-none" aria-hidden />
                  <span className="absolute top-3 left-3 rounded-full bg-background/95 text-foreground text-[10px] font-semibold uppercase tracking-[0.18em] px-2.5 py-1 border border-border shadow-sm">
                    Terminée
                  </span>
                </div>

                <div className="mt-3 px-0.5">
                  <p className="text-[11px] uppercase tracking-[0.16em] font-medium text-primary/70 truncate">
                    {sit.city || "France"}
                  </p>
                  <h3 className="mt-1 font-sans text-[14px] font-medium leading-snug text-foreground line-clamp-2">
                    {sit.title || "Sans titre"}
                  </h3>
                  {dateLabel && (
                    <p className="mt-1.5 text-[12px] text-muted-foreground">
                      {dateLabel}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
