import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Circle, ShieldCheck, ChevronDown } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Props {
  emailVerified: boolean;
  identityVerified: boolean;
  hasAvatar: boolean;
  profileCompletion: number;
  hasFirstActivity: boolean;
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
  const allDone = completedCount === steps.length;
  const pendingSteps = steps.filter(s => !s.done);
  const doneSteps = steps.filter(s => s.done);

  // Auto-collapsed if 100%
  const [open, setOpen] = useState(!allDone);

  return (
    <div className="rounded-xl border border-border p-5 space-y-4">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center gap-2">
            <ShieldCheck className={`h-5 w-5 ${allDone ? "text-green-600" : "text-primary"}`} />
            <h3 className="font-heading text-base font-semibold">Profil de confiance</h3>
            {allDone && <span className="text-xs text-green-600 font-medium">Complet ✓</span>}
            <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              {completedCount}/5
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
            </span>
          </div>

          <Progress value={percent} className="h-2 mt-3" />
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-4 space-y-4">
          {/* Pending steps — always visible when open */}
          {pendingSteps.length > 0 && (
            <div className="space-y-2">
              {pendingSteps.map((step, i) => (
                <div key={i} className="flex items-center gap-2.5 text-sm">
                  <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  <span className="text-muted-foreground">{step.label}</span>
                  {step.action && (
                    <Button variant="link" size="sm" className="h-auto p-0 text-xs ml-auto" asChild>
                      <Link to={step.action}>Vérifier</Link>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Done steps — collapsible sub-section */}
          {doneSteps.length > 0 && (
            <Collapsible defaultOpen={!allDone && doneSteps.length <= 2}>
              <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <ChevronDown className="h-3 w-3" />
                {doneSteps.length} étape{doneSteps.length > 1 ? "s" : ""} validée{doneSteps.length > 1 ? "s" : ""}
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-2">
                {doneSteps.map((step, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    <span className="text-foreground">{step.label}</span>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          <p className="text-xs text-muted-foreground italic leading-relaxed">
            Plus votre profil de confiance est complet, plus vous inspirez confiance. Un profil 100% vérifié, c'est comme une poignée de main ferme : ça rassure.
          </p>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default TrustProfile;
