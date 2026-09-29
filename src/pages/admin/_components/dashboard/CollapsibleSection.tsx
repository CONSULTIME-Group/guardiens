import type { ReactNode } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface Props {
  title: string;
  children: ReactNode;
  /** Appelé à l'ouverture et à la fermeture (chargement différé). */
  onOpenChange?: (open: boolean) => void;
}

/**
 * Section repliable du tableau de bord admin, fermée par défaut.
 * Conserve l'esthétique Card (bordure, fond, ombre) sans header séparé.
 */
export const CollapsibleSection = ({ title, children, onOpenChange }: Props) => (
  <Accordion type="single" collapsible onValueChange={(v) => onOpenChange?.(v === "section")}>
    <AccordionItem
      value="section"
      className="rounded-xl border border-border bg-card text-card-foreground shadow-sm"
    >
      <AccordionTrigger className="px-6 py-4 text-base font-heading font-semibold hover:no-underline">
        {title}
      </AccordionTrigger>
      <AccordionContent className="px-6 pb-6">
        {children}
      </AccordionContent>
    </AccordionItem>
  </Accordion>
);
