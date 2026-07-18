import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { AlmaAvatar } from "@/components/ai/alma/AlmaAvatar";
import { Badge } from "@/components/ui/badge";

type FactType =
  | "pet_care_tip"
  | "dog_behavior_tip"
  | "cat_behavior_tip"
  | "home_care_tip"
  | "seasonal_advice"
  | "breed_did_you_know"
  | "mutual_aid_tip";

interface Tip {
  id: string;
  fact_type: FactType | null;
  content: string | null;
  source_url: string | null;
  context_filter: Record<string, unknown> | null;
}

const TYPE_KEYS: Record<string, string> = {
  pet_care_tip: "landing.alma_tips.types.pet_care_tip",
  dog_behavior_tip: "landing.alma_tips.types.dog_behavior_tip",
  cat_behavior_tip: "landing.alma_tips.types.cat_behavior_tip",
  home_care_tip: "landing.alma_tips.types.home_care_tip",
  seasonal_advice: "landing.alma_tips.types.seasonal_advice",
  breed_did_you_know: "landing.alma_tips.types.breed_did_you_know",
  mutual_aid_tip: "landing.alma_tips.types.mutual_aid_tip",
};

function pickVaried(tips: Tip[], count: number): Tip[] {
  const byType = new Map<string, Tip[]>();
  for (const t of tips) {
    const key = t.fact_type || "unknown";
    if (!byType.has(key)) byType.set(key, []);
    byType.get(key)!.push(t);
  }
  const result: Tip[] = [];
  const types = Array.from(byType.keys());
  for (const type of types) {
    if (result.length >= count) break;
    const list = byType.get(type);
    if (list && list.length > 0) result.push(list[0]);
  }
  for (const t of tips) {
    if (result.length >= count) break;
    if (!result.some((r) => r.id === t.id)) result.push(t);
  }
  return result;
}

export default function AlmaTipsTeaser() {
  const { t } = useTranslation();
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("alma_public_tips" as any)
        .select("id, fact_type, content, source_url, context_filter")
        .limit(60);
      if (cancelled) return;
      const rows = ((data as unknown as Tip[]) || []).filter((tip) => !!tip.content);
      const varied = pickVaried(rows, 6);
      setTips(varied);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return null;
  if (tips.length === 0) return null;

  const labelFor = (factType: string | null): string => {
    const fallback = t("landing.alma_tips.fallback_label");
    if (!factType) return fallback;
    const key = TYPE_KEYS[factType];
    if (!key) return factType || fallback;
    const translated = t(key);
    return translated === key ? factType : translated;
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: t("landing.alma_tips.title"),
    numberOfItems: tips.length,
    itemListElement: tips.map((tip, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "CreativeWork",
        name: labelFor(tip.fact_type),
        text: tip.content,
      },
    })),
  };

  return (
    <>
      <section className="py-10 md:py-20 bg-background scroll-mt-24" aria-labelledby="alma-tips-heading">
        <div className="max-w-6xl mx-auto px-5 sm:px-6">
          <div className="mb-8 md:mb-10">
            <p className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-primary font-semibold font-body mb-3">
              {t("landing.alma_tips.eyebrow")}
            </p>
            <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-6">
              <div className="shrink-0">
                <AlmaAvatar size={40} mood="gentle" aria-hidden />
              </div>
              <div className="min-w-0">
                <h2 id="alma-tips-heading" className="font-heading text-3xl md:text-4xl font-semibold text-foreground leading-tight mb-3">
                  {t("landing.alma_tips.title")}
                </h2>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl">
                  {t("landing.alma_tips.intro")}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {tips.map((tip) => (
              <div
                key={tip.id}
                className="bg-card border border-border rounded-2xl p-5 md:p-6 flex flex-col gap-3"
              >
                <Badge variant="secondary" className="w-fit text-[11px]">
                  {labelFor(tip.fact_type)}
                </Badge>
                <p className="text-sm md:text-base text-foreground leading-relaxed">
                  {tip.content}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 md:mt-10 text-center">
            <Link
              to="/conseils"
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors font-body text-sm font-medium"
            >
              {t("landing.alma_tips.cta")} <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </section>

      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
    </>
  );
}
