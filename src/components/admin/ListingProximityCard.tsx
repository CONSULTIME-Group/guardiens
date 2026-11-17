/**
 * ListingProximityCard, envoi ciblé d'une annonce de garde aux gardiens
 * de proximité.
 *
 * Flux : preview (compte + liste) → confirmation explicite (saisie du nombre
 * exact) → send. Aucun envoi tant que l'admin ne clique pas sur Envoyer.
 */
import { proximityEmptyText } from "@/lib/admin/proximityEmpty";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  MAX_RADIUS_KM,
  LARGE_RADIUS_WARN_KM,
  PROXIMITY_DEDUP_DAYS,
  clampRadiusInput,
  needsRadiusConfirmation,
  radiusConfirmationTitle,
} from "@/lib/proximityRadius";
import { SitOwnerAbsenceNotice } from "@/components/admin/OwnerAbsenceBadge";
import { Loader2, Search, Send, AlertTriangle } from "lucide-react";
import { NATIONWIDE_RADIUS_KM } from "../../../supabase/functions/_shared/far-listing";
import {
  CUSTOM_HOOK_MAX,
  CUSTOM_SUBJECT_MAX,
  DEFAULT_AUDIENCE,
  checkCustomHook,
  checkCustomSubject,
  suggestBroadcastTexts,
  type BroadcastAudience,
} from "../../../supabase/functions/_shared/proximity-broadcast";

type BroadcastScope = "radius" | "national";

/** Aucun destinataire en diffusion nationale : dit pourquoi, sans parler de rayon. */
function nationalEmptyText(excludedRecent: number | null | undefined): string {
  const n = Math.max(0, Number(excludedRecent) || 0);
  if (n > 0) return `Les ${n} gardiens ciblés ont déjà reçu cette annonce. Choisissez « Tous les gardiens actifs » pour en toucher d'autres.`;
  return "Aucun gardien actif dans cette audience. Choisissez « Tous les gardiens actifs » pour élargir.";
}

interface PreviewRecipient {
  first_name: string;
  city: string;
  distance_km: number | null;
  email: string;
}
interface PreviewData {
  count: number;
  /** Gardiens du rayon déjà servis pour cette annonce, ou dans les 7 derniers jours. */
  excluded_recent?: number;
  author_first_name: string;
  sit: {
    id: string;
    title: string | null;
    city: string | null;
    excerpt?: string;
    date_range?: string;
    start_date?: string | null;
    end_date?: string | null;
  };
  subject?: string;
  /** Propriétaire à plus de 1 500 km de Paris : la diffusion nationale s'impose. */
  owner_far?: boolean;
  nationwide?: boolean;
  recipients: PreviewRecipient[];
  truncated: boolean;
}

interface ListingProximityCardProps {
  sitId: string;
  initialRadiusKm?: number;
  autoPreview?: boolean;
  hideHeader?: boolean;
  onClose?: () => void;
}

