/**
 * Lot ANN1 (11/11/2026, maquette Claude Design « Publier une annonce, premier
 * écran rassurant » validée par Jérémie) : premier écran de /sits/create sur
 * un formulaire vierge.
 *
 * - aquarelle, « Votre annonce, en trois étapes », Guardiens est gratuit ;
 * - carte Alma : un micro, la phrase dictée ou écrite, puis Alma remplit
 *   l'annonce (draft-sit-from-prompt) et le membre relit dans le formulaire ;
 * - tri du besoin : un coup de main (ramener un animal, une promenade, un
 *   passage) part vers l'Entraide avec son brouillon, une phrase ambiguë
 *   reçoit une seule question ;
 * - preuve : nombre réel de gardiens à moins de 50 km (src/lib/nearbyProof.ts).
 *
 * Le serveur ne publie jamais à la place du membre : un brouillon, relu.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAlmaVoiceInput } from "@/hooks/useAlmaVoiceInput";
import { useNearbyProof } from "@/hooks/useNearbyProof";
import { trackEvent } from "@/lib/analytics";
import { trackCowrite } from "@/lib/alma/cowrite";
import { draftMissionFromPhrase } from "@/lib/alma/missionDraft";
import { readFunctionErrorBody } from "@/lib/functionErrorBody";
import { avatarImageUrl } from "@/lib/storageImage";
import { entraidePrefillHref, readSitDraftReply, type SortedNeed } from "@/lib/sitNeedSort";

const aquarelle = new URL("../../../assets/aquarelles/univers-gardes-320.webp", import.meta.url).href;

const EXAMPLE = "« Je pars du 3 au 17 août, je cherche quelqu'un pour Nala, ma chienne, et pour arroser le jardin. »";
const MIN_LEN = 10;
const MAX_LEN = 1500;

export interface SitCreateWelcomeProps {
  userId: string | undefined;
  /** Le membre quitte le formulaire pour l'Entraide (sortie choisie). */
  onLeaveForEntraide?: () => void;
}

