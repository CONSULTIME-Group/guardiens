import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Eye, Loader2, Sparkles, Bold, Link as LinkIcon, MailCheck, Copy, AlertTriangle, Check, User } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { MassEmailFiltersPanel } from "@/components/admin/mass-email/MassEmailFilters";
import type { MassEmailFilters, Segment } from "@/components/admin/mass-email/filters.types";
import { SEGMENT_LABELS } from "@/components/admin/mass-email/filters.types";

interface MassEmail {
  id: string;
  created_at: string;
  segment: string;
  subject: string;
  body?: string | null;
  cta_label?: string | null;
  cta_url?: string | null;
  recipients_count: number;
  status: string;
  enqueued_count?: number | null;
  sent_count?: number | null;
  failed_count?: number | null;
  skipped_count?: number | null;
}

const SPAM_TRIGGERS = ["gratuit", "urgent", "gagnez", "cliquez ici", "promo", "offre limitée", "100%", "argent facile", "félicitations"];


type StatusMeta = {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  className?: string;
};

const STATUS_META: Record<string, StatusMeta> = {
  pending: { label: "En attente", variant: "outline" },
  enqueuing: { label: "Mise en file", variant: "secondary" },
  sending: { label: "En cours", variant: "secondary", className: "bg-info-soft text-info-foreground border-transparent" },
  paused: { label: "En pause", variant: "outline", className: "bg-warning-soft text-warning-foreground border-transparent" },
  done: { label: "Terminé", variant: "default" },
  sent: { label: "Envoyé", variant: "default" },
  error: { label: "Erreur", variant: "destructive" },
  cancelled: { label: "Annulée", variant: "outline", className: "bg-muted text-muted-foreground border-transparent line-through" },
};

const CANCELLABLE_STATUSES = new Set(["sending", "paused", "enqueuing"]);

// Campagnes prédéfinies
const OSER_SUBJECT = "Et si vous osiez demander, vous aussi ?";
const OSER_BODY = `Bonjour,

Vous connaissez ce moment : un rendez-vous qui tombe mal, un week-end qui s'annonce, et personne pour passer nourrir le chat ou sortir le chien. On encaisse, on s'organise seul, on n'ose pas déranger.

Pourtant, autour de vous, il y a des gens prêts à donner un coup de main, gratuitement, simplement, parce que ça leur fait plaisir.

À Hyères, <strong>Annie</strong> vient de proposer de partager son savoir avec qui en aurait besoin. Et autour d'elle, on voit aussi passer une <strong>séance de Reiki</strong> à échanger contre un service, des <strong>cours de pain maison</strong>, un <strong>coup de main pour un déménagement</strong>, un <strong>café & écoute</strong> partagé un dimanche, ou encore quelques heures pour <strong>arroser les plantes</strong> ou <strong>réceptionner un colis</strong>.

C'est ça, l'entraide chez Guardiens : des gens du coin, des animaux à choyer, des petits services qui font une vraie différence. Pas d'argent, pas d'agence, pas de pression.

La seule chose qui manque encore ? <strong>Votre demande à vous.</strong>

Trois minutes suffisent pour la publier. Et très souvent, c'est la première réponse reçue qui change tout, qui prouve qu'on n'est pas seul, que ça marche, qu'on peut compter sur les autres.

Pour comprendre comment ça fonctionne concrètement, <a href="https://guardiens.fr/actualites/petites-missions-entraide-guardiens?utm_source=mass_email&utm_campaign=oser-2026-05&utm_content=article" style="color:#2C6E49;font-weight:600;text-decoration:underline">lisez notre article dédié aux petites missions d'entraide</a>.

Et si c'était aujourd'hui ?

À très vite,
L'équipe Guardiens.`;

