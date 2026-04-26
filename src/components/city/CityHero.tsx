import { Link } from "react-router-dom";
import { slugify } from "@/lib/normalize";
import { getOptimizedImageUrl } from "@/lib/imageOptim";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck, Siren, BadgeCheck, Mountain } from "lucide-react";
interface CityHeroProps {
  city: string;
  h1Title: string;
  subtitle: string;
  heroImage?: string;
  heroAlt: string;
  department?: string;
  departmentSlug?: string;
}

const SB_INLINE = "https://erhccyqevdyevpyctsjj.supabase.co/storage/v1/object/public/property-photos/articles-inline";

export const CITY_HERO_IMAGES: Record<string, string> = {
  annecy: `${SB_INLINE}/hero-annecy.webp`,
  lyon: `${SB_INLINE}/hero-lyon.webp`,
};

const trustSignals = [
  { icon: BadgeCheck, label: "Identité vérifiée" },
  { icon: Siren, label: "Gardiens d'urgence" },
  { icon: ShieldCheck, label: "Zéro frais propriétaire" },
  { icon: Mountain, label: "Esprit AURA" },
];

export default function CityHero({
  city,
  h1Title,
  subtitle,
  heroImage,
  heroAlt,
  department,
  departmentSlug,
}: CityHeroProps) {
  const cityKey = slugify(city);
  const bgImage = heroImage || CITY_HERO_IMAGES[cityKey];

  return (
    <>
      {/* Hero */}
      <section className="relative w-full min-h-[420px] md:min-h-[500px] flex items-end overflow-hidden">
        {bgImage ? (
          <img
            src={getOptimizedImageUrl(bgImage, 1200, 75)}
            alt={heroAlt}
            className="absolute inset-0 w-full h-full object-cover"
            width={1920}
            height={800}
            loading="eager"
            decoding="async"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[hsl(210,50%,15%)] to-[hsl(153,42%,20%)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />

        <div className="relative z-10 w-full max-w-6xl mx-auto px-4 pb-10 pt-24 md:pb-14">
          {/* Breadcrumb */}
          <nav className="text-sm text-white/70 mb-4" aria-label="Breadcrumb">
            <ol className="flex items-center gap-1.5 flex-wrap" itemScope itemType="https://schema.org/BreadcrumbList">
              <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                <Link to="/" className="hover:text-white transition-colors" itemProp="item">
                  <span itemProp="name">Guardiens</span>
                </Link>
                <meta itemProp="position" content="1" />
              </li>
              <li className="text-white/40">/</li>
              {department && (
                <>
                  <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                    {departmentSlug ? (
                      <Link to={`/departement/${departmentSlug}`} className="hover:text-white transition-colors" itemProp="item">
                        <span itemProp="name">{department}</span>
                      </Link>
                    ) : (
                      <span itemProp="name">{department}</span>
                    )}
                    <meta itemProp="position" content="2" />
                  </li>
                  <li className="text-white/40">/</li>
                </>
              )}
              <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                <span itemProp="name" className="text-white font-medium">{city}</span>
                <meta itemProp="position" content={department ? "3" : "2"} />
              </li>
            </ol>
          </nav>

          <h1 className="font-heading text-3xl md:text-5xl font-bold text-white mb-3 leading-tight max-w-3xl drop-shadow-lg">
            {h1Title}
          </h1>
          <p className="text-lg md:text-xl text-white/85 max-w-2xl mb-6">
            {subtitle}
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link to="/inscription">
              <Button size="lg" className="gap-2 bg-white text-foreground hover:bg-white/90 font-semibold shadow-lg">
                Trouver mon gardien
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/inscription">
              <Button size="lg" variant="outline" className="gap-2 border-white text-white bg-white/15 backdrop-blur-sm hover:bg-white/25">
                Devenir gardien à {city}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Trust signals bar */}
      <section className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex flex-wrap justify-center gap-6 md:gap-10">
            {trustSignals.map((s) => (
              <div key={s.label} className="flex items-center gap-2 text-sm text-muted-foreground">
                <s.icon className="h-4.5 w-4.5 text-primary" />
                <span className="font-medium">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
