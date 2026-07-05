import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";

type RequestType = "city" | "breed" | "places" | "pros" | "other";

const OPTIONS: { value: RequestType; label: string; subjectLabel: string; subjectPlaceholder: string }[] = [
  { value: "city", label: "Fiche ville", subjectLabel: "Quelle ville ?", subjectPlaceholder: "Ex : Bordeaux, Rennes, Nantes…" },
  { value: "breed", label: "Fiche de race", subjectLabel: "Quelle race ?", subjectPlaceholder: "Ex : Cavalier King Charles, Chartreux…" },
  { value: "places", label: "Lieux dog-friendly", subjectLabel: "Quelle ville ou zone ?", subjectPlaceholder: "Ex : parcs à Marseille" },
  { value: "pros", label: "Professionnels", subjectLabel: "Quel besoin ?", subjectPlaceholder: "Ex : vétérinaires de garde à Toulouse" },
  { value: "other", label: "Autre demande", subjectLabel: "Sujet", subjectPlaceholder: "Décrivez brièvement" },
];

export function AnalysisRequestForm({ contextCity }: { contextCity?: string }) {
  const [type, setType] = useState<RequestType>("city");
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ticket, setTicket] = useState<string | null>(null);

  const active = OPTIONS.find((o) => o.value === type)!;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) {
      toast.error("Merci d'accepter le traitement de vos données");
      return;
    }
    if (subject.trim().length < 2) {
      toast.error("Précisez votre demande");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("submit-analysis-request", {
        body: {
          request_type: type,
          subject: subject.trim(),
          details: details.trim() || undefined,
          email: email.trim() || undefined,
          city_context: contextCity,
          website, // honeypot
        },
      });
      if (error) throw error;
      if ((data as any)?.error === "rate_limited") {
        toast.error("Trop de demandes. Réessayez dans quelques minutes.");
        return;
      }
      if ((data as any)?.ok) {
        setTicket((data as any).ticket || "OK");
        setSubject("");
        setDetails("");
        setEmail("");
        setConsent(false);
      } else {
        toast.error("Envoi impossible pour l'instant");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Erreur d'envoi, réessayez plus tard");
    } finally {
      setLoading(false);
    }
  };

  if (ticket) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-6 w-6 text-primary shrink-0 mt-0.5" />
          <div>
            <h3 className="font-heading text-lg font-semibold text-foreground mb-1">
              Demande bien reçue
            </h3>
            <p className="text-sm text-muted-foreground">
              Numéro de suivi : <span className="font-mono">{ticket}</span>. Nous étudions chaque demande manuellement.
              Si votre email est renseigné, nous vous prévenons dès qu'une analyse est disponible.
            </p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => setTicket(null)}>
              Faire une autre demande
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-border bg-card p-6 sm:p-8 space-y-5">
      <div>
        <p className="font-heading text-lg font-semibold text-foreground mb-1">
          Demandez une analyse personnalisée
        </p>
        <p className="text-sm text-muted-foreground">
          Ville, race, lieu, pro : dites-nous ce qui vous manque. C'est gratuit et lu par l'équipe.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Type de demande</Label>
        <RadioGroup
          value={type}
          onValueChange={(v) => setType(v as RequestType)}
          className="grid grid-cols-1 sm:grid-cols-2 gap-2"
        >
          {OPTIONS.map((o) => (
            <label
              key={o.value}
              htmlFor={`req-${o.value}`}
              className="flex items-center gap-2 rounded-lg border border-border p-3 cursor-pointer hover:border-primary/50 transition-colors"
            >
              <RadioGroupItem id={`req-${o.value}`} value={o.value} />
              <span className="text-sm font-medium">{o.label}</span>
            </label>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label htmlFor="subject">{active.subjectLabel}</Label>
        <Input
          id="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder={active.subjectPlaceholder}
          maxLength={200}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="details">Précisions (facultatif)</Label>
        <Textarea
          id="details"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Contexte, contraintes, ce que vous cherchez exactement…"
          maxLength={2000}
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email (facultatif, pour être prévenu)</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="vous@exemple.fr"
          maxLength={255}
          autoComplete="email"
        />
      </div>

      {/* Honeypot invisible */}
      <div aria-hidden="true" className="absolute -left-[9999px] w-px h-px overflow-hidden">
        <label htmlFor="website">Votre site (laisser vide)</label>
        <input
          id="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <label className="flex items-start gap-2 text-sm text-muted-foreground cursor-pointer">
        <Checkbox
          checked={consent}
          onCheckedChange={(v) => setConsent(v === true)}
          className="mt-0.5"
        />
        <span>
          J'accepte que Guardiens traite ma demande. Les données sont utilisées uniquement pour vous répondre.
          Voir la{" "}
          <a href="/confidentialite" className="text-primary underline" target="_blank" rel="noopener">
            politique de confidentialité
          </a>
          .
        </span>
      </label>

      <Button type="submit" disabled={loading || !consent} className="w-full sm:w-auto gap-2">
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {loading ? "Envoi…" : "Envoyer ma demande"}
      </Button>
    </form>
  );
}

export default AnalysisRequestForm;
