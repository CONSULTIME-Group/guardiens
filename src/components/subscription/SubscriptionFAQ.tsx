import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ_ITEMS = [
  {
    q: "Mon badge Fondateur disparait-il si je ne m'abonne pas ?",
    a: "Non. Le badge Fondateur est permanent a vie, quelle que soit votre situation.",
  },
  {
    q: "Puis-je resilier a tout moment ?",
    a: "Oui, sans frais ni preavis depuis votre espace abonnement.",
  },
  {
    q: "Que se passe-t-il le 1er janvier 2027 ?",
    a: "Renouvellement automatique a 9\u20AC/mois. Vous recevrez un email de rappel 30 jours avant.",
  },
];

export default function SubscriptionFAQ() {
  return (
    <Accordion type="single" collapsible className="w-full">
      {FAQ_ITEMS.map((item, i) => (
        <AccordionItem key={i} value={`faq-${i}`}>
          <AccordionTrigger className="text-sm font-body text-left">
            {item.q}
          </AccordionTrigger>
          <AccordionContent className="text-sm font-body text-muted-foreground">
            {item.a}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
