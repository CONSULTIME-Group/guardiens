import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Key, Home, AlertTriangle, ClipboardList, Heart, Check, Circle } from "lucide-react";

interface GuideData {
  exact_address: string;
  key_instructions: string;
  access_codes: string;
  wifi_name: string;
  wifi_password: string;
  wifi_instructions: string;
  parking_instructions: string;
  trash_days: string;
  heating_instructions: string;
  appliance_notes: string;
  forbidden_zones: string;
  plants_watering: string;
  mail_instructions: string;
  vet_name: string;
  vet_phone: string;
  vet_address: string;
  neighbor_name: string;
  neighbor_phone: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  plumber_phone: string;
  electrician_phone: string;
  detailed_instructions: string;
  owner_message: string;
}

const emptyGuide: GuideData = {
  exact_address: "", key_instructions: "", access_codes: "",
  wifi_name: "", wifi_password: "", wifi_instructions: "",
  parking_instructions: "", trash_days: "",
  heating_instructions: "", appliance_notes: "", forbidden_zones: "",
  plants_watering: "", mail_instructions: "",
  vet_name: "", vet_phone: "", vet_address: "",
  neighbor_name: "", neighbor_phone: "",
  emergency_contact_name: "", emergency_contact_phone: "",
  plumber_phone: "", electrician_phone: "",
  detailed_instructions: "", owner_message: "",
};

const ACCORDION_SECTIONS = [
  {
    id: "access",
    icon: Key,
    title: "Accès & logistique",
    fields: ["exact_address", "key_instructions", "access_codes", "wifi_name", "wifi_password", "wifi_instructions", "parking_instructions", "trash_days"],
  },
  {
    id: "housing",
    icon: Home,
    title: "Logement",
    fields: ["heating_instructions", "appliance_notes", "forbidden_zones", "plants_watering", "mail_instructions"],
  },
  {
    id: "emergency",
    icon: AlertTriangle,
    title: "Contacts d'urgence",
    fields: ["vet_name", "vet_phone", "vet_address", "neighbor_name", "neighbor_phone", "emergency_contact_name", "emergency_contact_phone", "plumber_phone", "electrician_phone"],
  },
  {
    id: "instructions",
    icon: ClipboardList,
    title: "Instructions générales",
    fields: ["detailed_instructions"],
  },
  {
    id: "message",
    icon: Heart,
    title: "Un mot pour votre gardien",
    fields: ["owner_message"],
  },
];

function isSectionComplete(guide: GuideData, fields: string[]): boolean {
  return fields.some(f => !!(guide as any)[f]);
}

