/**
 * Onglet "Attentes" — strictement identique entre vue propriétaire et gardien.
 * Inclut désormais "Une journée type" et "Un mot de l'hôte" (facultatifs côté annonce).
 */
import { ShieldCheck, MessageSquare, Sun, Quote } from "lucide-react";

interface ExpectationsTabProps {
  ownerProfile: any;
  specificExpectations: string | null;
  openTo: string[] | null;
  dailyRoutine?: string | null;
  ownerMessage?: string | null;
  ownerFirstName?: string | null;
}

const ExpectationsTab = ({
  ownerProfile,
  specificExpectations,
  openTo,
  dailyRoutine,
  ownerMessage,
  ownerFirstName,
}: ExpectationsTabProps) => {
  return (
    <>
      {(ownerProfile || specificExpectations) && (
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <h3 className="font-heading font-semibold">Ce qu'on attend</h3>
          </div>
          <div className="text-sm space-y-2">
            {ownerProfile?.preferred_sitter_types?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {ownerProfile.preferred_sitter_types.map((t: string) => (
                  <span key={t} className="px-2.5 py-1 rounded-full bg-accent text-xs">
                    {t}
                  </span>
                ))}
              </div>
            )}
            {ownerProfile?.presence_expected && (
              <p>Présence attendue : {ownerProfile.presence_expected}</p>
            )}
            {ownerProfile?.visits_allowed && <p>Visites : {ownerProfile.visits_allowed}</p>}
            {ownerProfile?.overnight_guest && <p>Invités : {ownerProfile.overnight_guest}</p>}
            {ownerProfile?.rules_notes && (
              <p className="text-muted-foreground">{ownerProfile.rules_notes}</p>
            )}
            {specificExpectations && (
              <p className="mt-2 p-3 bg-accent/50 rounded-lg whitespace-pre-line">{specificExpectations}</p>
            )}
          </div>
        </div>
      )}

      {dailyRoutine && (
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sun className="h-4 w-4 text-primary" />
            <h3 className="font-heading font-semibold">Une journée type</h3>
          </div>
          <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">
            {dailyRoutine}
          </p>
        </div>
      )}

      {ownerMessage && (
        <div className="bg-primary/5 rounded-xl border border-primary/20 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Quote className="h-4 w-4 text-primary" />
            <h3 className="font-heading font-semibold">
              {ownerFirstName ? `Un mot de ${ownerFirstName}` : "Un mot de l'hôte"}
            </h3>
          </div>
          <p className="text-sm text-foreground italic whitespace-pre-line leading-relaxed">
            « {ownerMessage} »
          </p>
        </div>
      )}

      {ownerProfile &&
        (ownerProfile.meeting_preference?.length > 0 || ownerProfile.news_frequency) && (
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="h-4 w-4 text-primary" />
              <h3 className="font-heading font-semibold">L'accueil</h3>
            </div>
            <div className="text-sm space-y-1">
              {ownerProfile.meeting_preference?.length > 0 && (
                <p>Rencontre : {ownerProfile.meeting_preference.join(", ")}</p>
              )}
              {ownerProfile.handover_preference && (
                <p>Passage de relais : {ownerProfile.handover_preference}</p>
              )}
              {ownerProfile.welcome_notes && (
                <p className="text-muted-foreground">{ownerProfile.welcome_notes}</p>
              )}
              {ownerProfile.news_frequency && <p>Nouvelles : {ownerProfile.news_frequency}</p>}
              {ownerProfile.news_format?.length > 0 && (
                <p>Format : {ownerProfile.news_format.join(", ")}</p>
              )}
            </div>
          </div>
        )}

      {openTo && openTo.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-heading font-semibold text-sm mb-2">Ouvert à</h3>
          <div className="flex flex-wrap gap-1.5">
            {openTo.map((t: string) => (
              <span key={t} className="px-2.5 py-1 rounded-full bg-accent text-xs">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default ExpectationsTab;
