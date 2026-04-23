import { forwardRef } from "react";
import { CheckCircle2, Briefcase } from "lucide-react";

interface Experience {
  id: string;
  platform_name: string;
  summary: string;
  animal_types: string;
  city: string | null;
  country: string | null;
  duration: string;
  experience_date: string;
  verification_status: string;
}

interface PublicExperiencesProps {
  experiences: Experience[];
}

const PublicExperiences = forwardRef<HTMLDivElement, PublicExperiencesProps>(
  function PublicExperiences({ experiences }, ref) {
    const verified = experiences.filter(e => e.verification_status === "verified");
    if (verified.length === 0) return null;

    return (
      <div ref={ref} className="space-y-3">
        <h3 className="font-heading font-semibold text-sm flex items-center gap-1.5">
          <Briefcase className="h-4 w-4" /> Expériences vérifiées sur d'autres plateformes
        </h3>
        <div className="space-y-3">
          {verified.map(exp => (
            <div key={exp.id} className="p-4 rounded-xl bg-card border border-border space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{exp.platform_name}</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                  <CheckCircle2 className="h-3 w-3" /> Expérience vérifiée
                </span>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{exp.summary}</p>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>{exp.animal_types}</span>
                {exp.city && <span>· {exp.city}{exp.country ? `, ${exp.country}` : ""}</span>}
                <span>· {exp.duration}</span>
                {exp.experience_date && <span>· {exp.experience_date}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
);

export default PublicExperiences;
