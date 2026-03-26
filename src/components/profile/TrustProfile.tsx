import { Link } from "react-router-dom";
import { CheckCircle2, Circle, ShieldCheck } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

interface Props {
  emailVerified: boolean;
  identityVerified: boolean;
  hasAvatar: boolean;
  profileCompletion: number;
  hasFirstActivity: boolean; // first sit completed or first listing published
  role: string;
}

const TrustProfile = ({ emailVerified, identityVerified, hasAvatar, profileCompletion, hasFirstActivity, role }: Props) => {
  const steps = [
    { label: "Email vérifié", done: emailVerified },
    { label: "Identité vérifiée", done: identityVerified, action: !identityVerified ? "/settings#verification" : undefined },
    { label: "Photo de profil ajoutée", done: hasAvatar },
    { label: "Profil complété à 60%+", done: profileCompletion >= 60 },
    { label: role === "owner" ? "Première annonce publiée" : "Première garde réalisée", done: hasFirstActivity },
  ];

  const completedCount = steps.filter(s => s.done).length;
  const percent = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="rounded-xl border border-border p-5 space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <h3 className="font-heading text-base font-semibold">Profil de confiance</h3>
        <span className="ml-auto text-xs text-muted-foreground font-medium">{completedCount}/5</span>
      </div>

      <Progress value={percent} className="h-2" />

      <div className="space-y-2">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-2.5 text-sm">
            {step.done ? (
              <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
            )}
            <span className={step.done ? "text-foreground" : "text-muted-foreground"}>
              {step.label}
            </span>
            {step.action && (
              <Button variant="link" size="sm" className="h-auto p-0 text-xs ml-auto" asChild>
                <Link to={step.action}>Vérifier</Link>
              </Button>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground italic leading-relaxed">
        Plus votre profil de confiance est complet, plus vous inspirez confiance. Un profil 100% vérifié, c'est comme une poignée de main ferme : ça rassure.
      </p>
    </div>
  );
};

export default TrustProfile;
