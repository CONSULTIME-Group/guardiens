import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Building2, Compass, Plus, ShieldCheck, Siren, Scale, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { MarkdownBody } from "@/components/MarkdownBody";
import PageBreadcrumb from "@/components/seo/PageBreadcrumb";
import CitySittersGrid from "@/components/city/CitySittersGrid";
import NearbyCityLinks from "@/components/seo/NearbyCityLinks";
import { useAuth } from "@/contexts/AuthContext";
import { ownerPublishHref } from "@/lib/almaVisitorSearch";
import { trackEvent } from "@/lib/analytics";
import { departmentIn } from "@/lib/departmentGrammar";
import { wikimediaThumb } from "@/lib/wikimediaThumb";
import { LEGAL_HOME_OWNER_ARTICLE_SLUG } from "@/components/articles/ArticleRenderer";
import { cityAt, cityOf } from "@/lib/cityGrammar";
import { pilotProofLine, type PilotGuide } from "@/data/cityPilotV2";

/**
 * Lot VIL1 (16/11/2026) : gabarit ville v2, maquette Claude Design
 * « Pages villes v2 » validée par Jérémie (« parfait go »). Rendu réservé
 * aux slugs de CITY_PILOT_V2, servis par la base. Ordre :
 * écran 1 (fil d'Ariane, H1, intro « home sitting », preuve, Publier ma
 * garde), gardiens, étapes, guide local sourcé (sinon corps éditorial en
 * base), liens, FAQ unique, appel final.
 */

export interface CityPilotV2Page {
  slug: string;
  city: string;
  department: string | null;
  h1_title: string;
  cover_image_url?: string | null;
  hero_image_alt?: string | null;
  sitter_count?: number | null;
  nearby_sitter_count?: number | null;
  aggregate_cities?: string[] | null;
  latitude?: number | null;
  longitude?: number | null;
}

interface Props {
  page: CityPilotV2Page;
  /** Intro de l'écran 1, qui commence par « Le home sitting à {ville} ». */
  intro: string;
  guide: PilotGuide | null;
  faq: { q: string; a: string }[];
  /**
   * Corps éditorial (base ou contenu statique), rendu après le guide
   * sourcé ou à sa place.
   */
  editorial: ReactNode | null;
  /** Image de tête : vignette Wikimedia en base, ou image importée. */
  cover?: { src: string; alt: string; original?: string | null } | null;
  departmentCode: string | null;
  departmentPage: { slug: string; department: string } | null;
  cityGuide: { slug: string; city: string } | null;
}

const STEPS = [
  { title: "Publiez votre garde", text: "Votre logement, vos animaux et vos dates." },
  { title: "Les gardiens proches postulent", text: "Votre annonce part par email aux gardiens de votre secteur. Lisez leurs profils et leurs avis." },
  { title: "Échangez et choisissez", text: "Par la messagerie, et en vous rencontrant avant si vous le souhaitez." },
  { title: "Partez l'esprit léger", text: "Votre gardien s'installe et suit le guide de la maison." },
];

