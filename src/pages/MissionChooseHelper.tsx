import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import PageMeta from "@/components/PageMeta";
import { capitalizeFirstName } from "@/lib/displayName";

interface Peek { valid?: boolean; reason?: string; mission_title?: string; mission_slug?: string; helper_first_name?: string }

const REASON_TEXT: Record<string, string> = {
  invalid: "Ce lien a expiré. Vous pouvez choisir depuis votre messagerie.",
  expired: "Ce lien a expiré. Vous pouvez choisir depuis votre messagerie.",
  already_used: "Votre choix est déjà enregistré. Merci.",
  mission_closed: "Ce besoin est déjà en cours ou clos.",
};

/** Lot E17 : le choix écarte les autres réponses, qui reçoivent « Merci, c'est pourvu ». */
export const CHOSEN_TEXT =
  "Votre besoin passe en cours et la conversation est ouverte, avec un premier message. Les autres personnes reçoivent un merci.";

export function confirmText(helper: string): string {
  return `En confirmant, votre besoin passe en cours et la conversation s'ouvre avec ${helper}. Les autres personnes reçoivent un merci.`;
}

export function chooseConversationPath(conversationId: string | null | undefined): string {
  return conversationId ? `/messages/${conversationId}` : "/messages";
}

/** Arrivée du lien « Choisir {prénom} » : lecture du jeton, puis choix sur confirmation, sans connexion. */
export default function MissionChooseHelper() {
  const [params] = useSearchParams();
  const token = params.get("t") || "";
  const [peek, setPeek] = useState<Peek | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<{ ok: boolean; reason?: string; helper?: string; slug?: string; conversationId?: string | null } | null>(null);

  useEffect(() => {
    let active = true;
    if (!token) { setPeek({ valid: false, reason: "invalid" }); return; }
    void supabase.functions.invoke("mission-choose-action", { body: { token, mode: "peek" } }).then(({ data, error }) => {
      if (active) setPeek(error ? { valid: false, reason: "invalid" } : (data as Peek));
    });
    return () => { active = false; };
  }, [token]);

  const confirm = async () => {
    setSending(true);
    const { data, error } = await supabase.functions.invoke("mission-choose-action", { body: { token, mode: "confirm" } });
    setSending(false);
    const result = (error ? { ok: false, reason: "invalid" } : data) as { ok: boolean; reason?: string; helper_first_name?: string; mission_slug?: string; conversation_id?: string | null };
    setDone({ ok: result.ok, reason: result.reason, helper: result.helper_first_name, slug: result.mission_slug, conversationId: result.conversation_id ?? null });
  };

  const helper = capitalizeFirstName(done?.helper || peek?.helper_first_name) || "cette personne";
  const slug = done?.slug || peek?.mission_slug;

  return (
    <main className="mx-auto flex min-h-[60vh] w-full min-w-0 max-w-xl flex-col gap-6 px-5 py-16">
      <PageMeta title="Choisir la personne qui vous aide, Guardiens" description="Confirmez la personne qui vous aide pour votre besoin." path="/entraide/choisir" noindex />
      {!peek ? (
        <p className="text-muted-foreground" aria-busy="true">Chargement...</p>
      ) : done?.ok ? (
        <section className="flex flex-col gap-4" aria-live="polite">
          <h1 className="font-heading text-3xl font-semibold text-foreground">C'est noté, {helper} vous aide.</h1>
          <p className="text-muted-foreground">{CHOSEN_TEXT}</p>
          <Button asChild className="self-start"><Link to={chooseConversationPath(done.conversationId)}>Écrire à {helper}</Link></Button>
        </section>
      ) : done && !done.ok ? (
        <section className="flex flex-col gap-4" aria-live="polite">
          <h1 className="font-heading text-3xl font-semibold text-foreground">Lien indisponible</h1>
          <p className="text-muted-foreground">{REASON_TEXT[done.reason || "invalid"] || REASON_TEXT.invalid}</p>
          <Button asChild variant="outline" className="self-start"><Link to="/messages">Ouvrir la messagerie</Link></Button>
        </section>
      ) : peek.valid ? (
        <section className="flex flex-col gap-4">
          <h1 className="font-heading text-3xl font-semibold text-foreground">C'est {helper} qui vous aide ?</h1>
          {peek.mission_title && <p className="rounded-lg border border-border bg-card p-4 font-semibold text-foreground">{peek.mission_title}</p>}
          <p className="text-muted-foreground">{confirmText(helper)}</p>
          <Button onClick={confirm} disabled={sending} className="self-start">{sending ? "Enregistrement en cours..." : `Choisir ${helper}`}</Button>
          {slug && <Link to={`/petites-missions/${slug}`} className="text-sm font-semibold text-primary underline underline-offset-4">Voir le besoin</Link>}
        </section>
      ) : (
        <section className="flex flex-col gap-4">
          <h1 className="font-heading text-3xl font-semibold text-foreground">Lien indisponible</h1>
          <p className="text-muted-foreground">{REASON_TEXT[peek.reason || "invalid"] || REASON_TEXT.invalid}</p>
          <Button asChild variant="outline" className="self-start"><Link to="/messages">Ouvrir la messagerie</Link></Button>
        </section>
      )}
    </main>
  );
}