const OwnerHouseGuideForm = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [guide, setGuide] = useState<GuideData>(emptyGuide);
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [guideId, setGuideId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const guideRef = useRef(guide);
  const propertyIdRef = useRef(propertyId);
  const guideIdRef = useRef(guideId);

  guideRef.current = guide;
  propertyIdRef.current = propertyId;
  guideIdRef.current = guideId;

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: prop } = await supabase
        .from("properties").select("id").eq("user_id", user.id).limit(1).maybeSingle();
      if (prop) {
        setPropertyId(prop.id);
        const { data: hg } = await supabase
          .from("house_guides").select("*").eq("user_id", user.id).limit(1).maybeSingle();
        if (hg) {
          setGuideId(hg.id);
          setGuide({
            exact_address: hg.exact_address || "",
            key_instructions: hg.key_instructions || "",
            access_codes: hg.access_codes || "",
            wifi_name: hg.wifi_name || "",
            wifi_password: hg.wifi_password || "",
            wifi_instructions: hg.wifi_instructions || "",
            parking_instructions: hg.parking_instructions || "",
            trash_days: hg.trash_days || "",
            heating_instructions: hg.heating_instructions || "",
            appliance_notes: hg.appliance_notes || "",
            forbidden_zones: hg.forbidden_zones || "",
            plants_watering: hg.plants_watering || "",
            mail_instructions: hg.mail_instructions || "",
            vet_name: hg.vet_name || "",
            vet_phone: hg.vet_phone || "",
            vet_address: hg.vet_address || "",
            neighbor_name: hg.neighbor_name || "",
            neighbor_phone: hg.neighbor_phone || "",
            emergency_contact_name: hg.emergency_contact_name || "",
            emergency_contact_phone: hg.emergency_contact_phone || "",
            plumber_phone: hg.plumber_phone || "",
            electrician_phone: hg.electrician_phone || "",
            detailed_instructions: hg.detailed_instructions || "",
            owner_message: hg.owner_message || "",
          });
        }
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const saveGuide = useCallback(async () => {
    if (!user) return;
    const current = guideRef.current;
    let pid = propertyIdRef.current;

    if (!pid) {
      const { data: newProp } = await supabase
        .from("properties").insert({ user_id: user.id }).select("id").single();
      if (!newProp) return;
      pid = newProp.id;
      setPropertyId(pid);
      propertyIdRef.current = pid;
    }

    const payload = { ...current, user_id: user.id, property_id: pid };

    if (guideIdRef.current) {
      await supabase.from("house_guides").update(payload).eq("id", guideIdRef.current);
    } else {
      const { data: created } = await supabase
        .from("house_guides").insert(payload).select("id").single();
      if (created) {
        setGuideId(created.id);
        guideIdRef.current = created.id;
      }
    }
  }, [user]);

  const handleChange = useCallback((field: keyof GuideData, value: string) => {
    setGuide(prev => ({ ...prev, [field]: value }));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveGuide(), 800);
  }, [saveGuide]);

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  if (loading) return <div className="text-sm text-muted-foreground">Chargement du guide...</div>;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-1">Guide de la maison</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Complétez ce guide maintenant. Votre gardien y aura accès à partir du premier jour de garde.
        </p>
      </div>

      <Accordion type="multiple" className="space-y-3">
        {ACCORDION_SECTIONS.map(section => {
          const complete = isSectionComplete(guide, section.fields);
          const Icon = section.icon;
          return (
            <AccordionItem key={section.id} value={section.id} className="bg-card border border-border rounded-xl p-0 overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center gap-2 flex-1">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{section.title}</span>
                </div>
                <span className="mr-2">
                  {complete ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4">
                  {section.id === "access" && <AccessFields guide={guide} onChange={handleChange} />}
                  {section.id === "housing" && <HousingFields guide={guide} onChange={handleChange} />}
                  {section.id === "emergency" && <EmergencyFields guide={guide} onChange={handleChange} />}
                  {section.id === "instructions" && <InstructionsFields guide={guide} onChange={handleChange} />}
                  {section.id === "message" && <MessageFields guide={guide} onChange={handleChange} />}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
};

interface FieldProps {
  guide: GuideData;
  onChange: (field: keyof GuideData, value: string) => void;
}

const Field = ({ label, field, guide, onChange, type = "input", rows = 2, placeholder = "" }: FieldProps & { label: string; field: keyof GuideData; type?: "input" | "textarea"; rows?: number; placeholder?: string }) => (
  <div className="space-y-1">
    <Label className="text-sm font-medium text-foreground">{label}</Label>
    {type === "textarea" ? (
      <Textarea
        value={guide[field]}
        onChange={e => onChange(field, e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="bg-background border border-border rounded-md px-3 py-2 text-sm w-full"
      />
    ) : (
      <Input
        value={guide[field]}
        onChange={e => onChange(field, e.target.value)}
        placeholder={placeholder}
        className="bg-background border border-border rounded-md px-3 py-2 text-sm w-full"
      />
    )}
  </div>
);

const AccessFields = ({ guide, onChange }: FieldProps) => (
  <>
    <Field label="Adresse complète" field="exact_address" guide={guide} onChange={onChange} type="textarea" rows={2} placeholder="L'adresse complète, avec le bâtiment ou l'étage si besoin" />
    <Field label="Instructions pour les clés" field="key_instructions" guide={guide} onChange={onChange} type="textarea" rows={2} placeholder="Où récupérer les clés avant d'arriver, où les laisser en partant" />
    <Field label="Codes d'accès" field="access_codes" guide={guide} onChange={onChange} placeholder="Digicode de l'immeuble, code alarme, badge..." />
    <div className="grid grid-cols-2 gap-3">
      <Field label="Nom du réseau Wifi" field="wifi_name" guide={guide} onChange={onChange} placeholder="MonWifi_5G" />
      <Field label="Mot de passe Wifi" field="wifi_password" guide={guide} onChange={onChange} placeholder="••••••••" />
    </div>
    <Field label="Instructions Wifi supplémentaires" field="wifi_instructions" guide={guide} onChange={onChange} placeholder="Box dans le salon, redémarrer si besoin..." />
    <Field label="Parking" field="parking_instructions" guide={guide} onChange={onChange} placeholder="Place disponible ? Numéro ? Rue à proximité ?" />
    <Field label="Jours de poubelles" field="trash_days" guide={guide} onChange={onChange} placeholder="Poubelles vertes le lundi soir, jaunes le jeudi..." />
  </>
);

const HousingFields = ({ guide, onChange }: FieldProps) => (
  <>
    <Field label="Chauffage" field="heating_instructions" guide={guide} onChange={onChange} type="textarea" rows={2} placeholder="Thermostat dans l'entrée, réglé à 19° en journée..." />
    <Field label="Électroménager & appareils" field="appliance_notes" guide={guide} onChange={onChange} type="textarea" rows={3} placeholder="Lave-vaisselle : programme eco uniquement. Four : ne pas dépasser 200°..." />
    <Field label="Zones interdites" field="forbidden_zones" guide={guide} onChange={onChange} type="textarea" rows={2} placeholder="Chambre du fond interdite aux animaux. Canapé blanc à protéger..." />
    <Field label="Plantes" field="plants_watering" guide={guide} onChange={onChange} type="textarea" rows={2} placeholder="Ficus près de la fenêtre : 1 verre d'eau tous les 3 jours..." />
    <Field label="Courrier" field="mail_instructions" guide={guide} onChange={onChange} placeholder="Relever chaque jour, laisser sur le bureau de l'entrée" />
  </>
);

const EmergencyFields = ({ guide, onChange }: FieldProps) => (
  <>
    <Label className="text-sm font-medium text-foreground">Vétérinaire habituel</Label>
    <div className="grid grid-cols-2 gap-3">
      <Field label="Nom" field="vet_name" guide={guide} onChange={onChange} placeholder="Dr. Dupont" />
      <Field label="Téléphone" field="vet_phone" guide={guide} onChange={onChange} placeholder="01 23 45 67 89" />
    </div>
    <Field label="Adresse de la clinique" field="vet_address" guide={guide} onChange={onChange} placeholder="Adresse de la clinique" />

    <Label className="text-sm font-medium text-foreground mt-2">Voisin de confiance</Label>
    <div className="grid grid-cols-2 gap-3">
      <Field label="Nom" field="neighbor_name" guide={guide} onChange={onChange} placeholder="Marie" />
      <Field label="Téléphone" field="neighbor_phone" guide={guide} onChange={onChange} placeholder="Il/elle a un double des clés" />
    </div>

    <Label className="text-sm font-medium text-foreground mt-2">Contact d'urgence proprio</Label>
    <div className="grid grid-cols-2 gap-3">
      <Field label="Nom" field="emergency_contact_name" guide={guide} onChange={onChange} placeholder="Un proche joignable si vous n'êtes pas disponible" />
      <Field label="Téléphone" field="emergency_contact_phone" guide={guide} onChange={onChange} placeholder="06 12 34 56 78" />
    </div>

    <Field label="Plombier de confiance" field="plumber_phone" guide={guide} onChange={onChange} placeholder="Numéro à appeler en cas de fuite" />
    <Field label="Électricien de confiance" field="electrician_phone" guide={guide} onChange={onChange} placeholder="Numéro à appeler en cas de panne" />
  </>
);

const InstructionsFields = ({ guide, onChange }: FieldProps) => (
  <Field
    label="Instructions détaillées"
    field="detailed_instructions"
    guide={guide}
    onChange={onChange}
    type="textarea"
    rows={6}
    placeholder={"Tout ce que votre gardien doit savoir et qui n'entre pas dans les cases au-dessus.\nLes habitudes de la maison, les petits détails qui changent tout..."}
  />
);

const MessageFields = ({ guide, onChange }: FieldProps) => (
  <Field
    label="Votre message"
    field="owner_message"
    guide={guide}
    onChange={onChange}
    type="textarea"
    rows={4}
    placeholder={"Un mot pour mettre votre gardien à l'aise avant d'arriver.\nLes choses qu'on dit autour d'un café mais qu'on oublie d'écrire."}
  />
);

export default OwnerHouseGuideForm;
