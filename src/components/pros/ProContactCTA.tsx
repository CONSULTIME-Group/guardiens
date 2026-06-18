import { Button } from "@/components/ui/button";
import { Phone, Mail, Globe } from "lucide-react";

interface Props {
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  urgences24_7?: boolean;
}

// CTA contact unifié, sticky en bas sur mobile, inline en haut sur desktop.
export default function ProContactCTA({ phone, email, website, urgences24_7 }: Props) {
  if (!phone && !email && !website) return null;
  const telHref = phone ? `tel:${phone.replace(/\s+/g, "")}` : null;
  const mailHref = email ? `mailto:${email}` : null;

  return (
    <>
      <div className="hidden md:flex flex-wrap gap-2 mt-4">
        {telHref && (
          <Button asChild>
            <a href={telHref} aria-label={`Appeler ${phone}`}>
              <Phone className="w-4 h-4 mr-2" aria-hidden /> Appeler
            </a>
          </Button>
        )}
        {mailHref && (
          <Button asChild variant="outline">
            <a href={mailHref}>
              <Mail className="w-4 h-4 mr-2" aria-hidden /> Écrire
            </a>
          </Button>
        )}
        {website && (
          <Button asChild variant="outline">
            <a href={website} target="_blank" rel="noopener noreferrer">
              <Globe className="w-4 h-4 mr-2" aria-hidden /> Site web
            </a>
          </Button>
        )}
      </div>

      {(telHref || mailHref) && (
        <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur border-t border-border p-3 flex gap-2">
          {telHref && (
            <Button asChild className="flex-1">
              <a href={telHref}>
                <Phone className="w-4 h-4 mr-2" aria-hidden /> Appeler
              </a>
            </Button>
          )}
          {mailHref && (
            <Button asChild variant="outline" className="flex-1">
              <a href={mailHref}>
                <Mail className="w-4 h-4 mr-2" aria-hidden /> Écrire
              </a>
            </Button>
          )}
        </div>
      )}
    </>
  );
}
