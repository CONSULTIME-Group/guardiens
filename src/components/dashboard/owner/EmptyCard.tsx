import React, { memo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface EmptyCardProps {
  icon?: React.ElementType;
  text: string;
  cta?: string;
  to?: string;
  hint?: string;
}

const EmptyCard = memo(({ icon: Icon, text, cta, to, hint }: EmptyCardProps) => (
  <div className="p-8 rounded-xl border border-dashed border-border bg-accent/30 text-center space-y-3">
    {Icon && (
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
        <Icon className="h-6 w-6 text-primary/60" />
      </div>
    )}
    <div>
      <p className="text-sm font-medium text-foreground/80">{text}</p>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
    {cta && to && <Link to={to}><Button size="sm" className="mt-1">{cta}</Button></Link>}
  </div>
));

EmptyCard.displayName = "EmptyCard";
export default EmptyCard;
