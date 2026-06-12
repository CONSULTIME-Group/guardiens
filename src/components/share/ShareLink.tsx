import { useState } from "react";
import { Facebook, Link2, Mail, MessageCircle, Share2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";

interface ShareLinkProps {
  url: string;
  title: string;
  text?: string;
  source?: string;
  compact?: boolean;
  className?: string;
}

/**
 * Boutons de partage génériques pour pages éditoriales (ville, race, article, guide…).
 * Pour les annonces, utilisez plutôt ShareButtons (avec contexte garde et OG dédié).
 */
const ShareLink = ({ url, title, text, source = "editorial", compact = false, className }: ShareLinkProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const shareText = text || title;

  const trackedUrl = (channel: string) => {
    try {
      const u = new URL(url);
      u.searchParams.set("utm_source", channel);
      u.searchParams.set("utm_medium", "share");
      u.searchParams.set("utm_campaign", source);
      return u.toString();
    } catch {
      return url;
    }
  };

  const track = (channel: string) => {
    try { trackEvent("editorial_share_clicked", { source, metadata: { channel, url } }); } catch { /* noop */ }
  };

  const open = (href: string) => window.open(href, "_blank", "noopener,noreferrer,width=600,height=600");

  const handleFacebook = () => {
    track("facebook");
    open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(trackedUrl("facebook"))}&quote=${encodeURIComponent(shareText)}`);
  };
  const handleWhatsapp = () => {
    track("whatsapp");
    open(`https://wa.me/?text=${encodeURIComponent(`${shareText} ${trackedUrl("whatsapp")}`)}`);
  };
  const handleEmail = () => {
    track("email");
    window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${shareText}\n\n${trackedUrl("email")}`)}`;
  };
  const handleCopy = async () => {
    track("copy");
    try {
      await navigator.clipboard.writeText(trackedUrl("copy"));
      setCopied(true);
      toast({ title: "Lien copié" });
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({ title: "Impossible de copier", variant: "destructive" });
    }
  };
  const handleNative = async () => {
    track("native");
    if (navigator.share) {
      try { await navigator.share({ title, text: shareText, url: trackedUrl("native") }); } catch { /* user cancel */ }
    } else {
      handleCopy();
    }
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-1 ${className || ""}`}>
        <Button variant="ghost" size="icon" aria-label="Partager" onClick={handleNative}><Share2 className="w-4 h-4" /></Button>
        <Button variant="ghost" size="icon" aria-label="Copier le lien" onClick={handleCopy}>
          {copied ? <Check className="w-4 h-4 text-success" /> : <Link2 className="w-4 h-4" />}
        </Button>
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className || ""}`}>
      <Button variant="outline" size="sm" onClick={handleFacebook}>
        <Facebook className="w-4 h-4 mr-2" /> Facebook
      </Button>
      <Button variant="outline" size="sm" onClick={handleWhatsapp}>
        <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
      </Button>
      <Button variant="outline" size="sm" onClick={handleEmail}>
        <Mail className="w-4 h-4 mr-2" /> Email
      </Button>
      <Button variant="outline" size="sm" onClick={handleCopy}>
        {copied ? <Check className="w-4 h-4 mr-2 text-success" /> : <Link2 className="w-4 h-4 mr-2" />}
        {copied ? "Lien copié" : "Copier le lien"}
      </Button>
    </div>
  );
};

export default ShareLink;
