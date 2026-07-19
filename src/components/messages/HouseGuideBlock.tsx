import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Key, Wifi, Phone, Info, MapPin } from "lucide-react";

interface HouseGuideBlockProps {
  propertyId: string;
  /** Prénom du propriétaire, si connu, pour personnaliser le titre du guide. */
  ownerFirstName?: string | null;
}

const HouseGuideBlock = ({ propertyId, ownerFirstName }: HouseGuideBlockProps) => {
  const [guide, setGuide] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("house_guides")
        .select("*")
        .eq("property_id", propertyId)
        .maybeSingle();
      setGuide(data);
      setLoading(false);
    };
    load();
  }, [propertyId]);

  if (loading || !guide) return null;

  const hasAddress = guide.exact_address || guide.access_codes;
  const hasWifi = guide.wifi_name || guide.wifi_password;
  const hasVet = guide.vet_name || guide.vet_phone;
  const hasContacts = guide.emergency_contact_name || guide.neighbor_name || guide.plumber_phone || guide.electrician_phone;
  const hasInstructions = guide.detailed_instructions || guide.trash_days || guide.heating_instructions || guide.appliance_notes;
  const hasContent = hasAddress || hasWifi || hasVet || hasContacts || hasInstructions;

  if (!hasContent) return null;

  const firstName = ownerFirstName?.trim();
  const title = firstName
    ? `Le guide de la maison de ${firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase()}`
    : "Le guide de la maison";

  return (
    <div
      className="mx-4 my-3 rounded-2xl overflow-hidden border"
      style={{
        backgroundColor: "hsl(var(--hero-paper))",
        borderColor: "hsl(var(--border) / 0.6)",
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-controls="house-guide-content"
        className="w-full flex items-center justify-between gap-3 p-4 hover:bg-primary/[0.04] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset text-left"
      >
        <div className="min-w-0">
          <p className="font-heading text-[15px] font-semibold text-foreground truncate">{title}</p>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Adresse, codes d'accès, WiFi, vétérinaire et consignes.
          </p>
        </div>
        <span className="text-[12px] font-bold text-primary shrink-0" aria-hidden="true">
          {expanded ? "Fermer" : "Ouvrir"}
        </span>
      </button>


      {expanded && (
        <div id="house-guide-content" className="px-4 pb-4 space-y-4 border-t border-border pt-3">
          {hasAddress && (
            <GuideSection icon={MapPin} title="Adresse & accès">
              {guide.exact_address && <p className="text-sm">{guide.exact_address}</p>}
              {guide.access_codes && <p className="text-sm text-muted-foreground whitespace-pre-line">{guide.access_codes}</p>}
            </GuideSection>
          )}

          {hasWifi && (
            <GuideSection icon={Wifi} title="WiFi">
              {guide.wifi_name && <p className="text-sm">Réseau : <span className="font-medium">{guide.wifi_name}</span></p>}
              {guide.wifi_password && <p className="text-sm">Mot de passe : <span className="font-mono bg-accent px-1.5 py-0.5 rounded text-xs">{guide.wifi_password}</span></p>}
            </GuideSection>
          )}

          {hasVet && (
            <GuideSection icon={Phone} title="Vétérinaire">
              {guide.vet_name && <p className="text-sm font-medium">{guide.vet_name}</p>}
              {guide.vet_phone && <p className="text-sm"><a href={`tel:${guide.vet_phone}`} className="text-primary underline">{guide.vet_phone}</a></p>}
              {guide.vet_address && <p className="text-xs text-muted-foreground">{guide.vet_address}</p>}
            </GuideSection>
          )}

          {hasContacts && (
            <GuideSection icon={Phone} title="Contacts utiles">
              {guide.emergency_contact_name && (
                <ContactRow label="Urgence" name={guide.emergency_contact_name} phone={guide.emergency_contact_phone} />
              )}
              {guide.neighbor_name && (
                <ContactRow label="Personne de confiance" name={guide.neighbor_name} phone={guide.neighbor_phone} />
              )}
              {guide.plumber_phone && (
                <ContactRow label="Plombier" name="" phone={guide.plumber_phone} />
              )}
              {guide.electrician_phone && (
                <ContactRow label="Électricien" name="" phone={guide.electrician_phone} />
              )}
            </GuideSection>
          )}

          {hasInstructions && (
            <GuideSection icon={Info} title="Consignes">
              {guide.detailed_instructions && <p className="text-sm whitespace-pre-line">{guide.detailed_instructions}</p>}
              {guide.trash_days && <p className="text-sm"><span className="font-medium">Poubelles :</span> {guide.trash_days}</p>}
              {guide.heating_instructions && <p className="text-sm whitespace-pre-line"><span className="font-medium">Chauffage :</span> {guide.heating_instructions}</p>}
              {guide.appliance_notes && <p className="text-sm whitespace-pre-line"><span className="font-medium">Appareils :</span> {guide.appliance_notes}</p>}
            </GuideSection>
          )}
        </div>
      )}
    </div>
  );
};

const GuideSection = ({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) => (
  <div>
    <div className="flex items-center gap-1.5 mb-1.5">
      <Icon className="h-3.5 w-3.5 text-primary" />
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</span>
    </div>
    <div className="space-y-1 pl-5">{children}</div>
  </div>
);

const ContactRow = ({ label, name, phone }: { label: string; name: string; phone: string }) => (
  <div className="flex items-center justify-between text-sm">
    <span>{label}{name ? `, ${name}` : ""}</span>
    {phone && <a href={`tel:${phone}`} className="text-primary underline text-xs">{phone}</a>}
  </div>
);

export default HouseGuideBlock;