const ENTRAIDE_SUBJECT = "L'entraide entre gardiens, c'est ici et c'est gratuit";
const ENTRAIDE_BODY = `Bonjour,

Vous avez une question sur l'éducation de votre animal ? Un doute sur une santé passagère ? Besoin d'un conseil pour un voyage, un déménagement, ou simplement un coup de main pour un arrosage de plantes ?

L'espace Conseil et coup de main est fait pour cela.

Ce n'est pas réservé aux experts : c'est la communauté qui répond, et parfois des professionnels du monde animal aussi. Parmi les personnes inscrites, il y a déjà des soigneurs, des éducateurs, des comportementalistes et d'autres passionnés qui partagent leur expérience librement.

Et ce n'est qu'un début. Petit à petit, nous allons intégrer davantage de professionnels : toiletteurs, vétérinaires, soigneurs, éducateurs, comportementalistes. Ils pourront répondre aux questions de la communauté et vous pourrez aussi les contacter directement via leur espace professionnel.

L'essentiel reste le même : poser une question, échanger, recevoir de l'aide. C'est simple, c'est humain, et c'est gratuit.

Cet espace est gratuit. Il le restera toujours. C'est l'essence même du site : l'entraide et le réseau entre gens qui aiment les animaux.

N'hésitez pas : une question est souvent le début d'une belle rencontre.

À très vite,
L'équipe Guardiens`;

interface CampaignPreset {
  key: string;
  label: string;
  segment: Segment;
  filters: MassEmailFilters;
  subject: string;
  body: string;
  ctaEnabled: boolean;
  ctaLabel: string;
  ctaUrl: string;
  utmEnabled: boolean;
  utmCampaign: string;
  utmContent: string;
}

const CAMPAIGN_PRESETS: CampaignPreset[] = [
  {
    key: "oser",
    label: "Oser demander",
    segment: "tous",
    filters: {},
    subject: OSER_SUBJECT,
    body: OSER_BODY,
    ctaEnabled: true,
    ctaLabel: "Publier une mission",
    ctaUrl: "https://guardiens.fr/entraide/nouvelle",
    utmEnabled: true,
    utmCampaign: "oser-2026-05",
    utmContent: "cta",
  },
  {
    key: "entraide",
    label: "Entraide gratuite",
    segment: "tous",
    filters: { respect_product_optout: true },
    subject: ENTRAIDE_SUBJECT,
    body: ENTRAIDE_BODY,
    ctaEnabled: true,
    ctaLabel: "Poser ma question",
    ctaUrl: "https://guardiens.fr/petites-missions/creer?type=besoin",
    utmEnabled: true,
    utmCampaign: "entraide-gratuite-2025-07",
    utmContent: "cta",
  },
];

