import { RevealSection } from "@/components/ui/RevealSection";
import howtoStep1Webp448 from "@/assets/illustrations/howto-step-1-annonce-448.webp";
import howtoStep2Webp448 from "@/assets/illustrations/howto-step-2-rencontre-448.webp";

export function HowItWorksSection() {
  const columns = [
    { title: "Garde de maison", image: howtoStep1Webp448, alt: "Maison confiée à un gardien", steps: ["Vous publiez vos dates et vos animaux.", "Des gardiens postulent, vous les rencontrez avant de choisir.", "Vous partez l'esprit léger."] },
    { title: "Coup de main", image: howtoStep2Webp448, alt: "Deux personnes se rencontrent autour d'un service", steps: ["Vous décrivez votre besoin en une phrase.", "Les dix personnes disponibles les plus proches le reçoivent.", "Quelqu'un vous répond « Je peux », vous vous retrouvez."] },
  ];

  return (
    <section id="comment-ca-marche" className="py-[52px] md:py-20 bg-muted/30 scroll-mt-24">
      <div className="lp-wide">
        <RevealSection>
          <span className="text-xs tracking-widest uppercase text-primary font-body mb-4 block text-center">
            Deux façons de commencer
          </span>
          <h2 id="how-it-works" className="text-2xl md:text-5xl font-heading font-semibold leading-snug text-foreground text-center mb-4 scroll-mt-24">
            Comment ça marche
          </h2>
        </RevealSection>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {columns.map((column, columnIndex) => (
            <RevealSection key={column.title} delay={0.1 + columnIndex * 0.1}>
              <article className="h-full rounded-lg border border-border bg-card p-6 md:p-8">
                <img src={column.image} alt={column.alt} width={224} height={224} loading="lazy" className="mx-auto h-36 w-36 object-contain" />
                <h3 className="mt-4 font-heading text-2xl font-semibold text-foreground">{column.title}</h3>
                <ol className="mt-5 space-y-4">
                  {column.steps.map((step, index) => <li key={step} className="flex gap-3 text-foreground/75"><span className="font-semibold text-primary">{index + 1}.</span><span>{step}</span></li>)}
                </ol>
              </article>
            </RevealSection>
          ))}
        </div>
      </div>
    </section>
  );
}
