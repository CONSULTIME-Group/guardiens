import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import PageMeta from "@/components/PageMeta";
import MeetupAnswer from "@/components/entraide/MeetupAnswer";

interface PeekResult {
  valid: boolean;
  reason?: string;
  action?: string;
  mission_id?: string;
  mission_title?: string;
  mission_city?: string;
  owner_first_name?: string;
  other_first_name?: string;
}

const INVALID_TEXT: Record<string, string> = {
  invalid: "Ce lien n'est plus valable. Ouvrez la demande depuis le site pour répondre.",
  expired: "Ce lien a expiré. La demande reste consultable sur le site.",
  already_used: "Vous avez déjà répondu à cette demande. Merci.",
  mission_closed: "Cette demande est close. Quelqu'un a pu aider, ou la date est passée.",
};

/**
 * Deux gestes d'entraide en un clic depuis un email :
 *  - « Je peux » sur un besoin ;
 *  - la fin d'échange « Vous vous êtes rencontrés ? » (paramètre a=rencontre).
 *
 * Rien n'est exécuté au chargement : la lecture du jeton décrit seulement la
 * situation, la réponse ne part qu'après confirmation explicite.
 */
export default function MissionQuickCanHelp() {
  const [params] = useSearchParams();
  const token = params.get("t") || "";
  const isMeetup = params.get("a") === "rencontre";

  const [loading, setLoading] = useState(true);
  const [peek, setPeek] = useState<PeekResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<null | { ok: boolean; reason?: string; happened?: boolean; reopened?: boolean }>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!token) {
        setPeek({ valid: false, reason: "invalid" });
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.functions.invoke("mission-quick-action", {
        body: { token, mode: "peek", kind: isMeetup ? "meetup" : "can_help" },
      });
      if (cancelled) return;
      setPeek(error ? { valid: false, reason: "invalid" } : (data as PeekResult));
      setLoading(false);
    };
    run();
    return () => { cancelled = true; };
  }, [token, isMeetup]);

  const confirm = async () => {
    if (!peek?.valid) return;
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("mission-quick-action", {
      body: { token, mode: "confirm" },
    });
    setSubmitting(false);
    const result = (error ? { ok: false, reason: "error" } : data) as { ok: boolean; reason?: string };
    setDone({ ok: !!result?.ok, reason: result?.reason });
    try {
      trackEvent("mission_can_help", {
        source: "email",
        metadata: { mission_id: peek.mission_id ?? null, ok: !!result?.ok },
      });
    } catch { /* mesure non bloquante */ }
  };

  const confirmMeetup = async (happened: boolean, word: string, publicOk: boolean) => {
    if (!peek?.valid) return;
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("mission-quick-action", {
      body: { token, kind: "meetup", mode: "confirm", word: happened ? word : "", public_ok: happened ? publicOk : false },
    });
    setSubmitting(false);
    const result = (error ? { ok: false, reason: "error" } : data) as
      { ok: boolean; reason?: string; happened?: boolean; reopened?: boolean };
    setDone({ ok: !!result?.ok, reason: result?.reason, happened: result?.happened, reopened: result?.reopened });
  };

  const missionLink = peek?.mission_id ? `/petites-missions/${peek.mission_id}` : "/petites-missions";
  const otherName = peek?.other_first_name || peek?.owner_first_name || "cette personne";

  const meetupDoneText = () => {
    if (!done?.ok) return INVALID_TEXT[done?.reason ?? "invalid"] ?? INVALID_TEXT.invalid;
    if (done.happened) return "C'est noté, merci. Votre coup de main compte pour le coin.";
    return done.reopened
      ? "C'est noté. Le besoin redevient visible et d'autres personnes du coin le recevront."
      : "C'est noté. Vous pouvez convenir d'un autre moment directement dans la conversation.";
  };

  return (
    <>
      <PageMeta
        title={isMeetup ? "Vous vous êtes rencontrés ?" : "Je peux aider"}
        description="Répondez en un clic à propos d'un coup de main près de chez vous."
        noindex
      />
      <main id="main-content" className="mx-auto w-full max-w-lg px-4 py-10">
        <Card>
          {loading ? (
            <CardContent className="flex items-center gap-2 py-10 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Chargement de la demande.
            </CardContent>
          ) : done ? (
            <>
              <CardHeader>
                <CardTitle>
                  {isMeetup
                    ? (done.ok ? "Merci pour votre réponse" : "Réponse non enregistrée")
                    : (done.ok ? "C'est envoyé, merci" : "Réponse non enregistrée")}
                </CardTitle>
                <CardDescription>
                  {isMeetup
                    ? meetupDoneText()
                    : done.ok
                      ? "La personne qui a publié cette demande vient d'être prévenue. Elle vous écrira pour caler les détails."
                      : INVALID_TEXT[done.reason ?? "invalid"] ?? INVALID_TEXT.invalid}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to={missionLink}>
                  <Button variant="outline" className="w-full">Voir le détail</Button>
                </Link>
              </CardContent>
            </>
          ) : peek?.valid ? (
            isMeetup ? (
              <>
                <CardHeader>
                  <CardTitle>Vous vous êtes rencontrés ?</CardTitle>
                  <CardDescription>
                    À propos de « {peek.mission_title} »{peek.mission_city ? `, à ${peek.mission_city}` : ""}, avec {otherName}.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <MeetupAnswer
                    otherFirstName={otherName}
                    busy={submitting}
                    onYes={(word, publicOk) => void confirmMeetup(true, word, publicOk)}
                    onNo={() => void confirmMeetup(false, "", false)}
                  />
                </CardContent>
              </>
            ) : (
              <>
                <CardHeader>
                  <CardTitle>Vous pouvez donner un coup de main</CardTitle>
                  <CardDescription>
                    {peek.owner_first_name || "Une personne"} a besoin de quelqu'un pour « {peek.mission_title} »
                    {peek.mission_city ? `, à ${peek.mission_city}` : ""}.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full" onClick={confirm} disabled={submitting}>
                    {submitting ? "Envoi en cours" : "Je peux"}
                  </Button>
                  <Link to={missionLink}>
                    <Button variant="outline" className="w-full">Voir le détail avant de répondre</Button>
                  </Link>
                </CardContent>
              </>
            )
          ) : (
            <>
              <CardHeader>
                <CardTitle>Lien indisponible</CardTitle>
                <CardDescription>{INVALID_TEXT[peek?.reason ?? "invalid"] ?? INVALID_TEXT.invalid}</CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/petites-missions">
                  <Button variant="outline" className="w-full">Voir les demandes du coin</Button>
                </Link>
              </CardContent>
            </>
          )}
        </Card>
      </main>
    </>
  );
}