const ListingProximityCard = ({
  sitId,
  initialRadiusKm = 30,
  autoPreview = false,
  hideHeader = false,
  onClose,
}: ListingProximityCardProps) => {
  const [radiusKm, setRadiusKm] = useState<number>(clampRadiusInput(initialRadiusKm));
  // Lot P2 : au-delà de 200 km, le rayon se confirme explicitement dans le dialogue.
  const [radiusConfirmed, setRadiusConfirmed] = useState(false);
  // Lot ANN-6 : deux modes. « Autour de l'annonce » (rayon) ou « Toute la France » (diffusion nationale ciblée).
  const [scope, setScope] = useState<BroadcastScope>("radius");
  const [audience, setAudience] = useState<BroadcastAudience>(DEFAULT_AUDIENCE);
  const [customSubject, setCustomSubject] = useState("");
  const [customHook, setCustomHook] = useState("");
  const scopeTouchedRef = useRef(false);
  const textsTouchedRef = useRef(false);
  const autoSwitchedRef = useRef(false);
  const national = scope === "national";
  const effectiveRadiusKm = national ? NATIONWIDE_RADIUS_KM : radiusKm;
  const subjectCheck = checkCustomSubject(national ? customSubject : "");
  const hookCheck = checkCustomHook(national ? customHook : "");
  const textError = subjectCheck.error || hookCheck.error;
  const radiusNeedsConfirm = needsRadiusConfirmation(effectiveRadiusKm);

  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [descOpen, setDescOpen] = useState(false);


  const extractError = async (error: unknown, data: unknown): Promise<string> => {
    const ctx = (error as { context?: Response } | null)?.context;
    if (ctx && typeof ctx.json === "function") {
      try {
        const body = await ctx.json();
        if (body?.error) return String(body.error);
      } catch { /* ignore */ }
    }
    if ((data as { error?: string })?.error) return String((data as { error: string }).error);
    if ((error as Error)?.message) return String((error as Error).message);
    return "Erreur inconnue.";
  };

  /**
   * Adapte le message d'erreur "coordonnées manquantes" selon l'état réel
   * du profil propriétaire (city/postal_code renseignés ou pas).
   */
  const buildCoordsErrorMessage = async (rawMsg: string): Promise<string> => {
    if (!/coordonn/i.test(rawMsg)) return rawMsg;
    try {
      const { data: sit } = await supabase
        .from("sits")
        .select("user_id")
        .eq("id", sitId)
        .maybeSingle();
      if (!sit?.user_id) return rawMsg;
      const { data: owner } = await supabase
        .from("profiles")
        .select("first_name, city, postal_code")
        .eq("id", sit.user_id)
        .maybeSingle();
      const firstName = owner?.first_name || "le propriétaire";
      const hasCity = !!(owner?.city && String(owner.city).trim().length > 0);
      const hasPostal = !!(owner?.postal_code && String(owner.postal_code).trim().length > 0);
      if (hasCity && hasPostal) {
        return `Cette annonce ne peut pas être diffusée par proximité. Les coordonnées géographiques de ${firstName} ne sont pas encore calculées. Dans /admin/users, ouvrez Actions pour ce membre puis « Recalculer la localisation ». Revenez ensuite prévisualiser les destinataires.`;
      }
      return `Cette annonce ne peut pas être diffusée par proximité. ${firstName} n'a pas complété sa localisation. Demandez-lui de saisir sa ville et son code postal dans son profil.`;
    } catch {
      return rawMsg;
    }
  };

  const buildBody = (
    mode: "preview" | "send",
    ov?: { scope?: BroadcastScope; audience?: BroadcastAudience },
  ) => {
    const isNational = (ov?.scope ?? scope) === "national";
    const body: Record<string, unknown> = {
      mode,
      sit_id: sitId,
      radius_km: isNational ? NATIONWIDE_RADIUS_KM : radiusKm,
    };
    if (isNational) {
      body.audience = ov?.audience ?? audience;
      if (subjectCheck.value) body.custom_subject = subjectCheck.value;
      if (hookCheck.value) body.custom_hook = hookCheck.value;
    }
    return body;
  };

  const handlePreview = async (ov?: { scope?: BroadcastScope; audience?: BroadcastAudience }) => {
    if (!sitId) {
      toast.error("sit_id manquant");
      return;
    }
    setLoading(true);
    setPreview(null);
    setWarningMessage(null);
    let chained = false;
    try {
      const { data, error } = await supabase.functions.invoke(
        "send-listing-proximity",
        {
          body: buildBody("preview", ov),
        },
      );
      if (error || (data as { error?: string })?.error) {
        const msg = await extractError(error, data);
        setWarningMessage(await buildCoordsErrorMessage(msg));
        return;
      }
      const pv = data as PreviewData;
      setPreview(pv);
      const nowNational = (ov?.scope ?? scope) === "national";
      // Propriétaire loin de la France : le rayon autour de l'annonce ne touche
      // personne, on passe seul en diffusion nationale (une fois, sauf choix explicite).
      if (!nowNational && pv.owner_far && pv.count === 0 && !scopeTouchedRef.current && !autoSwitchedRef.current) {
        autoSwitchedRef.current = true;
        chained = true;
        setScope("national");
        void handlePreview({ scope: "national" });
        return;
      }
      // Suggestions d'objet et d'accroche, une fois, tant que l'administrateur n'a rien écrit.
      if (nowNational && !textsTouchedRef.current && pv.sit.city) {
        const sug = suggestBroadcastTexts({
          city: pv.sit.city,
          ownerFirstName: pv.author_first_name,
          startDate: pv.sit.start_date,
          endDate: pv.sit.end_date,
          dateRange: pv.sit.date_range,
        });
        textsTouchedRef.current = true;
        setCustomSubject(sug.subject);
        setCustomHook(sug.hook);
      }
    } catch (err: unknown) {
      setWarningMessage((err as Error)?.message || "Erreur lors de l'aperçu");
    } finally {
      if (!chained) setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!preview) return;
    setConfirmOpen(false);
    setSending(true);
    setWarningMessage(null);
    try {
      const { data, error } = await supabase.functions.invoke(
        "send-listing-proximity",
        {
          body: buildBody("send"),
        },
      );
      if (error || (data as { error?: string })?.error) {
        const msg = await extractError(error, data);
        setWarningMessage(await buildCoordsErrorMessage(msg));
        return;
      }
      const d = data as { queued?: number; targeted?: number; excluded_recent?: number };
      const queued = d.queued ?? 0;
      const excludedRecent = d.excluded_recent ?? 0;
      const parts: string[] = [`${queued} email${queued > 1 ? "s" : ""} mis en file`];
      if (excludedRecent > 0) {
        parts.push(
          `${excludedRecent} écarté${excludedRecent > 1 ? "s" : ""} (déjà servis pour cette annonce ou dans les 7 derniers jours)`,
        );
      }
      toast.success(
        queued > 0
          ? `Diffusion enfilée, ${parts.join(", ")}. L'expédition se fait par la file, en quelques minutes.`
          : `Aucun envoi, ${parts.join(", ")}.`,
      );


      setPreview(null);
      setConfirmInput("");
    } catch (err: unknown) {
      setWarningMessage((err as Error)?.message || "Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  };

  const autoPreviewRef = useRef(false);
  useEffect(() => {
    if (!autoPreview || autoPreviewRef.current) return;
    if (!sitId) return;
    autoPreviewRef.current = true;
    void handlePreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPreview]);

  const subject = (national && subjectCheck.value)
    || preview?.subject
    || (preview
      ? `${preview.author_first_name || "Un propriétaire"} cherche un gardien près de chez vous`
      : "");

  const recipientCount = preview?.count ?? 0;
  const sendLabel = sending
    ? "Envoi en cours…"
    : recipientCount === 0
      ? "Aucun destinataire"
      : `Envoyer les ${recipientCount} email${recipientCount > 1 ? "s" : ""}`;

  const chooseScope = (next: BroadcastScope) => {
    if (next === scope) return;
    scopeTouchedRef.current = true;
    setScope(next);
    setConfirmInput("");
    setRadiusConfirmed(false);
    void handlePreview({ scope: next });
  };
  const chooseAudience = (next: BroadcastAudience) => {
    if (next === audience) return;
    setAudience(next);
    setConfirmInput("");
    setRadiusConfirmed(false);
    void handlePreview({ scope: "national", audience: next });
  };

  const body = (
    <div className="flex-1 overflow-y-auto px-6 py-3 space-y-3 min-h-0">
      <div role="group" aria-label="Portée de la diffusion" className="flex flex-wrap gap-2" data-testid="broadcast-scope">
        <Button
          type="button"
          size="sm"
          variant={national ? "outline" : "default"}
          aria-pressed={!national}
          onClick={() => chooseScope("radius")}
          data-testid="scope-radius"
        >
          Autour de l'annonce
        </Button>
        <Button
          type="button"
          size="sm"
          variant={national ? "default" : "outline"}
          aria-pressed={national}
          onClick={() => chooseScope("national")}
          data-testid="scope-national"
        >
          Toute la France
        </Button>
      </div>

      {national && (
        <div className="space-y-3 rounded-md border border-border bg-muted/20 p-3" data-testid="national-options">
          <p className="text-xs text-muted-foreground">
            Diffusion nationale : les gardiens de toute la France, lieu renseigné ou non. Restent exclus les désabonnés, les adresses supprimées et les gardiens déjà servis pour cette annonce.
          </p>
          <fieldset className="space-y-1.5">
            <legend className="text-xs font-medium">Qui recevra l'annonce</legend>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="radio"
                name="broadcast-audience"
                className="mt-1 accent-primary"
                checked={audience === "recent_90d"}
                onChange={() => chooseAudience("recent_90d")}
                data-testid="audience-recent"
              />
              <span>Gardiens actifs récemment <span className="text-muted-foreground">(vus sur le site depuis 90 jours)</span></span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="radio"
                name="broadcast-audience"
                className="mt-1 accent-primary"
                checked={audience === "all"}
                onChange={() => chooseAudience("all")}
                data-testid="audience-all"
              />
              <span>Tous les gardiens actifs <span className="text-muted-foreground">(y compris ceux qui ne sont pas revenus depuis longtemps)</span></span>
            </label>
          </fieldset>
          <div className="space-y-1.5">
            <Label htmlFor="broadcast-subject" className="text-xs">Objet de l'email (facultatif)</Label>
            <Input
              id="broadcast-subject"
              value={customSubject}
              maxLength={CUSTOM_SUBJECT_MAX + 20}
              onChange={(e) => { textsTouchedRef.current = true; setCustomSubject(e.target.value); }}
              placeholder="Et si votre Noël avait lieu à Papeete ?"
              aria-invalid={!!subjectCheck.error}
              data-testid="custom-subject"
            />
            {subjectCheck.error && <p className="text-xs text-destructive" role="alert">{subjectCheck.error}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="broadcast-hook" className="text-xs">Accroche sous la phrase d'ouverture (facultatif)</Label>
            <textarea
              id="broadcast-hook"
              className="flex min-h-[84px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={customHook}
              onChange={(e) => { textsTouchedRef.current = true; setCustomHook(e.target.value); }}
              aria-invalid={!!hookCheck.error}
              data-testid="custom-hook"
            />
            <p className="text-[11px] text-muted-foreground">{customHook.length} / {CUSTOM_HOOK_MAX} caractères. Laissez vide pour l'email sans accroche.</p>
            {hookCheck.error && <p className="text-xs text-destructive" role="alert">{hookCheck.error}</p>}
          </div>
        </div>
      )}

      <div className="flex items-end gap-3 flex-wrap">
        {!national && (<div className="space-y-1.5 w-28 shrink-0">
          <Label htmlFor="listing-prox-radius" className="text-xs">Rayon (km)</Label>
          <Input
            id="listing-prox-radius"
            type="number"
            min={1}
            max={MAX_RADIUS_KM}
            value={radiusKm}
            onChange={(e) => setRadiusKm(clampRadiusInput(e.target.value))}
          />
          <p className="text-[11px] text-muted-foreground">
            1 000 km et plus : diffusion nationale, tous les gardiens du pays sont visés. Rayon confirmé au-delà de {LARGE_RADIUS_WARN_KM} km (maximum {MAX_RADIUS_KM.toLocaleString("fr-FR")} km). Les gardiens déjà servis pour cette annonce, ou touchés par une diffusion dans les {PROXIMITY_DEDUP_DAYS} derniers jours, sont exclus.
          </p>
        </div>)}
        <Button onClick={() => void handlePreview()} disabled={loading} size="sm" variant="outline">
          {loading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Calcul…</>
          ) : (
            <><Search className="h-4 w-4 mr-2" />Prévisualiser</>
          )}
        </Button>
      </div>

      <SitOwnerAbsenceNotice sitId={sitId} />

      {effectiveRadiusKm >= LARGE_RADIUS_WARN_KM && (
        <Alert variant="default" className="border-warning/40 bg-warning/5 py-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Rayon large : l'envoi peut concerner beaucoup de gardiens. Vérifiez votre segment.
          </AlertDescription>
        </Alert>
      )}

      {warningMessage && (
        <Alert variant="default" className="border-warning/40 bg-warning/5 py-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">{warningMessage}</AlertDescription>
        </Alert>
      )}

      {preview && (
        <div className="space-y-2 pt-2 border-t border-border">
          <div className="flex flex-wrap gap-1.5 text-xs">
            <span
              className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-foreground max-w-full truncate"
              title={preview.sit.title || "(sans titre)"}
            >
              <strong className="truncate">{preview.sit.title || "(sans titre)"}</strong>
            </span>
            {preview.sit.city && (
              <span className="inline-flex items-center rounded-full bg-muted/60 px-2.5 py-1 text-muted-foreground">
                {preview.sit.city}
              </span>
            )}
            <span className="inline-flex items-center rounded-full bg-muted/60 px-2.5 py-1 text-muted-foreground">
              Propriétaire : {preview.author_first_name || "(inconnu)"}
            </span>
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-primary font-medium">
              {preview.count} gardien{preview.count > 1 ? "s" : ""} ciblé{preview.count > 1 ? "s" : ""}
            </span>
            {preview.sit.date_range && (
              <span className="inline-flex items-center rounded-full bg-muted/60 px-2.5 py-1 text-muted-foreground">
                {preview.sit.date_range}
              </span>
            )}
          </div>

          {preview.sit.excerpt && (
            <Collapsible open={descOpen} onOpenChange={setDescOpen}>
              <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <ChevronDown className={`h-3 w-3 transition-transform ${descOpen ? "rotate-180" : ""}`} />
                {descOpen ? "Masquer la description" : "Voir la description"}
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1.5 rounded border border-border bg-muted/20 p-2 text-xs italic text-muted-foreground">
                {preview.sit.excerpt}
              </CollapsibleContent>
            </Collapsible>
          )}

          <p
            className="text-xs italic text-muted-foreground truncate"
            title={subject}
          >
            Objet : {subject}
          </p>

          {preview.count === 0 ? (
            <p className="text-sm text-muted-foreground pt-2" data-testid="proximity-empty">
              {national ? nationalEmptyText(preview.excluded_recent) : proximityEmptyText(preview.excluded_recent, radiusKm)}
            </p>
          ) : (
            <>
              <div className="max-h-[240px] overflow-y-auto border border-border rounded">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead className="h-8">Prénom</TableHead>
                      <TableHead className="h-8">Ville</TableHead>
                      <TableHead className="h-8 text-right">Distance</TableHead>
                      <TableHead className="h-8">Email</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.recipients.map((r) => (
                      <TableRow key={r.email}>
                        <TableCell className="text-xs py-1.5">{r.first_name || "(sans prénom)"}</TableCell>
                        <TableCell className="text-xs py-1.5">{r.city || "·"}</TableCell>
                        <TableCell className="text-xs py-1.5 text-right tabular-nums">{r.distance_km == null ? "lieu non renseigné" : `${r.distance_km} km`}</TableCell>
                        <TableCell className="text-xs py-1.5 font-mono">{r.email}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {preview.truncated && (
                <p className="text-xs italic text-muted-foreground">
                  Liste tronquée pour l'affichage. L'envoi couvrira l'intégralité des {preview.count} destinataires.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );

  const footer = (
    <div className="px-6 py-3 border-t border-border bg-background shrink-0 flex justify-end gap-2">
      {onClose && (
        <Button variant="ghost" onClick={onClose} disabled={sending}>
          Fermer
        </Button>
      )}
      <Button
        onClick={() => {
          setConfirmInput("");
          setRadiusConfirmed(false);
          setConfirmOpen(true);
        }}
        disabled={sending || !preview || recipientCount === 0 || !!textError}
      >
        {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
        {sendLabel}
      </Button>
    </div>
  );

  const content = hideHeader ? (
    <>
      {body}
      {footer}
    </>
  ) : (
    <Card className="border-primary/30 flex flex-col max-h-[85vh] overflow-hidden">
      <CardHeader className="shrink-0">
        <CardTitle className="text-base">
          Envoyer l'annonce aux gardiens du coin
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Cible les gardiens (role sitter/both) dans un rayon autour de l'annonce, exclut le propriétaire,
          les emails supprimés et les opt-out. Aucun envoi tant que vous ne cliquez pas sur Envoyer.
        </p>
      </CardHeader>
      {body}
      {footer}
    </Card>
  );

  return (
    <>
      {content}


      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) {
            setConfirmInput("");
            setRadiusConfirmed(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {radiusNeedsConfirm ? radiusConfirmationTitle(effectiveRadiusKm) : "Confirmer l'envoi aux gardiens du coin"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <p>
                  Pour confirmer l'envoi à{" "}
                  <strong>{preview?.count ?? 0} gardien{(preview?.count ?? 0) > 1 ? "s" : ""}</strong>{" "}
                  autour de l'annonce <strong>{preview?.sit.title || "(sans titre)"}</strong>, saisissez le nombre exact ci-dessous.
                </p>
                <Input
                  autoFocus
                  inputMode="numeric"
                  placeholder={String(preview?.count ?? 0)}
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value.replace(/\D/g, ""))}
                />
                {radiusNeedsConfirm && (
                  <label className="flex items-start gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      data-testid="radius-confirm-checkbox"
                      className="mt-0.5 h-4 w-4 accent-primary"
                      checked={radiusConfirmed}
                      onChange={(e) => setRadiusConfirmed(e.target.checked)}
                    />
                    <span>
                      {national ? "Je diffuse à toute la France" : `Je diffuse à ${effectiveRadiusKm.toLocaleString("fr-FR")} km`}, au-delà de {LARGE_RADIUS_WARN_KM} km.
                    </span>
                  </label>
                )}
                <p className="text-xs text-muted-foreground">
                  Un email personnalisé par destinataire, jamais de copie groupée. Action irréversible.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSend}
              disabled={
                sending ||
                !preview ||
                !!textError ||
                Number(confirmInput) !== preview.count ||
                (radiusNeedsConfirm && !radiusConfirmed)
              }
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Envoi,
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" /> Envoyer maintenant
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>

  );
};

export default ListingProximityCard;
