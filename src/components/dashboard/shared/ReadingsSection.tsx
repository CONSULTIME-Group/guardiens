/**
 * ReadingsSection (vague 16) — Le journal du coin, dernière section des deux
 * dashboards.
 *
 * Trio d'en-tête (eyebrow + titre Playfair + sous-titre optionnel), grille
 * compacte des 3 derniers articles publiés pour le rôle courant, puis une
 * rangée de pilules secondaires vers les autres portes d'entrée
 * éditoriales du site.
 *
 * Aucun bouton primaire (la star garde le seul primaire de l'écran). Aucun
 * empty-state si articles vides, seuls les liens texte subsistent.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getOptimizedImageUrl } from "@/lib/imageOptim";
import { SectionHeader } from "../sitter/SitterMatchSection";

type Article = {
  id: string;
  title: string;
  slug: string;
  cover_image_url: string | null;
};

interface ReadingsSectionProps {
  role: "owner" | "sitter";
}

const CATEGORY_BY_ROLE: Record<ReadingsSectionProps["role"], string[]> = {
  sitter: ["conseil_gardien", "conseil"],
  owner: ["conseil_proprio", "conseil"],
};

const PILLS = [
  { label: "Fiches races", to: "/races" },
  { label: "Guides pratiques", to: "/guides" },
  { label: "Questions de la communauté", to: "/petites-missions?tab=questions" },
  { label: "Tous les conseils", to: "/actualites" },
];

const ReadingsSection = ({ role }: ReadingsSectionProps) => {
  const [articles, setArticles] = useState<Article[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const categories = CATEGORY_BY_ROLE[role];
    supabase
      .from("articles")
      .select("id, title, slug, cover_image_url")
      .eq("published", true)
      .in("category", categories)
      .order("published_at", { ascending: false })
      .limit(3)
      .then(({ data }) => {
        if (cancelled) return;
        setArticles((data as Article[] | null) ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [role]);

  const hasArticles = (articles?.length ?? 0) > 0;

  return (
    <section aria-label="Le journal du coin">
      <SectionHeader
        eyebrow="Le journal du coin"
        title="Des histoires et des conseils d'ici."
      />

      {hasArticles && (
        <ul
          role="list"
          className="grid grid-cols-2 md:grid-cols-3"
          style={{ gap: "14px" }}
        >
          {articles!.map((a) => (
            <li key={a.id} role="listitem">
              <Link
                to={`/actualites/${a.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-primary/30"
              >
                <div
                  aria-hidden="true"
                  className="w-full overflow-hidden bg-muted"
                  style={{ height: "90px" }}
                >
                  {a.cover_image_url ? (
                    <img
                      src={getOptimizedImageUrl(a.cover_image_url, 320, 78)}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    />
                  ) : (
                    <div
                      className="h-full w-full"
                      style={{
                        background:
                          "linear-gradient(135deg, hsl(var(--muted)) 0%, hsl(var(--accent) / 0.4) 100%)",
                      }}
                    />
                  )}
                </div>
                <div className="flex-1" style={{ padding: "14px" }}>
                  <p
                    className="font-sans text-foreground line-clamp-2"
                    style={{ fontSize: "14px", fontWeight: 600, lineHeight: 1.35 }}
                  >
                    {a.title}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div
        className="flex flex-wrap"
        style={{ gap: "8px", marginTop: hasArticles ? "22px" : "0" }}
      >
        {PILLS.map((p) => (
          <Link
            key={p.to}
            to={p.to}
            className="inline-flex items-center rounded-full border border-border bg-card text-foreground transition-colors hover:border-primary/30 hover:text-primary"
            style={{
              padding: "8px 14px",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            {p.label}
          </Link>
        ))}
      </div>
    </section>
  );
};

export default ReadingsSection;
