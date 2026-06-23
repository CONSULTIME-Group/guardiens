import { useState } from "react";
import { Facebook, Link2, MessageCircle, Mail, Check, Share2, Calendar, MapPin, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import { formatSitPeriod } from "@/lib/dateRange";

interface ShareButtonsProps {
  sitId: string;
  /** Slug SEO de l'annonce ; si fourni, il est utilisé à la place de l'UUID dans l'URL partagée */
  sitSlug?: string | null;
  title: string;
  city?: string | null;
  /** Date de début (ISO), affichée en récap pour confirmer ce qui sera partagé */
  startDate?: string | null;
  /** Date de fin (ISO) */
  endDate?: string | null;
  /** Where the share is triggered from, used in analytics */
  source?: string;
  /** Compact icon-only variant for hero/secondary placements */
  compact?: boolean;
  /** Type d'utilisateur consultant la fiche (pour le funnel analytics) */
  viewerType?: "anonymous" | "gardien" | "proprio" | "owner_of_sit" | "admin";
}

type ShareChannel = "facebook" | "whatsapp" | "x" | "email" | "copy" | "native";

/**
 * Boutons de partage social pour une annonce de garde.
 * - Facebook (sharer.php)
 * - WhatsApp (wa.me)
 * - X / Twitter (intent/tweet)
 * - Email (mailto)
 * - Copier le lien
 * - Web Share API native (mobile)
 */
const ShareButtons = ({ sitId, sitSlug, title, city, startDate, endDate, source = "sit_detail", compact = false, viewerType = "anonymous" }: ShareButtonsProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Toujours partager l'URL publique de production, jamais /sits/:id ni la preview.
  // Paramètre volontairement neutre : il contourne le cache social déjà pollué de l'URL nue,
  // sans impacter la canonical SEO servie par PageMeta.
  const seg = (sitSlug && sitSlug.trim().length > 0) ? sitSlug : sitId;
  const shareUrl = `https://guardiens.fr/annonces/${seg}?share=cover-photo-20260522`;
  const trackedShareUrl = (channel: Exclude<ShareChannel, "copy" | "native">) => {
    const url = new URL(shareUrl);
    url.searchParams.set("utm_source", channel === "x" ? "twitter" : channel);
    url.searchParams.set("utm_medium", "share");
    url.searchParams.set("utm_campaign", "listing_share");
    return url.toString();
  };

  // URL de l'image OG personnalisée (servie par l'edge function og-sit, avec photo réelle)
  const supabaseUrl = (supabase as any)?.supabaseUrl || `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co`;
  const visualDownloadUrl = `${supabaseUrl}/functions/v1/og-sit?id=${sitId}&download=1&v=composite-20260522`;

  const periodLabel = formatSitPeriod(startDate, endDate);
  const cityPart = city ? ` à ${city}` : "";
  const datePart = periodLabel ? ` (${periodLabel})` : "";
  const shareText = `${title}${cityPart}${datePart}, une annonce de garde sur Guardiens. Quelqu'un du coin (ou d'ailleurs en France) pour veiller sur la maison ?`;

  const track = (channel: ShareChannel) => {
    try {
      trackEvent("sit_share_clicked", {
        source,
        metadata: { sit_id: sitId, channel, viewer_type: viewerType },
      });
    } catch {
      // silencieux
    }
  };

  const handleFacebook = () => {
    track("facebook");
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(trackedShareUrl("facebook"))}&quote=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank", "noopener,noreferrer,width=600,height=600");
  };

  const handleWhatsapp = () => {
    track("whatsapp");
    const url = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${trackedShareUrl("whatsapp")}`)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleX = () => {
    track("x");
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(trackedShareUrl("x"))}`;
    window.open(url, "_blank", "noopener,noreferrer,width=600,height=600");
  };

  const handleEmail = () => {
    track("email");
    const subject = encodeURIComponent(`${title}, Guardiens`);
    const body = encodeURIComponent(`${shareText}\n\n${trackedShareUrl("email")}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleCopy = async () => {
    track("copy");
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({ title: "Lien copié", description: "Vous pouvez maintenant le partager." });
      setTimeout(() => setCopied(false), 2400);
    } catch {
      toast({ variant: "destructive", title: "Impossible de copier le lien" });
    }
  };

  const handleNative = async () => {
    track("native");
    try {
      await navigator.share({ title, text: shareText, url: shareUrl });
    } catch {
      // user cancelled, silent
    }
  };

  const handleDownloadVisual = async () => {
    try {
      track("copy"); // event analytics dédié à créer si besoin ; on réutilise pour ne pas casser le typage
      setDownloading(true);
      const res = await fetch(visualDownloadUrl);
      if (!res.ok) throw new Error("download failed");
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `guardiens-annonce-${sitId.slice(0, 8)}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
      toast({
        title: "Visuel téléchargé",
        description: "Attachez-le à votre publication Facebook avant de coller le lien.",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Téléchargement impossible",
        description: "Réessayez dans quelques instants.",
      });
    } finally {
      setDownloading(false);
    }
  };

  const hasNativeShare =
    typeof navigator !== "undefined" && typeof (navigator as any).share === "function";

  if (compact) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={hasNativeShare ? handleNative : handleFacebook}
        className="gap-1.5"
        aria-label="Partager cette annonce"
      >
        <Share2 className="h-4 w-4" /> Partager
      </Button>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 md:p-5">
      <div className="flex items-center gap-2 mb-3">
        <Share2 className="h-4 w-4 text-primary" />
        <p className="font-heading font-semibold text-sm">Partagez cette annonce</p>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Plus elle est vue, plus vite vous trouverez un gardien du coin.
      </p>

      {(periodLabel || city) && (
        <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5">
            Vous partagez
          </p>
          <div className="space-y-1">
            {periodLabel && (
              <div className="flex items-center gap-2 font-medium text-foreground">
                <Calendar className="h-4 w-4 text-primary shrink-0" />
                <span>{periodLabel}</span>
              </div>
            )}
            {city && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>{city}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleFacebook}
          className="gap-1.5 justify-start hover:bg-[#1877F2]/10 border-[#1877F2]/30"
        >
          <Facebook className="h-4 w-4 text-[#1877F2]" aria-hidden="true" /> Facebook
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleWhatsapp}
          className="gap-1.5 justify-start hover:bg-[#25D366]/10 border-[#25D366]/30"
        >
          <MessageCircle className="h-4 w-4 text-[#25D366]" aria-hidden="true" /> WhatsApp
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleX}
          className="gap-1.5 justify-start"
        >
          <span className="font-bold text-base leading-none">𝕏</span> X
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleEmail}
          className="gap-1.5 justify-start"
        >
          <Mail className="h-4 w-4" /> Email
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="gap-1.5 justify-start col-span-2 sm:col-span-1"
        >
          {copied ? <Check className="h-4 w-4 text-primary" /> : <Link2 className="h-4 w-4" />}
          {copied ? "Copié" : "Copier le lien"}
        </Button>
      </div>

      {/* Visuel HD personnalisé pour partage manuel (Facebook image post) */}
      <div className="mt-4 rounded-lg border border-dashed border-primary/30 bg-primary/[0.03] p-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground mb-0.5">
              Pour un post Facebook avec image en grand
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Téléchargez le visuel personnalisé (photo de votre maison + dates + animaux),
              attachez-le à votre publication, puis collez le lien dans le texte. L'image sera
              mise en avant et le lien restera bien cliquable.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadVisual}
            disabled={downloading}
            className="gap-1.5 shrink-0"
          >
            <Download className="h-4 w-4" />
            {downloading ? "Préparation…" : "Télécharger le visuel"}
          </Button>
        </div>
      </div>

      {hasNativeShare && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNative}
          className="w-full mt-3 sm:hidden gap-1.5"
        >
          <Share2 className="h-4 w-4" /> Plus d'options de partage
        </Button>
      )}
    </div>
  );
};

export default ShareButtons;
