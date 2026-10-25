import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import PageMeta from "@/components/PageMeta";
import MeetupAnswer from "@/components/entraide/MeetupAnswer";
import {
  MEETUP_CANCELLED_TEXT,
  meetupWordRetainedNotice,
  type MeetupOutcome,
} from "@/lib/meetupOutcome";
import { ENTRAIDE_COPY, needHeadline } from "@/lib/entraideCopy";

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
  invalid: "Ouvrez le besoin depuis le site pour répondre.",
  expired: "Ce lien a expiré. Le besoin reste consultable sur le site.",
  already_used: "Votre réponse à ce besoin est déjà partie. Merci.",
  mission_closed: "Ce besoin est clos, merci pour votre attention.",
};

/**
 * Deux gestes d'entraide en un clic depuis un email :
 *  - « Je peux » sur un besoin ;
 *  - la fin d'échange « Le coup de main a eu lieu ? » (paramètre a=rencontre).
 * Lot E18 (25/10/2026) : prénom de l'auteur (peek_mission_action_token, migration
 * 0102) et accroche partagée avec l'email aux aidants (needHeadline).
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
  const [done, setDone] = useState<null | {
    ok: boolean; reason?: string; happened?: boolean; reopened?: boolean;
    cancelled?: boolean; wordRefused?: boolean; wordRule?: string | null;
  }>(null);

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

  // Lot E19 : l'issue choisie à l'écran part explicitement (le lien de
  // l'email porte un jeton oui ou non, les deux appartiennent à la personne).
  const confirmMeetup = async (outcome: MeetupOutcome, word: string, publicOk: boolean) => {
    if (!peek?.valid) return;
    setSubmitting(true);
    const happened = outcome === "happened";
    const { data, error } = await supabase.functions.invoke("mission-quick-action", {
      body: { token, kind: "meetup", mode: "confirm", outcome, word: happened ? word : "", public_ok: happened ? publicOk : false },
    });
    setSubmitting(false);
    const result = (error ? { ok: false, reason: "error" } : data) as {
      ok: boolean; reason?: string; happened?: boolean; reopened?: boolean;
      cancelled?: boolean; word_refused?: boolean; word_rule?: string | null;
    };
    setDone({
      ok: !!result?.ok, reason: result?.reason, happened: result?.happened, reopened: result?.reopened,
      cancelled: result?.cancelled, wordRefused: result?.word_refused, wordRule: result?.word_rule ?? null,
    });
  };

  const missionLink = peek?.mission_id ? `/petites-missions/${peek.mission_id}` : "/petites-missions";
  const otherName = peek?.other_first_name || peek?.owner_first_name || "cette personne";

  const meetupDoneText = () => {
    if (!done?.ok) return INVALID_TEXT[done?.reason ?? "invalid"] ?? INVALID_TEXT.invalid;
    if (done.cancelled) return MEETUP_CANCELLED_TEXT;
    if (done.happened) {
      return done.wordRefused
        ? `C'est noté, merci. ${meetupWordRetainedNotice(done.wordRule)}`
        : "C'est noté, merci. Votre coup de main compte pour le coin.";
    }
    return done.reopened
      ? `C'est noté. Le besoin reste ouvert : convenez d'un autre moment avec ${otherName} dans la conversation.`
      : "C'est noté. Vous pouvez convenir d'un autre moment directement dans la conversation.";
  };

  return (
    <>
      <PageMeta
        title={isMeetup ? ENTRAIDE_COPY.happened : "Je peux aider"}
        description="Répondez en un clic à propos d'un coup de main près de chez vous."
        noindex
      />
      <main id="main-content" className="mx-auto w-full max-w-lg px-4 py-10">
        <Card>
          {loading ? (
            <CardContent className="flex items-center gap-2 py-10 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Chargement du besoin.
            </CardContent>
          ) : done ? (
            <>
              <CardHeader>
                <CardTitle>
                  {isMeetup
                    ? (done.ok ? "Merci pour votre réponse" : "Réponse en attente")
                    : (done.ok ? "C'est envoyé, merci" : "Réponse en attente")}
                </CardTitle>
                <CardDescription>
                  {isMeetup
                    ? meetupDoneText()
                    : done.ok
                      ? `${peek?.owner_first_name || "La personne qui demande"} est prévenue et vous écrit dans la messagerie pour caler les détails.`
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
                  <CardTitle>{ENTRAIDE_COPY.happened}</CardTitle>
                  <CardDescription>
                    À propos de « {peek.mission_title} »{peek.mission_city ? `, à ${peek.mission_city}` : ""}, avec {otherName}.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <MeetupAnswer
                    otherFirstName={otherName}
                    busy={submitting}
                    missionId={peek.mission_id}
                    onYes={(word, publicOk) => void confirmMeetup("happened", word, publicOk)}
                    onNo={() => void confirmMeetup("not_happened", "", false)}
                    onCancelled={() => void confirmMeetup("cancelled", "", false)}
                  />
                </CardContent>
              </>
            ) : (
              <>
                <CardHeader>
                  <CardTitle>Vous pouvez donner un coup de main</CardTitle>
                  <CardDescription>
                    {needHeadline(peek.owner_first_name, null, peek.mission_title)}
                    {peek.mission_city ? ` À ${peek.mission_city}.` : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full rounded-full" onClick={confirm} disabled={submitting}>
                    {submitting ? "Envoi en cours" : ENTRAIDE_COPY.canHelp}
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
                  <Button variant="outline" className="w-full">Voir les besoins du coin</Button>
                </Link>
              </CardContent>
            </>
          )}
        </Card>
      </main>
    </>
  );
}
