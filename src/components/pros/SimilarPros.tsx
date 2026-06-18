import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getCategoryByValue, getProInitials } from "@/lib/proCategories";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  currentId: string;
  category: string;
  city: string | null;
}

type Row = {
  id: string;
  slug: string;
  raison_sociale: string;
  category: string;
  city: string | null;
  logo_url: string | null;
};

export default function SimilarPros({ currentId, category, city }: Props) {
  const [items, setItems] = useState<Row[]>([]);

  useEffect(() => {
    (async () => {
      // Priorité : même catégorie + même ville, sinon même catégorie ailleurs
      let q = supabase
        .from("pro_profiles")
        .select("id, slug, raison_sociale, category, city, logo_url")
        .eq("status", "approved")
        .eq("category", category as any)
        .neq("id", currentId)
        .limit(3);
      if (city) q = q.eq("city", city);
      const { data } = await q;
      let rows = (data as any[]) ?? [];
      if (rows.length < 3) {
        const { data: extra } = await supabase
          .from("pro_profiles")
          .select("id, slug, raison_sociale, category, city, logo_url")
          .eq("status", "approved")
          .eq("category", category as any)
          .neq("id", currentId)
          .limit(6);
        const ids = new Set(rows.map((r) => r.id));
        for (const r of (extra as any[]) ?? []) {
          if (rows.length >= 3) break;
          if (!ids.has(r.id)) rows.push(r);
        }
      }
      setItems(rows);
    })();
  }, [currentId, category, city]);

  if (items.length === 0) return null;

  return (
    <section className="mt-10" aria-labelledby="similar-pros-heading">
      <h2 id="similar-pros-heading" className="text-xl font-semibold mb-3">
        Établissements similaires
      </h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((p) => {
          const cat = getCategoryByValue(p.category);
          return (
            <Link key={p.id} to={`/pros/${p.slug}`} className="group">
              <Card className="h-full hover:shadow-md transition">
                <CardContent className="p-4 flex items-center gap-3">
                  {p.logo_url ? (
                    <img
                      src={p.logo_url}
                      alt=""
                      className="w-12 h-12 rounded-lg object-contain bg-muted shrink-0"
                      loading="lazy"
                    />
                  ) : (
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center font-semibold shrink-0 ${cat?.placeholderClass ?? "bg-muted text-muted-foreground"}`}
                      aria-hidden="true"
                    >
                      {getProInitials(p.raison_sociale)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-medium truncate group-hover:underline">{p.raison_sociale}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {cat?.label}{p.city ? ` · ${p.city}` : ""}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
