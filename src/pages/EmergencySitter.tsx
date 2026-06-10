import { Zap, Bell, Home, Heart, Shield, Clock, Star, MapPin, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import PageMeta from "@/components/PageMeta";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";
import PageBreadcrumb from "@/components/seo/PageBreadcrumb";

const stepColors = [
  { bg: "bg-accent", text: "text-accent-foreground" },
  { bg: "bg-primary/10", text: "text-primary" },
  { bg: "bg-primary/5", text: "text-primary" },
];

const EmergencySitter = () => {
  const { t } = useTranslation();
  const tp = (k: string): string => t(`emergency_page.${k}`) as string;

  const steps = [
    { icon: Zap, title: tp("step1_title"), desc: tp("step1_desc") },
    { icon: Bell, title: tp("step2_title"), desc: tp("step2_desc") },
    { icon: Home, title: tp("step3_title"), desc: tp("step3_desc") },
  ];

  const ownerCards = [
    { icon: Clock, title: tp("owner_card1_title"), desc: tp("owner_card1_desc") },
    { icon: Shield, title: tp("owner_card2_title"), desc: tp("owner_card2_desc") },
    { icon: MapPin, title: tp("owner_card3_title"), desc: tp("owner_card3_desc") },
  ];

  const conditions = [tp("cond1"), tp("cond2"), tp("cond3"), tp("cond4"), tp("cond5")];
  const advantages = [tp("adv1"), tp("adv2"), tp("adv3"), tp("adv4")];

  const stories = [1, 2, 3, 4, 5, 6].map((n) => ({
    name: tp(`story${n}_name`),
    text: tp(`story${n}_text`),
  }));

  const comparisonRows = [1, 2, 3, 4, 5].map((n) => ({
    criteria: tp(`compare_row${n}_label`),
    classic: tp(`compare_row${n}_classic`),
    urgent: tp(`compare_row${n}_urgent`),
  }));

  const faqs = Array.from({ length: 12 }, (_, i) => ({
    q: tp(`faq${i + 1}_q`),
    a: tp(`faq${i + 1}_a`),
  }));

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Garde animaux d'urgence",
    url: "https://guardiens.fr/gardien-urgence",
    serviceType: ["pet sitting d'urgence", "garde d'animaux à domicile en urgence"],
    provider: { "@type": "Organization", name: "Guardiens", url: "https://guardiens.fr" },
    areaServed: { "@type": "Country", name: "France" },
    audience: { "@type": "Audience", audienceType: "Propriétaires d'animaux ayant un besoin de garde imprévu" },
    description:
      "Trouvez un gardien vérifié près de chez vous en moins de 24h pour vos animaux et votre maison en cas d'imprévu : hospitalisation, deuil, déplacement professionnel.",
  };

  return (
    <div className="min-h-screen bg-background">
      <PageMeta title={tp("meta_title")} description={tp("meta_description")} path="/gardien-urgence" />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(serviceJsonLd)}</script>
      </Helmet>
      <PublicHeader />

      <section className="bg-warning/15 border-b border-warning/25 py-3">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-sm font-medium text-warning-foreground">{tp("soon_title")}</p>
          <p className="text-xs text-muted-foreground mt-1">{tp("soon_subtitle")}</p>
        </div>
      </section>

      <PageBreadcrumb items={[{ label: tp("breadcrumb") }]} />

      <section className="relative overflow-hidden bg-gradient-to-br from-accent via-background to-primary/5 py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-accent-foreground/80 to-accent-foreground text-accent shadow-lg mb-6">
            <Zap className="h-8 w-8" fill="currentColor" />
          </div>
          <h1 className="font-heading text-3xl md:text-5xl font-bold tracking-tight mb-4">{tp("hero_title")}</h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">{tp("hero_lead")}</p>
          <p className="mt-3 text-base text-muted-foreground">{tp("hero_tagline")}</p>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="font-heading text-2xl font-bold text-center mb-10">{tp("how_it_works")}</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div key={i} className="text-center space-y-4">
              <div className={`inline-flex items-center justify-center h-14 w-14 rounded-full ${stepColors[i].bg} mx-auto`}>
                <step.icon className={`h-7 w-7 ${stepColors[i].text}`} />
              </div>
              <h3 className="font-heading font-semibold text-lg">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-background py-16 border-t border-border">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-10">
            <p className="text-xs text-muted-foreground tracking-[0.2em] uppercase mb-3">{tp("stories_kicker")}</p>
            <h2 className="font-heading text-2xl md:text-3xl font-bold mb-4">{tp("stories_title")}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">{tp("stories_lead")}</p>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {stories.map((s) => (
              <article key={s.name} className="bg-card border border-border rounded-lg p-6">
                <h3 className="font-heading font-semibold mb-3">{s.name}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-muted/30 py-16 border-t border-border">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="font-heading text-2xl md:text-3xl font-bold mb-3">{tp("compare_title")}</h2>
            <p className="text-muted-foreground">{tp("compare_lead")}</p>
          </div>
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-heading font-semibold">{tp("compare_th_criteria")}</th>
                  <th className="text-left p-4 font-heading font-semibold">{tp("compare_th_classic")}</th>
                  <th className="text-left p-4 font-heading font-semibold">{tp("compare_th_urgent")}</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, i) => (
                  <tr key={row.criteria} className={i > 0 ? "border-t border-border" : ""}>
                    <td className="p-4 font-medium">{row.criteria}</td>
                    <td className="p-4 text-muted-foreground">{row.classic}</td>
                    <td className="p-4 text-muted-foreground">{row.urgent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="bg-muted/50 py-16">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="font-heading text-2xl font-bold text-center mb-3">{tp("owner_title")}</h2>
          <p className="text-center text-muted-foreground mb-10">{tp("owner_subtitle")}</p>
          <div className="grid md:grid-cols-3 gap-6">
            {ownerCards.map((card, i) => (
              <div key={i} className="bg-card rounded-xl border border-border p-6 space-y-3">
                <card.icon className="h-6 w-6 text-primary" />
                <h3 className="font-heading font-semibold">{card.title}</h3>
                <p className="text-sm text-muted-foreground">{card.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link to="/inscription?role=owner">
              <Button size="lg" className="gap-2">
                <MapPin className="h-4 w-4" />
                {tp("owner_cta")}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="font-heading text-2xl font-bold text-center mb-3">{tp("sitter_title")}</h2>
        <p className="text-center text-muted-foreground mb-10">{tp("sitter_subtitle")}</p>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="font-heading font-semibold text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" /> {tp("conditions_title")}
            </h3>
            <ul className="space-y-2">
              {conditions.map((c, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-4">
            <h3 className="font-heading font-semibold text-lg flex items-center gap-2">
              <Star className="h-5 w-5 text-accent-foreground" /> {tp("advantages_title")}
            </h3>
            <ul className="space-y-2">
              {advantages.map((a, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4 text-accent-foreground shrink-0" />
                  {a}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="text-center mt-8">
          <Button variant="outline" size="lg" className="gap-2" disabled>
            <Zap className="h-4 w-4" />
            {tp("eligibility_soon")}
          </Button>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 pb-16">
        <div className="rounded-xl border border-border bg-accent/30 p-6 space-y-3">
          <h3 className="font-heading font-semibold flex items-center gap-2">
            <Heart className="h-5 w-5 text-destructive" />
            {tp("engagement_title")}
          </h3>
          <p className="text-sm text-muted-foreground">{tp("engagement_p1")}</p>
          <p className="text-sm text-muted-foreground">{tp("engagement_p2")}</p>
        </div>
      </section>

      <section className="bg-muted/50 py-16">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="font-heading text-2xl font-bold text-center mb-10">{tp("faq_title")}</h2>
          <Accordion type="single" collapsible className="space-y-2">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="bg-card border border-border rounded-xl px-4">
                <AccordionTrigger className="text-sm font-semibold text-left hover:no-underline py-4">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground pb-4">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 py-12 border-t border-border">
        <h2 className="font-heading text-xl font-bold text-center mb-3">{tp("cities_title")}</h2>
        <p className="text-sm text-muted-foreground text-center mb-6">{tp("cities_lead")}</p>
        <div className="flex flex-wrap justify-center gap-3">
          {[
            { label: "Lyon", to: "/house-sitting/lyon" },
            { label: "Annecy", to: "/house-sitting/annecy" },
            { label: "Grenoble", to: "/house-sitting/grenoble" },
            { label: "Chambéry", to: "/house-sitting/chambery" },
          ].map((city) => (
            <Link
              key={city.label}
              to={city.to}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm hover:border-primary/40 hover:text-primary transition-colors"
            >
              <MapPin className="h-3.5 w-3.5" /> {city.label}
            </Link>
          ))}
          <Link
            to="/tarifs"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm hover:border-primary/40 hover:text-primary transition-colors"
          >
            {tp("see_pricing")}
          </Link>
        </div>
      </section>

      <section className="py-12 bg-muted/30 border-t border-border">
        <div className="container max-w-4xl mx-auto px-4">
          <p className="text-xs text-muted-foreground tracking-[0.2em] uppercase mb-6 text-center">{tp("further_kicker")}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link to="/petites-missions" className="group block bg-card border border-border rounded-lg p-6 hover:border-primary transition">
              <p className="font-semibold mb-2 group-hover:text-primary transition">{tp("further1_title")}</p>
              <p className="text-sm text-muted-foreground">{tp("further1_desc")}</p>
            </Link>
            <Link to="/guides" className="group block bg-card border border-border rounded-lg p-6 hover:border-primary transition">
              <p className="font-semibold mb-2 group-hover:text-primary transition">{tp("further2_title")}</p>
              <p className="text-sm text-muted-foreground">{tp("further2_desc")}</p>
            </Link>
            <Link to="/actualites/devenir-gardien-urgence-guardiens" className="group block bg-card border border-border rounded-lg p-6 hover:border-primary transition">
              <p className="font-semibold mb-2 group-hover:text-primary transition">{tp("further3_title")}</p>
              <p className="text-sm text-muted-foreground">{tp("further3_desc")}</p>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-8 text-center border-t border-border">
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link to="/inscription?role=owner">
            <Button size="sm">{tp("footer_register")}</Button>
          </Link>
          <Button size="sm" variant="outline" disabled>
            {tp("footer_eligibility")}
          </Button>
          <Link to="/faq#gardien-d-urgence" className="text-sm text-primary hover:underline">{tp("footer_full_faq")}</Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
};

export default EmergencySitter;
