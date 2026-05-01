import React, { memo } from "react";

interface DashSectionProps {
  title: string;
  eyebrow?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Section homogène du dashboard.
 * - Eyebrow optionnel (étiquette discrète, uppercase tracking).
 * - Titre éditorial (font-heading) pour créer une vraie hiérarchie vs. les cartes internes.
 * - Description optionnelle pour contextualiser sans surcharger.
 */
const DashSection = memo(({ title, eyebrow, description, action, children }: DashSectionProps) => (
  <section className="animate-fade-in">
    <header className="flex items-end justify-between gap-3 mb-4">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[10px] uppercase tracking-[2px] text-muted-foreground font-sans font-semibold mb-1">
            {eyebrow}
          </p>
        )}
        <h2 className="font-heading text-lg md:text-xl font-bold text-foreground leading-tight">
          {title}
        </h2>
        {description && (
          <p className="text-xs text-muted-foreground font-sans mt-1 max-w-prose">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
    {children}
  </section>
));

DashSection.displayName = "DashSection";
export default DashSection;