const AdminMassEmails = () => {
  // Form state, pré-rempli avec la campagne "Oser demander"
  const [segment, setSegment] = useState<Segment>("tous");
  const [filters, setFilters] = useState<MassEmailFilters>({});
  const [subject, setSubject] = useState(OSER_SUBJECT);
  const [body, setBody] = useState(OSER_BODY);
  const [ctaEnabled, setCtaEnabled] = useState(true);
  const [ctaLabel, setCtaLabel] = useState("Publier une mission");
  const [ctaUrl, setCtaUrl] = useState("https://guardiens.fr/entraide/nouvelle");
  const [utmEnabled, setUtmEnabled] = useState(true);
  const [utmCampaign, setUtmCampaign] = useState("oser-2026-05");
  const [utmContent, setUtmContent] = useState("cta");

  // UI state
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [sending, setSending] = useState(false);
  const [activePreset, setActivePreset] = useState<string>("oser");

  // Assistant IA
  const [aiObjective, setAiObjective] = useState("");
  const [aiAudience, setAiAudience] = useState("");
  const [aiTone, setAiTone] = useState("chaleureux");
  const [aiKeyPoints, setAiKeyPoints] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [subjectSuggestions, setSubjectSuggestions] = useState<string[]>([]);

  // Test send
  const [testLoading, setTestLoading] = useState(false);

  // Ref textarea corps (mise en forme)
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);
  // Ref panneau IA (scroll)
  const aiPanelRef = useRef<HTMLDivElement | null>(null);

  // Pré-brief depuis l'analyse IA
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const objective = searchParams.get("ai_objective");
    const points = searchParams.get("ai_points");
    if (!objective && !points) return;
    if (objective) setAiObjective(objective.slice(0, 400));
    if (points) setAiKeyPoints(points.slice(0, 400));
    toast.success("Brief pré-rempli depuis l'analyse IA");
    const next = new URLSearchParams(searchParams);
    next.delete("ai_objective");
    next.delete("ai_points");
    setSearchParams(next, { replace: true });
    requestAnimationFrame(() => {
      aiPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const callAi = useCallback(async (payload: Record<string, unknown>) => {
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-draft-mass-email", { body: payload });
      if (error) throw new Error((error as { message?: string }).message || "Erreur assistant IA");
      if (data?.error) throw new Error(data.error);
      return data;
    } catch (e) {
      toast.error((e as Error).message || "Erreur assistant IA");
      return null;
    } finally {
      setAiLoading(false);
    }
  }, []);

  const handleAiGenerate = async () => {
    if (!aiObjective.trim()) { toast.error("Précisez l'objectif de l'email."); return; }
    const data = await callAi({
      action: "generate",
      brief: {
        objective: aiObjective.trim(),
        audience: aiAudience.trim(),
        tone: aiTone.trim(),
        key_points: aiKeyPoints.trim(),
      },
    });
    if (data?.subject) setSubject(String(data.subject).slice(0, 100));
    if (data?.body) setBody(String(data.body).slice(0, 2000));
    if (data?.subject || data?.body) toast.success("Brouillon généré.");
  };

  const handleAiRefine = async (action: "shorten" | "warmer" | "proofread") => {
    if (!body.trim()) return;
    const data = await callAi({ action, subject, body });
    if (data?.subject) setSubject(String(data.subject).slice(0, 100));
    if (data?.body) setBody(String(data.body).slice(0, 2000));
    if (data?.subject || data?.body) toast.success("Brouillon mis à jour.");
  };

  const handleAiSubjects = async () => {
    const data = await callAi({ action: "subjects", subject, body });
    const list = Array.isArray(data?.subjects) ? data.subjects.slice(0, 3) : [];
    if (list.length === 0) { toast.error("Aucune proposition reçue."); return; }
    setSubjectSuggestions(list.map(String));
  };

  const applyBodyTransform = (transform: (sel: string) => string, fallback?: string) => {
    const el = bodyRef.current;
    const current = body;
    let start = current.length;
    let end = current.length;
    if (el) { start = el.selectionStart ?? current.length; end = el.selectionEnd ?? current.length; }
    const selected = current.slice(start, end);
    const replacement = selected ? transform(selected) : (fallback ?? transform(""));
    const next = (current.slice(0, start) + replacement + current.slice(end)).slice(0, 2000);
    setBody(next);
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      const caret = Math.min(2000, start + replacement.length);
      el.setSelectionRange(caret, caret);
    });
  };

  const handleBold = () => {
    applyBodyTransform((s) => `<strong>${s}</strong>`, "<strong></strong>");
  };

  const handleLink = () => {
    const url = window.prompt("URL du lien (https:// obligatoire)");
    if (!url) return;
    if (!url.startsWith("https://")) {
      toast.error("L'URL doit commencer par https://");
      return;
    }
    applyBodyTransform((s) => `<a href="${url}">${s || url}</a>`);
  };

  const handleInsertFirstName = () => {
    applyBodyTransform((s) => `{prénom}${s}`, "{prénom}");
  };



  const handleSendTest = async () => {
    if (!subject.trim() || body.trim().length < 20) return;
    setTestLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-send-test-email", {
        body: {
          subject: subject.trim(),
          body: body.trim(),
          cta_label: ctaEnabled ? ctaLabel.trim() : undefined,
          cta_url: ctaEnabled ? withUtm(ctaUrl.trim()) : undefined,
        },
      });
      if (error) throw new Error((error as { message?: string }).message || "Erreur d'envoi test");
      if (data?.error) throw new Error(data.error);
      toast.success(`Email de test envoyé à ${data?.to ?? "vous"}`);
    } catch (e) {
      toast.error((e as Error).message || "Erreur d'envoi test");
    } finally {
      setTestLoading(false);
    }
  };


  const applyPreset = useCallback((key: string) => {
    const p = CAMPAIGN_PRESETS.find((x) => x.key === key);
    if (!p) return;
    setSegment(p.segment);
    setFilters(p.filters);
    setSubject(p.subject);
    setBody(p.body);
    setCtaEnabled(p.ctaEnabled);
    setCtaLabel(p.ctaLabel);
    setCtaUrl(p.ctaUrl);
    setUtmEnabled(p.utmEnabled);
    setUtmCampaign(p.utmCampaign);
    setUtmContent(p.utmContent);
    setActivePreset(key);
  }, []);

  // History
  const [history, setHistory] = useState<MassEmail[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    const { data } = await supabase
      .from("mass_emails")
      .select("id, created_at, segment, subject, body, cta_label, cta_url, recipients_count, status, enqueued_count, sent_count, failed_count, skipped_count")
      .order("created_at", { ascending: false })
      .limit(20);
    setHistory((data as MassEmail[]) || []);
    setHistoryLoading(false);
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // Cancel campaign
  const [cancelTarget, setCancelTarget] = useState<MassEmail | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const handleCancelCampaign = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      const { error } = await supabase.functions.invoke("cancel-mass-email", {
        body: { campaign_id: cancelTarget.id },
      });
      if (error) throw error;
      toast.success("Campagne annulée");
      setCancelTarget(null);
      await loadHistory();
    } catch (e) {
      toast.error(`Annulation impossible : ${(e as Error).message ?? "erreur inconnue"}`);
    } finally {
      setCancelling(false);
    }
  };

  const handleDuplicate = useCallback((row: MassEmail) => {
    setSegment((row.segment as Segment) || "tous");
    setFilters({});
    setSubject((row.subject || "").slice(0, 100));
    setBody((row.body || "").slice(0, 2000));
    const hasCta = !!(row.cta_label && row.cta_url);
    setCtaEnabled(hasCta);
    setCtaLabel(row.cta_label || "");
    setCtaUrl(row.cta_url || "");
    setActivePreset("");
    toast.success("Campagne dupliquée, prête à éditer");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);




  // Debounced recipient count
  useEffect(() => {
    const timer = setTimeout(async () => {
      setCountLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("send-mass-email", {
          body: { mode: "count", segment, filters },
        });
        if (error) throw error;
        setRecipientCount(data?.count ?? 0);
      } catch {
        setRecipientCount(null);
      }
      setCountLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [segment, filters]);

  const isValid =
    subject.trim().length > 0 &&
    body.trim().length >= 20 &&
    (recipientCount ?? 0) > 0 &&
    (!ctaEnabled || (ctaLabel.trim().length > 0 && ctaUrl.startsWith("https://")));

  /** Slugifie l'objet pour générer un utm_campaign par défaut. */
  const autoCampaign = subject
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    .slice(0, 40) || "campagne";

  const effectiveCampaign = (utmCampaign.trim() || autoCampaign);

  /** Ajoute les UTM à une URL guardiens.fr ; laisse intacte une URL externe. */
  const withUtm = (rawUrl: string): string => {
    try {
      const u = new URL(rawUrl);
      const isInternal = /(^|\.)guardiens\.fr$|lovable\.app$/.test(u.hostname);
      if (!isInternal || !utmEnabled) return rawUrl;
      u.searchParams.set("utm_source", "email");
      u.searchParams.set("utm_medium", "transac");
      u.searchParams.set("utm_campaign", effectiveCampaign);
      u.searchParams.set("utm_content", utmContent.trim() || "cta");
      return u.toString();
    } catch {
      return rawUrl;
    }
  };

  const handleSend = async () => {
    setConfirmOpen(false);
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-mass-email", {
        body: {
          mode: "send",
          segment,
          filters,
          subject: subject.trim(),
          body: body.trim(),
          cta_label: ctaEnabled ? ctaLabel.trim() : undefined,
          cta_url: ctaEnabled ? withUtm(ctaUrl.trim()) : undefined,
        },
      });
      if (error) throw error;
      toast.success(`Envoi lancé, ${data.sent} emails en cours d'expédition`);
      setSubject(""); setBody(""); setCtaEnabled(false); setCtaLabel(""); setCtaUrl("");
      loadHistory();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  };

  const previewHtml = buildPreviewHtml(subject, body, ctaEnabled ? ctaLabel : undefined, ctaEnabled ? withUtm(ctaUrl) : undefined);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Envois groupés</h1>




      <div className="flex flex-wrap gap-2">
        {CAMPAIGN_PRESETS.map((p) => (
          <Button
            key={p.key}
            variant={activePreset === p.key ? "default" : "outline"}
            size="sm"
            onClick={() => applyPreset(p.key)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          <MassEmailFiltersPanel
            segment={segment}
            setSegment={setSegment}
            filters={filters}
            setFilters={setFilters}
          />

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Estimation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium text-primary">
                {countLoading ? (
                  <span className="flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Calcul…
                  </span>
                ) : (
                  `→ ${recipientCount ?? ","} destinataires correspondent à ces critères`
                )}
              </p>
            </CardContent>
          </Card>

          {/* Assistant IA */}
          <div ref={aiPanelRef} />
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> Rédiger avec l'IA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ai-objective">Objectif</Label>
                  <Textarea
                    id="ai-objective"
                    rows={2}
                    placeholder="Ex : inviter à publier une première petite mission"
                    value={aiObjective}
                    onChange={(e) => setAiObjective(e.target.value.slice(0, 400))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ai-audience">Audience</Label>
                  <Input
                    id="ai-audience"
                    placeholder="Ex : membres inscrits n'ayant jamais publié"
                    value={aiAudience}
                    onChange={(e) => setAiAudience(e.target.value.slice(0, 200))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ai-tone">Ton</Label>
                  <Input
                    id="ai-tone"
                    placeholder="Ex : chaleureux, direct"
                    value={aiTone}
                    onChange={(e) => setAiTone(e.target.value.slice(0, 100))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ai-key-points">Points clés</Label>
                  <Textarea
                    id="ai-key-points"
                    rows={2}
                    placeholder="Ex : gratuit, 3 minutes, exemples concrets"
                    value={aiKeyPoints}
                    onChange={(e) => setAiKeyPoints(e.target.value.slice(0, 400))}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Button size="sm" onClick={handleAiGenerate} disabled={aiLoading || !aiObjective.trim()}>
                  {aiLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  Générer le brouillon
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleAiRefine("shorten")} disabled={aiLoading || !body.trim()}>
                  Raccourcir
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleAiRefine("warmer")} disabled={aiLoading || !body.trim()}>
                  Réchauffer le ton
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleAiRefine("proofread")} disabled={aiLoading || !body.trim()}>
                  Corriger
                </Button>
                <Button size="sm" variant="outline" onClick={handleAiSubjects} disabled={aiLoading || !body.trim()}>
                  3 idées d'objet
                </Button>
              </div>

              {subjectSuggestions.length > 0 && (
                <div className="pt-2 space-y-1.5">
                  <p className="text-xs text-muted-foreground">Cliquez pour appliquer :</p>
                  <div className="flex flex-wrap gap-2">
                    {subjectSuggestions.map((s, i) => (
                      <Button
                        key={i}
                        size="sm"
                        variant="secondary"
                        className="h-auto py-1.5 px-3 text-xs whitespace-normal text-left"
                        onClick={() => { setSubject(s.slice(0, 100)); setSubjectSuggestions([]); }}
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Message */}
          <Card>
            <CardHeader><CardTitle className="text-base">Message</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="subject">Objet</Label>
                <Input
                  id="subject"
                  placeholder="Objet de l'email"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value.slice(0, 100))}
                  maxLength={100}
                />
                <p className="text-xs text-muted-foreground text-right">{subject.length}/100</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="body">Corps du message</Label>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={handleBold}>
                    <Bold className="h-3.5 w-3.5 mr-1.5" /> Gras
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={handleLink}>
                    <LinkIcon className="h-3.5 w-3.5 mr-1.5" /> Lien
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={handleInsertFirstName}>
                    <User className="h-3.5 w-3.5 mr-1.5" /> Insérer {"{prénom}"}
                  </Button>
                </div>
                <Textarea
                  id="body"
                  ref={bodyRef}
                  placeholder="Rédigez votre message ici…"
                  value={body}
                  onChange={(e) => setBody(e.target.value.slice(0, 2000))}
                  maxLength={2000}
                  rows={8}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Mise en forme : gras et liens via les boutons ci-dessus. Les retours à la ligne sont conservés.
                </p>
                <p className="text-xs text-muted-foreground">
                  Astuce : insérez {"{prénom}"} pour personnaliser (remplacé par le prénom de chaque destinataire, ou « Bonjour » si le prénom est absent).
                </p>
                <p className="text-xs text-muted-foreground text-right">{body.length}/2000</p>
              </div>



              <div className="flex items-center justify-between pt-2 border-t border-border">
                <Label htmlFor="cta-toggle" className="text-sm">Ajouter un bouton CTA</Label>
                <Switch id="cta-toggle" checked={ctaEnabled} onCheckedChange={setCtaEnabled} />
              </div>

              {ctaEnabled && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="cta-label">Libellé du bouton</Label>
                      <Input id="cta-label" placeholder="Découvrir" value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="cta-url">URL cible</Label>
                      <Input id="cta-url" placeholder="https://guardiens.fr/..." value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} />
                      {ctaUrl && !ctaUrl.startsWith("https://") && (
                        <p className="text-xs text-destructive">L'URL doit commencer par https://</p>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="utm-toggle" className="text-sm">Tracking UTM (liens internes)</Label>
                        <p className="text-xs text-muted-foreground">Ajouté automatiquement aux URL guardiens.fr</p>
                      </div>
                      <Switch id="utm-toggle" checked={utmEnabled} onCheckedChange={setUtmEnabled} />
                    </div>

                    {utmEnabled && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="utm-campaign">utm_campaign</Label>
                          <Input
                            id="utm-campaign"
                            placeholder={autoCampaign}
                            value={utmCampaign}
                            onChange={(e) => setUtmCampaign(e.target.value.replace(/[^a-z0-9-]/gi, "-").toLowerCase())}
                          />
                          <p className="text-xs text-muted-foreground">Auto depuis l'objet si vide</p>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="utm-content">utm_content</Label>
                          <Input
                            id="utm-content"
                            placeholder="cta"
                            value={utmContent}
                            onChange={(e) => setUtmContent(e.target.value.replace(/[^a-z0-9-_]/gi, "-").toLowerCase())}
                          />
                          <p className="text-xs text-muted-foreground">Ex : cta, article, footer</p>
                        </div>
                        {ctaUrl.startsWith("https://") && (
                          <div className="col-span-2 text-xs text-muted-foreground break-all bg-muted/40 p-2 rounded">
                            <span className="font-medium">URL finale :</span> {withUtm(ctaUrl)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-5 space-y-3 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex-1 space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  Prêt à envoyer la campagne « {CAMPAIGN_PRESETS.find((p) => p.key === activePreset)?.label || "Personnalisée"} »
                </p>
                <p className="text-xs text-muted-foreground">
                  Tout est pré-rempli et tracé (campaign : <code className="font-mono">{effectiveCampaign}</code>).
                  Cliquez ci-dessous pour ouvrir l'aperçu, puis confirmez l'envoi à{" "}
                  <strong className="text-foreground">{recipientCount ?? ","}</strong> destinataires.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={testLoading || !subject.trim() || body.trim().length < 20}
              onClick={handleSendTest}
            >
              {testLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <MailCheck className="h-4 w-4 mr-2" />}
              M'envoyer un test
            </Button>
            <Button
              className="w-full h-14 text-base font-semibold shadow-md hover:shadow-lg transition-shadow"
              size="lg"
              disabled={!isValid || sending}
              onClick={() => setPreviewOpen(true)}
            >
              <Eye className="h-5 w-5 mr-2" />
              Aperçu complet & envoi à {recipientCount ?? "…"} destinataires
            </Button>
            {!isValid && (
              <p className="text-xs text-muted-foreground text-center">
                Renseignez l'objet, un corps d'au moins 20 caractères, et au moins 1 destinataire.
              </p>
            )}
          </div>
        </div>

        {/* Right column – History */}
        <div>
          <Card>
            <CardHeader><CardTitle className="text-base">Envois précédents</CardTitle></CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : history.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Aucun envoi pour l'instant.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Segment</TableHead>
                      <TableHead>Objet</TableHead>
                      <TableHead className="text-right">Dest.</TableHead>
                      <TableHead>Progression</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((row) => {
                      const meta = STATUS_META[row.status] ?? { label: row.status, variant: "outline" as const };
                      const sent = row.sent_count ?? 0;
                      const enq = row.enqueued_count ?? 0;
                      const failed = row.failed_count ?? 0;
                      const skipped = row.skipped_count ?? 0;
                      const hasCounters = enq > 0 || sent > 0 || failed > 0 || skipped > 0;
                      const canCancel = CANCELLABLE_STATUSES.has(row.status);
                      return (
                        <TableRow key={row.id}>
                          <TableCell className="text-xs whitespace-nowrap">
                            {format(new Date(row.created_at), "dd MMM yyyy", { locale: fr })}
                          </TableCell>
                          <TableCell className="text-xs">{SEGMENT_LABELS[row.segment] || row.segment}</TableCell>
                          <TableCell className="text-xs max-w-[120px] truncate">{row.subject}</TableCell>
                          <TableCell className="text-xs text-right">{row.recipients_count}</TableCell>
                          <TableCell className="text-xs">
                            {hasCounters ? (
                              <span className="tabular-nums">
                                {sent}
                                {enq > 0 ? ` / ${enq}` : ""}
                                {(failed > 0 || skipped > 0) && (
                                  <span className="text-muted-foreground">
                                    {failed > 0 ? ` · ${failed} échec${failed > 1 ? "s" : ""}` : ""}
                                    {skipped > 0 ? ` · ${skipped} ignoré${skipped > 1 ? "s" : ""}` : ""}
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">–</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={meta.variant} className={`text-[10px] ${meta.className ?? ""}`}>
                              {meta.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {canCancel ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => setCancelTarget(row)}
                              >
                                Annuler
                              </Button>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Écran d'aperçu complet (récap + rendu) avant la confirmation finale */}
      <Dialog
        open={previewOpen}
        onOpenChange={(open) => {
          setPreviewOpen(open);
          if (!open) setConfirmInput("");
        }}
      >
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle>Aperçu complet de l'envoi</DialogTitle>
            <DialogDescription>
              Vérifiez chaque élément. L'envoi est définitif et irréversible une fois confirmé.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-6 pb-6">
            {/* Colonne récap */}
            <div className="space-y-4">
              <div className="rounded-lg border border-border p-4 space-y-3">
                <h3 className="text-sm font-semibold">Audience</h3>
                <div className="text-sm space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Segment</span>
                    <Badge variant="outline">{SEGMENT_LABELS[segment] || segment}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Destinataires</span>
                    <span className="font-semibold text-base">{recipientCount ?? 0}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border p-4 space-y-3">
                <h3 className="text-sm font-semibold">Contenu</h3>
                <div className="text-sm space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Objet</span>
                    <span className="font-medium text-right max-w-[60%] truncate">{subject || ","}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Corps</span>
                    <span>{body.length} car.</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Bouton CTA</span>
                    <span>{ctaEnabled ? `« ${ctaLabel} »` : "Aucun"}</span>
                  </div>
                </div>
              </div>

              {ctaEnabled && (
                <div className="rounded-lg border border-border p-4 space-y-2">
                  <h3 className="text-sm font-semibold">Lien & tracking</h3>
                  <div className="text-xs text-muted-foreground break-all bg-muted/40 p-2 rounded">
                    {withUtm(ctaUrl) || ","}
                  </div>
                  {utmEnabled && (
                    <div className="flex flex-wrap gap-1.5 text-xs">
                      <Badge variant="secondary">campaign : {effectiveCampaign}</Badge>
                      <Badge variant="secondary">content : {utmContent || "cta"}</Badge>
                    </div>
                  )}
                </div>
              )}

              <div className="rounded-lg border border-amber-500/40 bg-warning-soft/40 dark:bg-amber-950/10 p-4 text-xs text-warning-foreground dark:text-amber-200">
                <strong>Action irréversible.</strong> Une fois confirmé, l'email part immédiatement
                vers <strong>{recipientCount ?? 0}</strong> destinataires. Aucun rappel possible.
              </div>
            </div>

            {/* Colonne rendu HTML */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Rendu de l'email</h3>
              <div
                className="border border-border rounded-lg overflow-hidden bg-white max-h-[60vh] overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          </div>

          <div className="border-t border-border px-6 py-4 flex flex-col sm:flex-row gap-2 justify-end bg-muted/30">
            <Button variant="ghost" onClick={() => setPreviewOpen(false)}>
              Retour à l'édition
            </Button>
            <Button
              onClick={() => {
                setConfirmInput("");
                setConfirmOpen(true);
              }}
              disabled={!isValid}
            >
              Procéder à la confirmation finale
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation finale, saisie obligatoire du nombre de destinataires */}
      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) setConfirmInput("");
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dernier feu vert</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <p>
                  Pour confirmer l'envoi à <strong>{recipientCount ?? 0} destinataires</strong>{" "}
                  ({SEGMENT_LABELS[segment] || segment}), saisissez le nombre exact ci-dessous.
                </p>
                <Input
                  autoFocus
                  inputMode="numeric"
                  placeholder={String(recipientCount ?? 0)}
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value.replace(/\D/g, ""))}
                />
                {ctaEnabled && utmEnabled && ctaUrl.startsWith("https://") && (
                  <p className="text-xs text-muted-foreground">
                    Tracking : <code>{effectiveCampaign}</code> / <code>{utmContent || "cta"}</code>
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSend}
              disabled={
                sending ||
                recipientCount === null ||
                Number(confirmInput) !== recipientCount
              }
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Envoi en cours…
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

      {/* Confirmation d'annulation de campagne */}
      <AlertDialog open={!!cancelTarget} onOpenChange={(open) => { if (!open && !cancelling) setCancelTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler cette campagne ?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <div><span className="text-muted-foreground">Objet :</span> {cancelTarget?.subject}</div>
                <div>
                  <span className="text-muted-foreground">Statut actuel :</span>{" "}
                  {cancelTarget ? (STATUS_META[cancelTarget.status]?.label ?? cancelTarget.status) : ""}
                </div>
                <p className="text-muted-foreground">
                  Les emails déjà envoyés ne peuvent pas être rappelés. Les destinataires restants ne recevront rien.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Retour</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleCancelCampaign(); }}
              disabled={cancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelling ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Annulation…</>
              ) : (
                "Annuler la campagne"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

function buildPreviewHtml(subject: string, body: string, ctaLabel?: string, ctaUrl?: string): string {
  const escapedSubject = (subject || "Objet de l'email").replace(/</g, "&lt;");
  // body : on autorise le HTML inline (mêmes règles que l'edge function buildHtml)
  const renderedBody = body || "Corps du message…";
  const ctaBlock = ctaLabel && ctaUrl
    ? `<tr><td align="center" style="padding:32px 0 8px">
<a href="${ctaUrl}" style="display:inline-block;padding:14px 32px;background-color:#2C6E49;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;font-size:16px;box-shadow:0 4px 12px rgba(44,110,73,0.25)">${ctaLabel.replace(/</g, "&lt;")}</a>
</td></tr>
<tr><td align="center" style="padding:0 0 8px"><p style="margin:0;font-size:12px;color:#888">3 minutes, c'est tout.</p></td></tr>`
    : "";

  return `<div style="background-color:#FAF9F6;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.04)">
<tr><td style="padding:0;background:linear-gradient(135deg,#2C6E49 0%,#3a8a5d 100%);height:6px;line-height:6px;font-size:0">&nbsp;</td></tr>
<tr><td style="padding:24px 32px 8px;text-align:center;background-color:#ffffff">
<img src="https://guardiens.fr/logo-guardiens.png" alt="Guardiens" width="110" style="display:block;margin:0 auto;height:auto"/>
</td></tr>
<tr><td style="padding:20px 32px 8px">
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#1a1a1a;font-weight:700">${escapedSubject}</h1>
<div style="margin:0;font-size:14px;line-height:1.75;color:#3a3a3a;white-space:pre-line">${renderedBody}</div>
</td></tr>
${ctaBlock}
<tr><td style="padding:24px 32px"></td></tr>
<tr><td style="padding:18px 32px;border-top:1px solid #eee;background-color:#FAF9F6;text-align:center">
<p style="margin:0 0 4px;font-size:12px;color:#555;font-weight:600">Guardiens</p>
<p style="margin:0;font-size:11px;color:#888">L'entraide locale entre propriétaires et gardiens d'animaux.</p>
</td></tr>
</table>
</td></tr></table></div>`;
}

export default AdminMassEmails;
