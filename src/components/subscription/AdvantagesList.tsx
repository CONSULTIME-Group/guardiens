import {
  Send, MessageSquare, Search, ToggleRight, Clock, Shield,
} from "lucide-react";

const ADVANTAGES = [
  { icon: Send, label: "Postuler aux gardes" },
  { icon: MessageSquare, label: "Messagerie gardes" },
  { icon: Search, label: "Apparaitre dans la recherche des proprietaires" },
  { icon: ToggleRight, label: 'Mode "Disponible"' },
  { icon: Clock, label: "Acces aux gardes longue duree" },
  { icon: Shield, label: "Ecussons et metriques de fiabilite" },
];

export default function AdvantagesList({ title = "Ce que vous debloquez" }: { title?: string }) {
  return (
    <div className="bg-muted/40 border border-border rounded-xl p-5">
      <p className="text-sm font-body font-semibold text-foreground mb-3">{title}</p>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {ADVANTAGES.map((a) => (
          <li key={a.label} className="flex items-center gap-2 text-sm font-body text-foreground/70">
            <a.icon className="h-4 w-4 text-primary shrink-0" />
            {a.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
