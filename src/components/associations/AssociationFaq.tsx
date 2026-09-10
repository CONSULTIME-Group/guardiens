import { Link } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { AssociationFaqItem } from "@/lib/associationFaq";

/** Rend la réponse en insérant le lien interne quand la question en porte un. */
const Answer = ({ item }: { item: AssociationFaqItem }) => {
  if (!item.link || !item.answer.includes(item.link.text)) {
    return <>{item.answer}</>;
  }
  const [before, after] = item.answer.split(item.link.text);
  return (
    <>
      {before}
      <Link to={item.link.to} className="text-primary underline underline-offset-4">
        {item.link.text}
      </Link>
      {after}
    </>
  );
};

export function AssociationFaq({
  items,
  title = "Questions fréquentes",
  className = "",
}: {
  items: AssociationFaqItem[];
  title?: string;
  className?: string;
}) {
  if (items.length === 0) return null;
  return (
    <section className={`mt-10 ${className}`} aria-labelledby="association-faq-title">
      <h2
        id="association-faq-title"
        className="font-heading text-xl md:text-2xl font-semibold text-foreground"
      >
        {title}
      </h2>
      <Accordion type="single" collapsible className="mt-4">
        {items.map((item, i) => (
          <AccordionItem key={item.question} value={`faq-${i}`}>
            <AccordionTrigger className="text-left text-sm md:text-base">
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
              <Answer item={item} />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
