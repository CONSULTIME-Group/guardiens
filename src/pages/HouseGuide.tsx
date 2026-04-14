import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Home, Phone, Key, Wifi, Trash2, Thermometer, Info } from "lucide-react";
import { Helmet } from "react-helmet-async";

interface GuideData {
  id?: string;
  property_id: string;
  user_id: string;
  exact_address: string;
  access_codes: string;
  wifi_name: string;
  wifi_password: string;
  vet_name: string;
  vet_phone: string;
  vet_address: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  neighbor_name: string;
  neighbor_phone: string;
  plumber_phone: string;
  electrician_phone: string;
  detailed_instructions: string;
  trash_days: string;
  heating_instructions: string;
  appliance_notes: string;
}

const emptyGuide = (propertyId: string, userId: string): GuideData => ({
  property_id: propertyId,
  user_id: userId,
  exact_address: "",
  access_codes: "",
  wifi_name: "",
  wifi_password: "",
  vet_name: "",
  vet_phone: "",
  vet_address: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  neighbor_name: "",
  neighbor_phone: "",
  plumber_phone: "",
  electrician_phone: "",
  detailed_instructions: "",
  trash_days: "",
  heating_instructions: "",
  appliance_notes: "",
});

const Section = ({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) => (
  <div className="mt-6">
    <div className="flex items-center gap-2 mb-3">
      <Icon className="h-4 w-4 text-primary" />
      <h3 className="font-heading text-base font-semibold">{title}</h3>
    </div>
    <div className="space-y-3">{children}</div>
  </div>
);

const Field = ({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) => (
  <div>
    <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
    {type === "textarea" ? (
      <Textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="text-sm" rows={3} />
    ) : (
      <Input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="text-sm" />
    )}
  </div>
);

const HouseGuide = () => {
  const { propertyId } = useParams<{ propertyId: string }>();
  const { user } = useAuth();
  const [guide, setGuide] = useState<GuideData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!propertyId || !user) return;
    const load = async () => {
      const { data } = await supabase
        .from("house_guides")
        .select("*")
        .eq("property_id", propertyId)
        .maybeSingle();
      setGuide(data ? (data as any) : emptyGuide(propertyId, user.id));
      setLoading(false);
    };
    load();
  }, [propertyId, user]);

  const update = (field: keyof GuideData, value: string) => {
    if (!guide) return;
    setGuide({ ...guide, [field]: value });
  };

  const handleSave = async () => {
    if (!guide || !user) return;
    setSaving(true);
    const payload = { ...guide, user_id: user.id };
    delete (payload as any).id;

    if (guide.id) {
      await supabase.from("house_guides").update(payload as any).eq("id", guide.id);
    } else {
      const { data } = await supabase.from("house_guides").insert(payload as any).select("id").single();
      if (data) setGuide({ ...guide, id: data.id });
    }
    toast({ title: "Guide sauvegardé ✓" });
    setSaving(false);
  };

  if (loading) return <div className="p-6 text-muted-foreground">Chargement...</div>;
  if (!guide) return <div className="p-6">Guide introuvable.</div>;

  return (
    <div className="p-6 md:p-10 max-w-2xl mx-auto animate-fade-in pb-32">
      <Helmet><meta name="robots" content="noindex, nofollow" /></Helmet>
      <Link to="/sits" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Retour
      </Link>

      <h1 className="font-heading text-2xl font-bold mb-1">Guide de la maison</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Ces informations seront partagées avec le gardien une fois la garde confirmée.
      </p>

      <Section icon={Home} title="Adresse & accès">
        <Field label="Adresse exacte" value={guide.exact_address} onChange={v => update("exact_address", v)} placeholder="12 rue des Lilas, 75011 Paris" />
        <Field label="Codes d'accès (digicode, portail, boîte à clé...)" value={guide.access_codes} onChange={v => update("access_codes", v)} placeholder="Digicode : 1234A, boîte à clé sous le pot" type="textarea" />
      </Section>

      <Section icon={Wifi} title="WiFi">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nom du réseau" value={guide.wifi_name} onChange={v => update("wifi_name", v)} placeholder="MaisonDupont_5G" />
          <Field label="Mot de passe" value={guide.wifi_password} onChange={v => update("wifi_password", v)} placeholder="••••••••" />
        </div>
      </Section>

      <Section icon={Phone} title="Contacts utiles">
        <p className="text-xs text-muted-foreground -mt-1">Vétérinaire</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nom" value={guide.vet_name} onChange={v => update("vet_name", v)} placeholder="Dr. Martin" />
          <Field label="Téléphone" value={guide.vet_phone} onChange={v => update("vet_phone", v)} placeholder="01 23 45 67 89" />
        </div>
        <Field label="Adresse du vétérinaire" value={guide.vet_address} onChange={v => update("vet_address", v)} placeholder="5 avenue Victor Hugo" />

        <p className="text-xs text-muted-foreground mt-3">Contact d'urgence</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nom" value={guide.emergency_contact_name} onChange={v => update("emergency_contact_name", v)} placeholder="Marie (voisine)" />
          <Field label="Téléphone" value={guide.emergency_contact_phone} onChange={v => update("emergency_contact_phone", v)} placeholder="06 12 34 56 78" />
        </div>

        <p className="text-xs text-muted-foreground mt-3">Voisin</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nom" value={guide.neighbor_name} onChange={v => update("neighbor_name", v)} placeholder="Jean (2ème étage)" />
          <Field label="Téléphone" value={guide.neighbor_phone} onChange={v => update("neighbor_phone", v)} placeholder="06 98 76 54 32" />
        </div>

        <p className="text-xs text-muted-foreground mt-3">Artisans</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Plombier" value={guide.plumber_phone} onChange={v => update("plumber_phone", v)} placeholder="01 23 45 67 89" />
          <Field label="Électricien" value={guide.electrician_phone} onChange={v => update("electrician_phone", v)} placeholder="01 98 76 54 32" />
        </div>
      </Section>

      <Section icon={Info} title="Consignes de la maison">
        <Field label="Instructions détaillées" value={guide.detailed_instructions} onChange={v => update("detailed_instructions", v)}
          placeholder="Arroser les plantes tous les 2 jours, fermer les volets le soir..." type="textarea" />
        <Field label="Jours de poubelle" value={guide.trash_days} onChange={v => update("trash_days", v)} placeholder="Mardi et vendredi matin" />
        <Field label="Chauffage / climatisation" value={guide.heating_instructions} onChange={v => update("heating_instructions", v)}
          placeholder="Thermostat dans le couloir, régler à 20°C" type="textarea" />
        <Field label="Notes sur les appareils" value={guide.appliance_notes} onChange={v => update("appliance_notes", v)}
          placeholder="Machine à laver : programme 30°, séchoir interdit pour la laine..." type="textarea" />
      </Section>

      <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-card border-t border-border p-4 z-40 md:pb-4 pb-20">
        <div className="max-w-2xl mx-auto">
          <Button className="w-full h-12 text-base font-semibold gap-2" onClick={handleSave} disabled={saving}>
            <Save className="h-5 w-5" />
            {saving ? "Enregistrement..." : "Enregistrer le guide"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HouseGuide;