const CityPilotV2Body = ({ page, intro, guide, faq, editorial, cover, departmentCode, departmentPage, cityGuide }: Props) => {
  const { user } = useAuth();
  const publishHref = ownerPublishHref(!user, "ville");
  const proof = pilotProofLine(page.city, page.sitter_count ?? 0, page.nearby_sitter_count ?? 0);

  const onPublish = (place: "hero" | "final") => {
    try {
      void trackEvent("owner_publish_bar_clicked", {
        source: "city_page_v2",
        metadata: { city: page.slug, place },
      });
    } catch {
      /* mesure facultative */
    }
  };

  return (
    <div className="min-h-screen bg-background" data-city-template="v2">
      <PageBreadcrumb items={[{ label: "Nos villes", href: "/house-sitting" }, { label: page.city }]} />

      {/* Écran 1 */}
      <section className="max-w-5xl mx-auto px-4 pt-4 pb-10" data-testid="city-v2-hero">
        <h1 className="font-heading text-3xl md:text-5xl font-bold text-foreground mb-4">{page.h1_title}</h1>
        <p className="text-lg text-foreground/80 max-w-3xl leading-relaxed mb-5" data-testid="city-v2-intro">
          {intro}
        </p>
        {proof && (
          <p className="inline-flex items-center gap-2 rounded-full bg-pastel-sage px-4 py-2 text-[15px] font-medium text-pastel-sage-ink mb-6" data-testid="city-v2-proof">
            <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
            {proof}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link to={publishHref} onClick={() => onPublish("hero")} data-testid="city-v2-publish">
            <Button size="lg" className="w-full sm:w-auto min-h-11 gap-2">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Publier ma garde
            </Button>
          </Link>
          <p className="text-sm text-muted-foreground sm:self-center">Guardiens est gratuit.</p>
        </div>
        {cover && (
          <img
            src={cover.src}
            alt={cover.alt}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            onError={(e) => {
              // Vignette refusée : l'original prend le relais une fois.
              const img = e.currentTarget as HTMLImageElement;
              if (img.dataset.fallback !== "1" && cover.original && img.src !== cover.original) {
                img.dataset.fallback = "1";
                img.src = cover.original;
                return;
              }
              img.style.display = "none";
            }}
            className="w-full h-48 md:h-72 object-cover rounded-2xl mt-8 shadow-sm"
          />
        )}
      </section>

      {/* Gardiens */}
      <CitySittersGrid
        variant="v2"
        city={page.city}
        citySlug={page.slug}
        aggregateCities={page.aggregate_cities ?? null}
        departmentCode={departmentCode}
        cityLat={page.latitude ?? null}
        cityLng={page.longitude ?? null}
      />

      {/* Étapes */}
      <section className="max-w-5xl mx-auto px-4 py-10 border-t border-border" data-testid="city-v2-steps">
        <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-6">
          Comment se passe une garde {cityAt(page.city)}
        </h2>
        <ol className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-2xl border border-border bg-card p-4">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-pastel-honey text-pastel-honey-ink font-semibold mb-3">
                {i + 1}
              </span>
              <p className="font-semibold text-foreground mb-1">{s.title}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Guide local sourcé */}
      {guide && (
        <section className="max-w-3xl mx-auto px-4 py-10 border-t border-border" data-testid="city-v2-guide">
          <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-3">{guide.title}</h2>
          <p className="text-foreground/80 leading-relaxed mb-6">{guide.intro}</p>
          <h3 className="font-heading text-xl font-semibold text-foreground mb-3">Où se promener</h3>
          <ul className="space-y-4 mb-8">
            {guide.places.map((p) => (
              <li key={p.name}>
                <p className="font-semibold text-foreground">{p.name}</p>
                <p className="text-foreground/80 leading-relaxed">{p.text}</p>
              </li>
            ))}
          </ul>
          <h3 className="font-heading text-xl font-semibold text-foreground mb-3">Les règles à connaître</h3>
          <ul className="list-disc pl-5 space-y-2 mb-8 text-foreground/80">
            {guide.rules.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          {guide.tips.length > 0 && (
            <>
              <h3 className="font-heading text-xl font-semibold text-foreground mb-3">Bon à savoir</h3>
              <ul className="list-disc pl-5 space-y-2 mb-8 text-foreground/80">
                {guide.tips.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </>
          )}
          <div className="rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground" data-testid="city-v2-sources">
            <p className="font-medium text-foreground mb-2">Sources vérifiées le {guide.verifiedOn}</p>
            <ul className="space-y-1">
              {guide.sources.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Corps éditorial local (base ou statique), sections redondantes retirées */}
      {editorial && (
        <section className="max-w-3xl mx-auto px-4 py-10 border-t border-border" data-testid="city-v2-editorial">
          {editorial}
        </section>
      )}

      {/* Liens */}
      <section className="max-w-5xl mx-auto px-4 py-8 border-t border-border" data-testid="city-v2-links">
        <h2 className="font-heading text-2xl font-bold text-foreground mb-4">Pour aller plus loin</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <LinkCard to={`/recherche-gardiens?ville=${encodeURIComponent(page.city)}`} icon={Search} title={`Les gardiens autour ${cityOf(page.city)}`} text="Profils, avis et rayon d'intervention" />
          {departmentPage && (
            <LinkCard to={`/departement/${departmentPage.slug}`} icon={Building2} title={`House-sitting ${departmentIn(departmentPage.department)}`} text="Toutes les villes du département" />
          )}
          {cityGuide && (
            <LinkCard to={`/guides/${cityGuide.slug}`} icon={Compass} title={`Guide local de ${cityGuide.city}`} text="Parcs, balades et adresses utiles" />
          )}
          <LinkCard to="/gardien-urgence" icon={Siren} title="Le réseau des gardiens d'urgence" text="Ouverture prochaine" />
          <LinkCard to={`/actualites/${LEGAL_HOME_OWNER_ARTICLE_SLUG}`} icon={Scale} title="Le cadre juridique du house-sitting" text="Ce que dit le droit français" />
        </div>
      </section>

      <NearbyCityLinks department={page.department ?? ""} currentSlug={page.slug} />

      {/* FAQ unique */}
      <section className="max-w-5xl mx-auto px-4 py-10 border-t border-border" data-testid="city-v2-faq">
        <h2 className="font-heading text-2xl font-bold text-foreground mb-6">
          Questions fréquentes sur le home sitting {cityAt(page.city)}
        </h2>
        <Accordion type="single" collapsible className="w-full">
          {faq.map((f, i) => (
            <AccordionItem key={f.q} value={`v2-faq-${i}`}>
              <AccordionTrigger className="group text-left min-h-11 [&>svg]:hidden">
                <span className="flex w-full items-center justify-between gap-4">
                  <span>{f.q}</span>
                  <Plus className="h-5 w-5 shrink-0 text-primary transition-transform group-data-[state=open]:rotate-45" aria-hidden="true" data-testid="city-v2-faq-plus" />
                </span>
              </AccordionTrigger>
              <AccordionContent>{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* Appel final */}
      <section className="max-w-5xl mx-auto px-4 py-14 text-center">
        <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-3">
          Vous partez bientôt {cityOf(page.city)} ?
        </h2>
        <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
          Décrivez votre logement, vos animaux et vos dates : votre annonce part aux gardiens proches de chez vous.
        </p>
        <Link to={publishHref} onClick={() => onPublish("final")}>
          <Button size="lg" className="min-h-11 gap-2">
            Publier ma garde
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </Link>
        <p className="text-xs text-muted-foreground mt-3">Guardiens est gratuit.</p>
      </section>
    </div>
  );
};

function LinkCard({ to, icon: Icon, title, text }: { to: string; icon: typeof Search; title: string; text: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 min-h-11 hover:shadow-md transition-shadow">
      <Icon className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />
      <span className="min-w-0">
        <span className="block font-semibold text-sm text-foreground">{title}</span>
        <span className="block text-xs text-muted-foreground">{text}</span>
      </span>
      <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto shrink-0" aria-hidden="true" />
    </Link>
  );
}

export default CityPilotV2Body;
