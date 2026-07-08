/**
 * Owner Pass 3 — Concierge IA : composant "décrivez votre absence en 1 phrase".
 *
 * Appelle l'edge function `draft-sit-from-prompt` qui génère un brouillon
 * complet et l'insère en DB. Redirection vers /sits/create?draftId=... où
 * l'owner relit et publie. Rate limit 3/heure côté serveur.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, Mic, Square } from "lucide-react";
import { AlmaAnimated } from "@/components/ai/alma/AlmaAnimated";
import { useAlmaEvolution } from "@/hooks/useAlmaEvolution";


import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import type { OwnerPrimaryAction } from "@/hooks/useOwnerPrimaryAction";

const PLACEHOLDER =
  "Exemple : Je pars 15 jours en août avec 2 chats à Lyon, je cherche quelqu'un de calme qui télétravaille.";

export interface SitDraftFromPromptProps {
  /**
   * Affichage secondaire (moins accentué) quand un DraftResumeCard est déjà
   * visible au-dessus. On adapte le titre pour proposer une seconde absence.
   */
  secondary?: boolean;
  /**
   * Action primaire proprio (activation). Quand `create_first_sit`, on affiche
   * une phrase courte d'Alma expliquant POURQUOI publier maintenant. Quand
   * `publish_draft`, la carte bascule en mode « finalisez et publiez » avec
   * un CTA direct vers le brouillon concerné.
   */
  primary?: OwnerPrimaryAction | null;
}

