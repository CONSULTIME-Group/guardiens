import { ShieldCheck, Shield, CheckCircle2, Star, Calendar, Briefcase } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface TrustScoreProps {
  identityVerified: boolean;
  avgRating: number;
  reviewCount: number;
  completedSits: number;
  externalExperiencesCount: number;
  memberSince: string; // ISO date
  isFounder: boolean;
}

const TrustScore = ({
  identityVerified,
  avgRating,
  reviewCount,
  completedSits,
  externalExperiencesCount,
  memberSince,
  isFounder,
}: TrustScoreProps) => {
  // Calculate trust score (0-100)
  let score = 0;
  const factors: { label: string; points: number; earned: boolean }[] = [];

  // Identity verified: 25 pts
  const idPoints = identityVerified ? 25 : 0;
  score += idPoints;
  factors.push({ label: "Identité vérifiée", points: 25, earned: identityVerified });

  // Reviews: up to 25 pts (5 pts per review, max 5)
  const reviewPts = Math.min(reviewCount, 5) * 5;
  score += reviewPts;
  factors.push({ label: `${reviewCount} avis reçu${reviewCount > 1 ? "s" : ""}`, points: 25, earned: reviewCount > 0 });

  // Rating bonus: 15 pts if avg >= 4.5
  const ratingPts = avgRating >= 4.5 && reviewCount > 0 ? 15 : 0;
  score += ratingPts;
  factors.push({ label: `Note ≥ 4.5/5`, points: 15, earned: ratingPts > 0 });

  // Completed sits: up to 15 pts (5 per sit, max 3)
  const sitPts = Math.min(completedSits, 3) * 5;
  score += sitPts;
  factors.push({ label: `${completedSits} garde${completedSits > 1 ? "s" : ""} complétée${completedSits > 1 ? "s" : ""}`, points: 15, earned: completedSits > 0 });

  // External experiences: 10 pts if any
  const expPts = externalExperiencesCount > 0 ? 10 : 0;
  score += expPts;
  factors.push({ label: "Expériences vérifiées", points: 10, earned: expPts > 0 });

  // Seniority: 10 pts if > 3 months
  const monthsActive = Math.floor((Date.now() - new Date(memberSince).getTime()) / (1000 * 60 * 60 * 24 * 30));
  const seniorPts = monthsActive >= 3 ? 10 : 0;
  score += seniorPts;
  factors.push({ label: `Membre depuis ${monthsActive} mois`, points: 10, earned: seniorPts > 0 });

  // Determine level
  let level: string;
  let color: string;
  let bgColor: string;
  if (score >= 80) {
    level = "Très fiable";
    color = "text-green-700";
    bgColor = "bg-green-50 border-green-200";
  } else if (score >= 50) {
    level = "Fiable";
    color = "text-primary";
    bgColor = "bg-primary/5 border-primary/20";
  } else if (score >= 25) {
    level = "En progression";
    color = "text-amber-600";
    bgColor = "bg-amber-50 border-amber-200";
  } else {
    level = "Nouveau";
    color = "text-muted-foreground";
    bgColor = "bg-muted border-border";
  }

  const earnedCount = factors.filter(f => f.earned).length;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border cursor-help ${bgColor} ${color}`}>
          {score >= 80 ? (
            <ShieldCheck className="h-3.5 w-3.5" />
          ) : (
            <Shield className="h-3.5 w-3.5" />
          )}
          {level} · {score}%
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs p-4">
        <p className="font-semibold text-sm mb-2">Score de confiance : {score}/100</p>
        <div className="space-y-1.5">
          {factors.map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <CheckCircle2 className={`h-3 w-3 shrink-0 ${f.earned ? "text-green-600" : "text-muted-foreground/30"}`} />
              <span className={f.earned ? "text-foreground" : "text-muted-foreground"}>
                {f.label}
              </span>
              <span className="ml-auto text-muted-foreground">{f.earned ? `+${f.points === 25 && f.label.includes("avis") ? reviewPts : f.points === 15 && f.label.includes("garde") ? sitPts : f.points}` : `0/${f.points}`}</span>
            </div>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

export default TrustScore;
