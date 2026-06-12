import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { ENTRAIDE_HEADER_URL } from "./constants";

interface Props {
  needCount?: number;
  offerCount?: number;
  helperCount?: number;
  onPropose?: () => void;
}

const MissionsHero = ({ needCount = 0, offerCount = 0, helperCount = 0, onPropose }: Props) => {
  const { t } = useTranslation();
  const tp = (k: string, opts?: any) => t(k, opts) as string;
  const segments: { value: number; text: string }[] = [];
  if (needCount > 0) segments.push({ value: needCount, text: tp(needCount > 1 ? "missions_hero.seg_demands_other" : "missions_hero.seg_demands_one", { count: needCount }) });
  if (offerCount > 0) segments.push({ value: offerCount, text: tp(offerCount > 1 ? "missions_hero.seg_offers_other" : "missions_hero.seg_offers_one", { count: offerCount }) });
  if (helperCount > 0) segments.push({ value: helperCount, text: tp(helperCount > 1 ? "missions_hero.seg_helpers_other" : "missions_hero.seg_helpers_one", { count: helperCount }) });

  return (
    <section className="relative overflow-hidden border-b border-border/40">
      {/* Background image: desktop only, mobile reste épuré */}
      <div className="absolute inset-0 hidden md:block">
        <img src={ENTRAIDE_HEADER_URL} alt="" loading="eager" width={1600} height={400} className="w-full h-full object-cover object-right" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/50" />
      </div>
      <div className="relative max-w-6xl mx-auto px-4 py-6 md:py-14 text-center md:text-center space-y-3 md:space-y-4">
        <h1 className="font-heading text-2xl md:text-4xl font-bold text-foreground leading-tight">
          {tp("missions_hero.title")}
        </h1>
        <p className="hidden md:block text-base text-muted-foreground max-w-xl mx-auto">
          {tp("missions_hero.subtitle")}
        </p>
        {segments.length > 0 && (
          <p className="hidden md:flex text-xs text-muted-foreground flex-wrap items-center justify-center gap-x-2 gap-y-1">
            {segments.map((s, i) => {
              const parts = s.text.split(" ");
              return (
                <span key={i} className="inline-flex items-center">
                  {i > 0 && <span className="mx-2 text-muted-foreground/60">·</span>}
                  <span className="font-semibold text-foreground mr-1">{parts[0]}</span>
                  {parts.slice(1).join(" ")}
                </span>
              );
            })}
          </p>
        )}
        <div className="flex flex-col sm:flex-row items-center gap-3 justify-center pt-1">
          <Link to="/petites-missions/creer" className="w-full sm:w-auto">
            <Button variant="hero" size="lg" className="w-full sm:w-auto">
              {tp("missions_hero.cta_publish")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          {onPropose && (
            <button
              type="button"
              onClick={onPropose}
              className="hidden md:inline-block text-sm text-primary font-semibold hover:underline"
            >
              {tp("missions_hero.cta_propose")}
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

export default MissionsHero;
