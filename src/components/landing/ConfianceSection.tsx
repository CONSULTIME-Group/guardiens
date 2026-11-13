import { RevealSection } from "@/components/ui/RevealSection";

export function ConfianceSection() {
  const pillars = [
    ["La proximité réelle", "Les dix personnes les plus proches reçoivent votre besoin, et la carte montre qui vit autour de vous."],
    ["Se voir, si vous le souhaitez", "Autour d'un café ou d'une visite avant une garde, quand vous en avez envie tous les deux. Après un coup de main, nous vous demandons si vous vous êtes vus."],
  ["La confiance vérifiée", "Écusson « Identité vérifiée » et avis croisés publiés après les gardes. Guardiens est gratuit pour tous les membres."],
  ];

  return (
    <section id="confiance" className="bg-background py-[52px] md:py-20 scroll-mt-24" aria-labelledby="trust-heading">
      <div className="lp-wide">
        <RevealSection className="text-center max-w-3xl mx-auto mb-8 md:mb-16">
          <p className="text-xs md:text-[13px] tracking-[0.2em] uppercase text-primary font-body font-medium">
            Les repères essentiels
          </p>
          <h2 id="trust-heading" className="mt-4 font-heading text-3xl font-semibold leading-tight text-foreground md:text-5xl">
            Trois repères pour se faire confiance
          </h2>
        </RevealSection>

        <div className="grid gap-6 md:grid-cols-3">
          {pillars.map(([title, text], index) => <RevealSection key={title} delay={0.1 + index * 0.1}><article className="h-full border-t border-border pt-5"><h3 className="font-heading text-xl font-semibold text-foreground">{title}</h3><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p></article></RevealSection>)}
        </div>


      </div>
    </section>
  );
}
