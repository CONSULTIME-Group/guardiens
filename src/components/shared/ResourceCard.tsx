import { User, Home, Zap, PawPrint, HomeIcon, ChevronRight } from "lucide-react";

export interface ResourceItem {
  title: string;
  description: string;
  href: string;
  icon: "gardien" | "proprio" | "urgence" | "animal" | "maison";
}

const iconMap = {
  gardien: User,
  proprio: HomeIcon,
  urgence: Zap,
  animal: PawPrint,
  maison: Home,
};

const iconColorMap = {
  gardien: "text-primary",
  proprio: "text-blue-500",
  urgence: "text-amber-500",
  animal: "text-pink-500",
  maison: "text-emerald-600",
};

const ResourceCard = ({ title, description, href, icon }: ResourceItem) => {
  const Icon = iconMap[icon];
  const color = iconColorMap[icon];

  return (
    <a
      href={href}
      className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-primary/5 transition-colors group"
    >
      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold line-clamp-2">{title}</p>
        <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
    </a>
  );
};

export default ResourceCard;
