import { useState } from "react";
import ResourceCard, { type ResourceItem } from "./ResourceCard";

interface ResourceSectionProps {
  title: string;
  resources: ResourceItem[];
  maxVisible?: number;
}

const ResourceSection = ({ title, resources, maxVisible = 3 }: ResourceSectionProps) => {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? resources : resources.slice(0, maxVisible);
  const hasMore = resources.length > maxVisible;

  return (
    <div className="rounded-xl bg-muted/40 p-5 space-y-3">
      <h3 className="font-heading text-sm font-semibold text-foreground">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {visible.map((r) => (
          <ResourceCard key={r.href} {...r} />
        ))}
      </div>
      {hasMore && !expanded && (
        <div className="text-center pt-1">
          <button
            onClick={() => setExpanded(true)}
            className="text-xs text-primary hover:underline font-medium"
          >
            Voir tous les conseils →
          </button>
        </div>
      )}
    </div>
  );
};

export default ResourceSection;
