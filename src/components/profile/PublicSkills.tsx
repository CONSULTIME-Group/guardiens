import { Sprout, PawPrint, GraduationCap, Handshake } from "lucide-react";

const SKILL_META: Record<string, { label: string; icon: typeof Sprout }> = {
  jardin: { label: "Jardin", icon: Sprout },
  animaux: { label: "Animaux", icon: PawPrint },
  competences: { label: "Compétences & Savoirs", icon: GraduationCap },
  coups_de_main: { label: "Coups de main", icon: Handshake },
};

interface Props {
  skillCategories: string[];
  userId: string;
}

const PublicSkills = ({ skillCategories, userId }: Props) => {
  if (!skillCategories || skillCategories.length === 0) return null;

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 mt-6">
      <h3 className="text-sm font-heading font-semibold text-primary/80 uppercase tracking-widest mb-3">
        Disponible pour aider
      </h3>
      <div className="flex flex-wrap gap-2">
        {skillCategories.map(key => {
          const meta = SKILL_META[key];
          if (!meta) return null;
          const Icon = meta.icon;
          return (
            <span
              key={key}
              className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 text-primary px-3 py-1 text-sm"
            >
              <Icon className="h-3.5 w-3.5" />
              {meta.label}
            </span>
          );
        })}
      </div>
      <a
        href={`/messages?new=true&to=${userId}&context=entraide`}
        className="inline-block text-sm text-primary font-semibold underline underline-offset-4 mt-4"
      >
        Lui proposer un échange
      </a>
    </div>
  );
};

export default PublicSkills;
