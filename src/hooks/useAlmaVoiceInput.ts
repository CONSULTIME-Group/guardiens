/**
 * Dictée du composeur d'Alma (lot 1).
 *
 * Le micro démarre sur un geste utilisateur, condition iOS. On enregistre
 * avec MediaRecorder puis on transcrit côté serveur (edge function
 * `alma-transcribe`, clé gateway côté serveur uniquement). Si Web Speech
 * est disponible, on l'utilise en premier : la restitution est immédiate
 * et rien ne transite par le réseau applicatif.
 *
 * Entrée vocale seulement. Aucune synthèse vocale.
 */
import { useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Status = "idle" | "recording" | "transcribing";

function getSpeechRecognition(): any | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useAlmaVoiceInput(onText: (text: string) => void) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const supported =
    typeof window !== "undefined" &&
    (getSpeechRecognition() !== null ||
      (typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia));

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        /* silent */
      }
      recognitionRef.current = null;
      setStatus("idle");
      return;
    }
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") {
      rec.stop();
    }
  }, []);

  const start = useCallback(async () => {
    setError(null);

    const SR = getSpeechRecognition();
    if (SR) {
      try {
        const recognition = new SR();
        recognition.lang = "fr-FR";
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        recognition.onresult = (e: any) => {
          const text = e?.results?.[0]?.[0]?.transcript ?? "";
          if (text) onText(String(text));
        };
        recognition.onerror = () => {
          setError("La dictée reste disponible un peu plus tard.");
          setStatus("idle");
          recognitionRef.current = null;
        };
        recognition.onend = () => {
          setStatus("idle");
          recognitionRef.current = null;
        };
        recognitionRef.current = recognition;
        recognition.start();
        setStatus("recording");
        return;
      } catch {
        recognitionRef.current = null;
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        recorderRef.current = null;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        chunksRef.current = [];
        if (blob.size < 2048) {
          setStatus("idle");
          setError("L'enregistrement est très court, reprenez quand vous voulez.");
          return;
        }
        setStatus("transcribing");
        try {
          const form = new FormData();
          form.append("file", blob, "dictee.webm");
          const { data, error: fnError } = await supabase.functions.invoke("alma-transcribe", {
            body: form,
          });
          if (fnError) throw fnError;
          const text = typeof (data as any)?.text === "string" ? (data as any).text.trim() : "";
          if (text) onText(text);
          else setError("La dictée reste disponible un peu plus tard.");
        } catch {
          setError("La dictée reste disponible un peu plus tard.");
        } finally {
          setStatus("idle");
        }
      };
      recorder.start();
      setStatus("recording");
    } catch {
      setStatus("idle");
      setError("L'accès au micro reste à autoriser dans votre navigateur.");
    }
  }, [onText]);

  const toggle = useCallback(() => {
    if (status === "recording") stop();
    else if (status === "idle") void start();
  }, [status, start, stop]);

  return { status, error, supported, start, stop, toggle };
}