export default function SitCreateWelcome({ userId, onLeaveForEntraide }: SitCreateWelcomeProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [writing, setWriting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sorted, setSorted] = useState<SortedNeed | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const seenRef = useRef(false);

  const { data: proofData, isFetched: proofFetched } = useNearbyProof(userId, true);
  const proof = proofData?.proof ?? null;
  const faces = proofData?.faces ?? [];

  useEffect(() => {
    if (seenRef.current || !proofFetched) return;
    seenRef.current = true;
    void trackEvent("sits_create_welcome_seen", {
      source: "/sits/create",
      metadata: { proof: proof?.scope ?? "none", count: proof?.count ?? null },
    });
    void trackEvent("sits_create_alma_bubble_seen", { source: "/sits/create" });
    trackCowrite("shown", "annonce");
  }, [proofFetched, proof]);

  const onVoiceText = useCallback((text: string) => {
    setSorted(null);
    setPrompt((prev) => {
      const next = prev.trim().length > 0 ? `${prev.trim()} ${text.trim()}` : text.trim();
      return next.slice(0, MAX_LEN);
    });
    void trackEvent("owner_draft_from_prompt_voice_used", { metadata: { chars: text.length, surface: "create_welcome" } });
  }, []);
  const voice = useAlmaVoiceInput(onVoiceText);
  const recording = voice.status === "recording";
  const transcribing = voice.status === "transcribing";

  const clean = prompt.trim();
  const ready = clean.length >= MIN_LEN && !loading && !recording && !transcribing;
  const showText = writing || clean.length > 0;

  const generate = useCallback(async (confirmHome: boolean) => {
    const phrase = prompt.trim();
    if (phrase.length < MIN_LEN) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("draft-sit-from-prompt", {
        body: confirmHome ? { prompt: phrase, confirmHome: true } : { prompt: phrase },
      });
      const body = error ? await readFunctionErrorBody(error) : data;
      const reply = readSitDraftReply(body);
      if (reply.kind === "draft") {
        trackCowrite("used", "annonce", { draft_id: reply.draftId, surface: "create_welcome" });
        void trackEvent("owner_draft_from_prompt_generated", {
          metadata: { prompt_length: phrase.length, generated_length: reply.generatedLength, confidence: reply.confidence, draft_id: reply.draftId, surface: "create_welcome" },
        });
        toast({ title: "Votre brouillon est prêt", description: "Vous le relisez, vous ajustez, puis vous publiez." });
        navigate(`/sits/create?draftId=${reply.draftId}&source=ai_prompt`);
        return;
      }
      if (reply.kind === "sorted") {
        setSorted(reply.need);
        void trackEvent("sits_create_need_sorted", { source: "/sits/create", metadata: { kind: reply.need } });
        return;
      }
      toast({ variant: "destructive", title: "Brouillon à reprendre", description: reply.message });
    } catch {
      toast({ variant: "destructive", title: "Brouillon à reprendre", description: "Réessayez dans un instant, ou remplissez le formulaire ci-dessous." });
    } finally {
      setLoading(false);
    }
  }, [prompt, navigate, toast]);

  const goEntraide = useCallback(async () => {
    const phrase = prompt.trim();
    void trackEvent("sits_create_need_choice", { source: "/sits/create", metadata: { choice: "entraide", from: sorted } });
    setLoading(true);
    const res = await draftMissionFromPhrase(phrase.slice(0, 800));
    setLoading(false);
    onLeaveForEntraide?.();
    navigate(entraidePrefillHref("ok" in res && res.ok ? { title: res.title, description: res.description } : { title: "", description: phrase }));
  }, [prompt, sorted, navigate, onLeaveForEntraide]);

  const confirmHome = useCallback(() => {
    void trackEvent("sits_create_need_choice", { source: "/sits/create", metadata: { choice: "garde", from: sorted } });
    setSorted(null);
    void generate(true);
  }, [generate, sorted]);

  return (
    <section
      data-testid="sit-create-welcome"
      className="px-4 max-w-3xl mx-auto mb-8 grid grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-2 md:gap-x-10 md:gap-y-5 md:items-start"
    >
      <div className="flex flex-col items-center text-center md:items-start md:text-left">
        <img
          src={aquarelle}
          alt="Aquarelle : un chien assis devant une porte verte, un chat à la fenêtre"
          width={220}
          height={220}
          className="h-[200px] w-[200px] md:h-[220px] md:w-[220px] object-cover -mt-4 -mb-6 md:-ml-5"
        />
        <h1 className="font-heading text-[28px] leading-[34px] md:text-[34px] md:leading-[42px] font-bold text-foreground">
          Votre annonce, en trois étapes
        </h1>
        <p className="mt-2 text-base leading-6 text-foreground/80">
          Vous décrivez votre absence, les gardiens proches de chez vous candidatent, vous choisissez. Guardiens est gratuit.
        </p>
      </div>

      <div
        aria-label="Alma prépare votre annonce"
        role="group"
        className="md:row-span-2 rounded-[20px] border-[1.5px] border-primary bg-card px-4 py-5 md:px-6 flex flex-col items-center gap-3"
      >
        <p className="text-xs font-semibold text-muted-foreground">Alma · Compagne IA de Guardiens</p>

        {sorted ? (
          <div className="w-full flex flex-col gap-3" role="status" data-testid="sit-need-sorted" data-need={sorted}>
            <h2 className="font-heading text-xl leading-7 font-semibold text-center text-foreground">
              {sorted === "coup_de_main" ? "C'est un coup de main" : "Le gardien s'installe chez vous ?"}
            </h2>
            <p className="text-[15px] leading-[23px] text-foreground/85 text-center">
              {sorted === "coup_de_main"
                ? "Un service ponctuel se publie dans l'Entraide, l'espace des coups de main entre membres. Je prépare votre demande, vous la relisez."
                : "Une garde : le gardien s'installe chez vous pendant votre absence. Un coup de main : un service ponctuel, comme une promenade ou un passage."}
            </p>
            <p className="rounded-field bg-muted/60 px-3 py-2 text-sm text-foreground/80 italic">« {clean.slice(0, 220)} »</p>
            {sorted === "coup_de_main" ? (
              <>
                <Button type="button" className="h-12 rounded-full" disabled={loading} onClick={() => void goEntraide()}>
                  {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />Alma prépare…</> : "Relire et publier dans l'Entraide"}
                </Button>
                <Button type="button" variant="outline" className="h-12 rounded-full" disabled={loading} onClick={confirmHome}>
                  C'est une garde à mon domicile
                </Button>
              </>
            ) : (
              <>
                <Button type="button" className="h-12 rounded-full" disabled={loading} onClick={confirmHome}>
                  {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />Alma prépare…</> : "Oui, il s'installe chez moi"}
                </Button>
                <Button type="button" variant="outline" className="h-12 rounded-full" disabled={loading} onClick={() => void goEntraide()}>
                  C'est un service ponctuel
                </Button>
              </>
            )}
            <p className="text-[13px] leading-[19px] text-center text-muted-foreground">Guardiens est gratuit, pour une garde comme pour un coup de main.</p>
          </div>
        ) : (
          <>
            <h2 className="font-heading text-xl leading-[26px] md:text-2xl md:leading-[31px] font-semibold text-center text-foreground">
              Racontez votre absence, Alma remplit l'annonce
            </h2>
            {voice.supported && (
              <>
                <button
                  type="button"
                  onClick={voice.toggle}
                  disabled={loading || transcribing}
                  aria-label={recording ? "Arrêter la dictée" : "Parler à Alma"}
                  aria-pressed={recording}
                  data-testid="sit-welcome-mic"
                  className={`h-[76px] w-[76px] rounded-full flex items-center justify-center text-primary-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60 ${recording ? "bg-destructive" : "bg-primary"}`}
                >
                  {transcribing ? <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" /> : recording ? <Square className="h-7 w-7" aria-hidden="true" /> : <Mic className="h-8 w-8" aria-hidden="true" />}
                </button>
                <p className="text-[15px] font-semibold text-primary" role="status">
                  {transcribing ? "Alma écoute votre phrase…" : recording ? "Je vous écoute. Touchez pour terminer." : (
                    <><span className="md:hidden">Touchez le micro et parlez</span><span className="hidden md:inline">Cliquez sur le micro et parlez</span></>
                  )}
                </p>
              </>
            )}
            {voice.error && <p className="text-sm text-foreground/80 text-center" role="status">{voice.error}</p>}

            {showText ? (
              <div className="w-full flex flex-col gap-2">
                <label htmlFor="sit-welcome-prompt" className="text-sm font-semibold text-foreground">Votre absence, avec vos mots</label>
                <Textarea
                  id="sit-welcome-prompt"
                  ref={textareaRef}
                  value={prompt}
                  onChange={(e) => { setPrompt(e.target.value.slice(0, MAX_LEN)); }}
                  rows={4}
                  maxLength={MAX_LEN}
                  disabled={loading || transcribing}
                  placeholder="Dates, commune, animaux, habitudes."
                  className="resize-none text-base rounded-field"
                />
                <Button type="button" className="h-12 rounded-full" disabled={!ready} onClick={() => void generate(false)} data-testid="sit-welcome-generate">
                  {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />Alma écrit votre annonce…</> : "Alma remplit mon annonce"}
                </Button>
              </div>
            ) : (
              <p className="text-sm leading-[21px] text-center text-foreground/80 italic max-w-[400px]">{EXAMPLE}</p>
            )}

            <div className="w-full rounded-[14px] bg-pastel-sage px-3.5 py-3 flex flex-col gap-1.5">
              <p className="text-sm font-semibold text-pastel-sage-ink">Alma écrit pour vous</p>
              <p className="text-sm leading-[21px] text-pastel-sage-ink">
                Le titre, les dates, la routine de vos animaux et votre message aux gardiens. Vous relisez, vous ajustez, vous publiez.
              </p>
            </div>
            {!showText && (
              <button
                type="button"
                className="min-h-[44px] px-3 text-[15px] font-medium text-primary underline underline-offset-2"
                onClick={() => { setWriting(true); window.setTimeout(() => textareaRef.current?.focus(), 50); }}
              >
                Je préfère l'écrire
              </button>
            )}
          </>
        )}
      </div>

      <div className="flex flex-col gap-3.5">
        {proof && (
          <div
            aria-label="Les gardiens autour de chez vous"
            role="group"
            data-testid="sit-welcome-proof"
            data-scope={proof.scope}
            className="rounded-2xl bg-pastel-sage px-4 py-[18px] flex flex-col gap-3"
          >
            <div className="flex flex-col gap-2.5">
              {faces.length === 3 && (
                <div className="flex shrink-0" aria-hidden="true">
                  {faces.map((f, i) => (
                    <img
                      key={f.id}
                      src={avatarImageUrl(f.avatar_url, 80)}
                      alt=""
                      width={40}
                      height={40}
                      loading="lazy"
                      className={`h-10 w-10 rounded-full object-cover border-2 border-pastel-sage bg-card ${i === 0 ? "" : "-ml-2.5"}`}
                    />
                  ))}
                </div>
              )}
              <p className="font-heading text-[22px] leading-[27px] font-bold text-pastel-sage-ink">{proof.headline}</p>
            </div>
            <p className="text-[15px] leading-[22px] text-pastel-sage-ink">{proof.line}</p>
          </div>
        )}
        <p className="text-sm leading-[21px] text-foreground/80 text-center md:text-left">
          Vous lisez chaque profil, vous échangez par messagerie, vous choisissez votre gardien. La rencontre avant la garde est à votre choix.
        </p>
      </div>
    </section>
  );
}