export default function SitDraftFromPrompt({ secondary = false, primary = null }: SitDraftFromPromptProps = {}) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [almaMood, setAlmaMood] = useState<"idle" | "happy" | "thinking" | "attentive">("attentive");
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { data: almaEvo } = useAlmaEvolution();
  const almaStage = almaEvo?.stage;

  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const seenRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (!seenRef.current) {
      seenRef.current = true;
      void trackEvent("owner_draft_from_prompt_input_seen", {
        metadata: { secondary },
      });
    }
    // Attribution email intent : ouverture depuis onboarding-j1
    if (searchParams.get("intent") === "draft_from_prompt") {
      void trackEvent("owner_intent_draft_from_prompt_from_email");
      setTimeout(() => textareaRef.current?.focus(), 200);
    }
  }, [searchParams, secondary]);

  const handleGenerate = useCallback(async () => {
    const clean = prompt.trim();
    if (clean.length < 10) return;
    setLoading(true);
    setAlmaMood("thinking");
    try {
      const { data, error } = await supabase.functions.invoke("draft-sit-from-prompt", {
        body: { prompt: clean },
      });
      if (error || !data?.draftId) {
        const msg = (data as any)?.error || error?.message || "Génération impossible pour le moment.";
        toast({ variant: "destructive", title: "Brouillon non généré", description: msg });
        setAlmaMood("attentive");
        setLoading(false);
        return;
      }
      setAlmaMood("happy");
      window.setTimeout(() => setAlmaMood("attentive"), 1200);
      void trackEvent("owner_draft_from_prompt_generated", {
        metadata: {
          prompt_length: clean.length,
          generated_length: data.generated_length ?? null,
          confidence: data.confidence ?? null,
          draft_id: data.draftId,
        },
      });
      if (Array.isArray(data.warnings) && data.warnings.length > 0) {
        toast({
          title: "Votre brouillon est prêt",
          description: "Quelques éléments à vérifier manuellement avant de publier.",
        });
      } else {
        toast({
          title: "Brouillon prêt",
          description: "Vous pouvez relire et publier en 2 minutes.",
        });
      }
      navigate(`/sits/create?draftId=${data.draftId}&source=ai_prompt`);
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Erreur inattendue",
        description: e instanceof Error ? e.message : "Réessayez dans un instant.",
      });
      setAlmaMood("attentive");
      setLoading(false);
    }
  }, [prompt, navigate, toast]);

  const stopStream = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }, []);

  const startRecording = useCallback(async () => {
    if (recording || transcribing || loading) return;
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast({ variant: "destructive", title: "Micro indisponible", description: "Votre navigateur ne prend pas en charge l'enregistrement audio." });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const preferred = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
      const mimeType = preferred.find((t) => MediaRecorder.isTypeSupported?.(t));
      const rec = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        const type = rec.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        stopStream();
        if (blob.size < 2048) {
          toast({ variant: "destructive", title: "Enregistrement trop court", description: "Parlez au moins une seconde puis réessayez." });
          return;
        }
        setTranscribing(true);
        try {
          const form = new FormData();
          const ext = type.includes("mp4") ? "mp4" : type.includes("ogg") ? "ogg" : "webm";
          form.append("file", blob, `voice.${ext}`);
          const { data, error } = await supabase.functions.invoke("transcribe-audio", { body: form });
          if (error || !data?.text) {
            const msg = (data as any)?.error || error?.message || "Transcription impossible.";
            toast({ variant: "destructive", title: "Transcription impossible", description: msg });
            return;
          }
          const transcript = String(data.text).trim();
          setPrompt((prev) => {
            const combined = prev.trim().length > 0 ? `${prev.trim()} ${transcript}` : transcript;
            return combined.slice(0, 1500);
          });
          void trackEvent("owner_draft_from_prompt_voice_used", {
            metadata: { chars: transcript.length },
          });
          setTimeout(() => textareaRef.current?.focus(), 50);
        } catch (e) {
          toast({ variant: "destructive", title: "Erreur", description: e instanceof Error ? e.message : "Réessayez." });
        } finally {
          setTranscribing(false);
        }
      };
      rec.start();
      setRecording(true);
    } catch (e) {
      stopStream();
      toast({
        variant: "destructive",
        title: "Micro refusé",
        description: "Autorisez l'accès au microphone dans votre navigateur pour dicter votre annonce.",
      });
    }
  }, [recording, transcribing, loading, stopStream, toast]);

  const stopRecording = useCallback(() => {
    if (!recording) return;
    setRecording(false);
    try { mediaRecorderRef.current?.stop(); } catch { stopStream(); }
  }, [recording, stopStream]);

  useEffect(() => {
    return () => { stopStream(); };
  }, [stopStream]);

  // Mode « brouillon prêt à publier » : la carte devient un rappel direct
  // avec CTA vers /sits/create?resume=<id>. Pas de champ prompt à re-remplir.
  if (primary?.action === "publish_draft" && primary.draftId) {
    const draftId = primary.draftId;
    return (
      <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
          <div className="shrink-0 self-start flex flex-col items-center">
            <div className="relative">
              <AlmaAnimated size={72} mood="attention" stage={almaStage} />
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-14 h-2.5 bg-foreground/10 rounded-full blur-sm pointer-events-none" />
            </div>
            <span className="mt-1 text-[10px] font-medium text-muted-foreground">Alma</span>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg md:text-xl font-heading font-semibold text-foreground leading-tight">
              Votre brouillon est prêt. Il ne manque que la publication.
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Sans publication, les gardiens de votre secteur ne peuvent pas se proposer. Reprenez votre brouillon, quelques minutes suffisent.
            </p>
            <div className="mt-4">
              <Button
                onClick={() => {
                  void trackEvent("owner_primary_action_publish_draft_click", {
                    metadata: { draft_id: draftId },
                  });
                  navigate(`/sits/create?resume=${draftId}`);
                }}
                className="rounded-xl"
              >
                Reprendre et publier
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const showCreateFirstAlma = primary?.action === "create_first_sit";

  return (
    <section
      className={
        secondary
          ? "rounded-2xl border border-dashed border-border bg-muted/30 p-5 md:p-6"
          : "rounded-2xl border border-border bg-card p-5 md:p-6"
      }
    >
      <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 mb-3">
        <div className="shrink-0 self-start flex flex-col items-center">
          <div className="relative">
            <AlmaAnimated size={72} mood={almaMood} stage={almaStage} />
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-14 h-2.5 bg-foreground/10 rounded-full blur-sm pointer-events-none" />
          </div>
          <span className="mt-1 text-[10px] font-medium text-muted-foreground">Alma</span>
        </div>
        <div className="min-w-0">
          <h2
            className={
              secondary
                ? "text-base md:text-lg font-heading font-medium text-foreground leading-tight"
                : "text-lg md:text-xl font-heading font-semibold text-foreground leading-tight"
            }
          >
            {secondary
              ? "Ou décrivez une autre absence, on prépare un nouveau brouillon"
              : "Décrivez votre absence en une phrase, Alma prépare le brouillon"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Vous relisez et publiez en 2 minutes.
          </p>
          {showCreateFirstAlma && (
            <p className="text-sm text-foreground/90 mt-2 leading-relaxed">
              Votre annonce est ce qui déclenche tout. Sans elle, les gardiens de votre secteur ne peuvent pas se proposer.
            </p>
          )}
        </div>
      </div>


      <Textarea
        ref={textareaRef}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={PLACEHOLDER}
        rows={4}
        maxLength={1500}
        disabled={loading}
        className="resize-none"
        aria-label="Décrivez votre absence en une phrase"
      />
      <p className="text-xs text-muted-foreground mt-2">
        Ajoutez dates, ville, animaux, préférences. Plus c'est précis, meilleur est le brouillon.
      </p>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground tabular-nums">
          {prompt.length}/1500
        </span>
        <Button
          onClick={handleGenerate}
          disabled={loading || prompt.trim().length < 10}
          className="rounded-xl"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
              Alma prépare…
            </>

          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" aria-hidden="true" />
              Générer mon brouillon
            </>
          )}
        </Button>
      </div>
    </section>
  );
}
