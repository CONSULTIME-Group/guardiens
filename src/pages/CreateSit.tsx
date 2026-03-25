import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import ChipSelect from "@/components/profile/ChipSelect";
import { Calendar, Home, PawPrint, ShieldCheck, MessageSquare, Users, ArrowLeft, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

interface PropertySummary {
  id: string;
  type: string;
  environment: string | null;
  equipments: string[];
  photos: string[];
  description: string | null;
  rooms_count: number | null;
  bedrooms_count: number | null;
}

interface PetSummary {
  name: string;
  species: string;
  breed: string | null;
  photo_url: string | null;
  walk_duration: string | null;
  alone_duration: string | null;
  medication: string | null;
  activity_level: string | null;
}

interface OwnerSummary {
  preferred_sitter_types: string[];
  presence_expected: string | null;
  experience_required: boolean | null;
  visits_allowed: string | null;
  overnight_guest: string | null;
  rules_notes: string | null;
  meeting_preference: string[];
  handover_preference: string | null;
  welcome_notes: string | null;
  news_frequency: string | null;
  news_format: string[];
  communication_notes: string | null;
}

const envLabels: Record<string, string> = {
  city_center: "Centre-ville", suburban: "Périurbain", countryside: "Campagne",
  mountain: "Montagne", seaside: "Bord de mer", forest: "Forêt",
};
const typeLabels: Record<string, string> = {
  apartment: "Appartement", house: "Maison", farm: "Ferme", chalet: "Chalet", other: "Autre",
};
const speciesLabels: Record<string, string> = {
  dog: "🐕 Chien", cat: "🐈 Chat", horse: "🐴 Cheval", bird: "🐦 Oiseau",
  rodent: "🐹 Rongeur", fish: "🐠 Poisson", reptile: "🦎 Reptile",
  farm_animal: "🐄 Animal de ferme", nac: "🐾 NAC",
};
const walkLabels: Record<string, string> = { none: "Aucune", "30min": "30 min/jour", "1h": "1h/jour", "2h_plus": "2h+/jour" };
const aloneLabels: Record<string, string> = { never: "Jamais seul", "2h": "2h max", "6h": "6h max", all_day: "Toute la journée" };

const openToOptions = ["Familles", "Solo", "Couples", "Retraités", "Sans préférence"];

const CreateSit = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [flexibleDates, setFlexibleDates] = useState(false);
  const [flexibilityNote, setFlexibilityNote] = useState("");
  const [specificExpectations, setSpecificExpectations] = useState("");
  const [openTo, setOpenTo] = useState<string[]>([]);

  const [property, setProperty] = useState<PropertySummary | null>(null);
  const [pets, setPets] = useState<PetSummary[]>([]);
  const [ownerProfile, setOwnerProfile] = useState<OwnerSummary | null>(null);
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [propRes, ownerRes, profileRes] = await Promise.all([
        supabase.from("properties").select("*").eq("user_id", user.id).limit(1).maybeSingle(),
        supabase.from("owner_profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("profiles").select("profile_completion").eq("id", user.id).single(),
      ]);

      setProfileCompletion(profileRes.data?.profile_completion || 0);

      if (propRes.data) {
        const p = propRes.data;
        setProperty({
          id: p.id, type: p.type, environment: p.environment,
          equipments: (p as any).equipments || [], photos: (p as any).photos || [],
          description: p.description, rooms_count: p.rooms_count, bedrooms_count: p.bedrooms_count,
        });
        const { data: petsData } = await supabase.from("pets").select("*").eq("property_id", p.id);
        setPets(petsData?.map(a => ({
          name: a.name, species: a.species, breed: a.breed,
          photo_url: a.photo_url, walk_duration: a.walk_duration,
          alone_duration: a.alone_duration, medication: a.medication, activity_level: a.activity_level,
        })) || []);
      }

      if (ownerRes.data) {
        const o = ownerRes.data;
        setOwnerProfile({
          preferred_sitter_types: o.preferred_sitter_types || [],
          presence_expected: o.presence_expected, experience_required: o.experience_required,
          visits_allowed: o.visits_allowed, overnight_guest: o.overnight_guest,
          rules_notes: o.rules_notes, meeting_preference: o.meeting_preference || [],
          handover_preference: o.handover_preference, welcome_notes: o.welcome_notes,
          news_frequency: o.news_frequency, news_format: o.news_format || [],
          communication_notes: o.communication_notes,
        });
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const today = new Date().toISOString().split("T")[0];
  const dateError = startDate && endDate && startDate >= endDate
    ? "La date de fin doit être après la date de début."
    : startDate && startDate < today
    ? "La date de début ne peut pas être dans le passé."
    : null;

  const canPublish = profileCompletion >= 60 && property && title && startDate && endDate && !dateError;

  const handlePublish = async () => {
    if (!user || !property || !canPublish) return;
    setPublishing(true);
    try {
      const expectations = flexibleDates && flexibilityNote
        ? `${specificExpectations}\n\n📅 Flexibilité : ${flexibilityNote}`.trim()
        : specificExpectations;

      const { data: sit, error } = await supabase.from("sits").insert({
        user_id: user.id,
        property_id: property.id,
        title,
        start_date: startDate,
        end_date: endDate,
        flexible_dates: flexibleDates,
        specific_expectations: expectations,
        open_to: openTo,
        status: "published" as any,
      }).select("id").single();

      if (error) throw error;
      toast({ title: "Annonce publiée ! 🎉", description: "Les gardiens peuvent maintenant postuler." });
      navigate(`/sits/${sit.id}`);
    } catch {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de publier l'annonce." });
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return <div className="p-6 md:p-10 max-w-3xl mx-auto text-muted-foreground">Chargement...</div>;
  }

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto animate-fade-in pb-32">
      <Link to="/sits" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Retour à mes gardes
      </Link>

      <h1 className="font-heading text-3xl font-bold mb-2">Publier une garde</h1>
      <p className="text-muted-foreground mb-8">Les informations de votre profil sont pré-remplies. Ajoutez les détails spécifiques à cette garde.</p>

      {profileCompletion < 60 && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-8 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-destructive">Profil incomplet ({profileCompletion}%)</p>
            <p className="text-sm text-muted-foreground mt-1">Complétez votre profil à au moins 60% pour publier une annonce.</p>
            <Link to="/profile" className="text-sm text-primary underline mt-2 inline-block">Compléter mon profil →</Link>
          </div>
        </div>
      )}

      {/* Form fields */}
      <div className="space-y-6">
        <div>
          <Label className="text-sm font-medium">Titre de l'annonce *</Label>
          <Input
            placeholder="Ex : Garde de 2 chats à Écully — 10 jours en août"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="mt-1.5"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium">Date de début *</Label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label className="text-sm font-medium">Date de fin *</Label>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1.5" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Switch checked={flexibleDates} onCheckedChange={setFlexibleDates} />
          <Label className="text-sm">Dates flexibles</Label>
        </div>
        {flexibleDates && (
          <Input
            placeholder="Précisez votre flexibilité — ex : ± 2 jours"
            value={flexibilityNote}
            onChange={e => setFlexibilityNote(e.target.value)}
          />
        )}

        <div>
          <Label className="text-sm font-medium">Attentes spécifiques à cette garde</Label>
          <Textarea
            placeholder="Ce qui est particulier à cette garde, en plus de ce qui est déjà dans votre profil"
            value={specificExpectations}
            onChange={e => setSpecificExpectations(e.target.value)}
            className="mt-1.5"
          />
        </div>

        <div>
          <Label className="text-sm font-medium mb-2 block">Annonce ouverte à</Label>
          <ChipSelect options={openToOptions} selected={openTo} onChange={setOpenTo} />
        </div>
      </div>

      {/* Pre-filled summaries */}
      <div className="mt-10 space-y-6">
        <h2 className="font-heading text-xl font-semibold">Résumé depuis votre profil</h2>

        {/* Housing */}
        <SummaryCard icon={Home} title="Le logement" editLink="/profile">
          {property ? (
            <div className="space-y-2">
              <p className="text-sm">{typeLabels[property.type] || property.type} · {envLabels[property.environment || ""] || property.environment}</p>
              {property.rooms_count ? <p className="text-sm text-muted-foreground">{property.rooms_count} pièces · {property.bedrooms_count} chambres</p> : null}
              {property.equipments.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {property.equipments.slice(0, 6).map(eq => (
                    <span key={eq} className="px-2 py-0.5 rounded-full bg-accent text-xs">{eq}</span>
                  ))}
                </div>
              )}
              {property.photos.length > 0 && (
                <img src={property.photos[0]} alt="Logement" className="w-24 h-24 rounded-lg object-cover mt-2" />
              )}
            </div>
          ) : <p className="text-sm text-muted-foreground italic">Aucun logement renseigné</p>}
        </SummaryCard>

        {/* Animals */}
        <SummaryCard icon={PawPrint} title="Les animaux" editLink="/profile">
          {pets.length > 0 ? (
            <div className="space-y-3">
              {pets.map((pet, i) => (
                <div key={i} className="flex items-center gap-3">
                  {pet.photo_url && <img src={pet.photo_url} alt={pet.name} className="w-10 h-10 rounded-full object-cover" />}
                  <div>
                    <p className="text-sm font-medium">{speciesLabels[pet.species]?.split(" ")[0]} {pet.name}{pet.breed ? ` — ${pet.breed}` : ""}</p>
                    <p className="text-xs text-muted-foreground">
                      {[
                        pet.walk_duration && pet.walk_duration !== "none" ? walkLabels[pet.walk_duration] + " de balade" : null,
                        pet.alone_duration ? aloneLabels[pet.alone_duration] : null,
                        pet.medication ? "Médication" : "Pas de médication",
                      ].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground italic">Aucun animal renseigné</p>}
        </SummaryCard>

        {/* Rules */}
        <SummaryCard icon={ShieldCheck} title="Règles de la maison" editLink="/profile">
          {ownerProfile ? (
            <div className="text-sm space-y-1">
              {ownerProfile.presence_expected && <p>Présence : {ownerProfile.presence_expected}</p>}
              {ownerProfile.visits_allowed && <p>Visites : {ownerProfile.visits_allowed}</p>}
              {ownerProfile.overnight_guest && <p>Invités : {ownerProfile.overnight_guest}</p>}
              {ownerProfile.rules_notes && <p className="text-muted-foreground">{ownerProfile.rules_notes}</p>}
              {!ownerProfile.presence_expected && !ownerProfile.visits_allowed && (
                <p className="text-muted-foreground italic">Aucune règle renseignée</p>
              )}
            </div>
          ) : <p className="text-sm text-muted-foreground italic">Aucune règle renseignée</p>}
        </SummaryCard>

        {/* Sitter profile wanted */}
        <SummaryCard icon={Users} title="Profil gardien souhaité" editLink="/profile">
          {ownerProfile ? (
            <div className="text-sm space-y-1">
              {ownerProfile.preferred_sitter_types.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {ownerProfile.preferred_sitter_types.map(t => (
                    <span key={t} className="px-2 py-0.5 rounded-full bg-accent text-xs">{t}</span>
                  ))}
                </div>
              )}
              {ownerProfile.experience_required && <p>Expérience requise</p>}
            </div>
          ) : <p className="text-sm text-muted-foreground italic">Non renseigné</p>}
        </SummaryCard>

        {/* Communication */}
        <SummaryCard icon={MessageSquare} title="Communication" editLink="/profile">
          {ownerProfile ? (
            <div className="text-sm space-y-1">
              {ownerProfile.meeting_preference.length > 0 && <p>Rencontre : {ownerProfile.meeting_preference.join(", ")}</p>}
              {ownerProfile.handover_preference && <p>Passage de relais : {ownerProfile.handover_preference}</p>}
              {ownerProfile.news_frequency && <p>Fréquence des nouvelles : {ownerProfile.news_frequency}</p>}
              {ownerProfile.news_format.length > 0 && <p>Format : {ownerProfile.news_format.join(", ")}</p>}
            </div>
          ) : <p className="text-sm text-muted-foreground italic">Non renseigné</p>}
        </SummaryCard>
      </div>

      {/* Publish button */}
      <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-card border-t border-border p-4 z-40">
        <div className="max-w-3xl mx-auto">
          <Button
            onClick={handlePublish}
            disabled={!canPublish || publishing}
            className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90"
          >
            {publishing ? "Publication en cours..." : "Publier l'annonce"}
          </Button>
        </div>
      </div>
    </div>
  );
};

const SummaryCard = ({ icon: Icon, title, editLink, children }: {
  icon: React.ElementType; title: string; editLink: string; children: React.ReactNode;
}) => (
  <div className="bg-card rounded-lg border border-border p-5">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="font-heading text-sm font-semibold">{title}</h3>
      </div>
      <Link to={editLink} className="text-xs text-primary hover:underline">Modifier dans mon profil</Link>
    </div>
    {children}
  </div>
);

export default CreateSit;
