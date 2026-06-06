import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const ITEMS = [
  {
    q: "Puis-je résilier à tout moment ?",
    a: "Oui, sans frais ni préavis. Depuis « Gérer mon abonnement », vous pouvez annuler en un clic, vous gardez l'accès jusqu'à la fin de la période payée.",
  },
  {
    q: "Que se passe-t-il quand mon accès se termine ?",
    a: "Votre profil n'apparaît plus dans la recherche et vos candidatures sont suspendues. Vous pouvez reprendre quand vous le souhaitez : votre profil, vos avis et votre historique sont conservés.",
  },
  {
    q: "Mes informations de paiement sont-elles sûres ?",
    a: "Le paiement est entièrement géré par Stripe, leader européen. Guardiens ne stocke aucune donnée bancaire.",
  },
  {
    q: "Puis-je changer de formule en cours de route ?",
    a: "Oui. Depuis « Gérer mon abonnement », vous pouvez basculer entre les formules à tout moment.",
  },
  {
    q: "Et l'entraide entre membres ?",
    a: "L'entraide (petites missions sans nuitée) reste libre pour tout le monde, abonné ou non. Aucun abonnement requis pour proposer ou rendre service.",
  },
];

export default function MySubscriptionFAQ() {
  return (
    <div className="bg-card border border-border rounded-xl p-5 sm:p-6 space-y-3">
      <p className="text-xs uppercase tracking-widest text-muted-foreground font-body">
        Questions fréquentes
      </p>
      <Accordion type="single" collapsible className="w-full">
        {ITEMS.map((item, i) => (
          <AccordionItem key={i} value={`faq-${i}`} className="border-border last:border-b-0">
            <AccordionTrigger className="text-sm font-body text-left hover:no-underline">
              {item.q}
            </AccordionTrigger>
            <AccordionContent className="text-sm font-body text-muted-foreground leading-relaxed">
              {item.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
