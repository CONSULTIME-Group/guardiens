import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PRO_CATEGORIES, type ProCategory } from "@/lib/proCategories";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export default function ProOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [siretLookup, setSiretLookup] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    raison_sociale: "",
    siret: "",
    category: "" as ProCategory | "",
    city: "",
    postal_code: "",
    description: "",
    phone: "",
    website: "",
    email_contact: "",
    urgences_24_7: false,
    tarif_min: "" as string,
    tarif_max: "" as string,
    tarif_note: "",
    diplomes: "", // texte libre, 1 par ligne
    ordre_number: "",
    zone_radius_km: "20",
    horaires_text: "",
  });

  const handleSiretLookup = async () => {
    const siret = form.siret.replace(/\s/g, "");
    if (siret.length !== 14 || !/^\d{14}$/.test(siret)) {
      toast.error("Le SIRET doit contenir 14 chiffres.");
      return;
    }
    setSiretLookup(true);
    try {
      const res = await fetch(
        `https://recherche-entreprises.api.gouv.fr/search?q=${siret}&page=1&per_page=1`
      );
      if (!res.ok) throw new Error("API indisponible");
      const json = await res.json();
      const entreprise = json?.results?.[0];
      if (!entreprise) {
        toast.error("Aucune entreprise trouvée pour ce SIRET.");
        return;
      }
      const siege = entreprise.siege ?? {};
      setForm((f) => ({
        ...f,
        raison_sociale:
          f.raison_sociale ||
          entreprise.nom_complet ||
          entreprise.nom_raison_sociale ||
          "",
        city: f.city || siege.libelle_commune || "",
        postal_code: f.postal_code || siege.code_postal || "",
      }));
      toast.success("Informations entreprise pré-remplies.");
    } catch (err: any) {
      toast.error("Recherche SIRET impossible. Saisissez les infos manuellement.");
    } finally {
      setSiretLookup(false);
    }
  };


  useEffect(() => {
    if (!user) {
      // Inscription dédiée pro : on envoie vers /inscription (création de compte)
      // avec redirection automatique vers le formulaire pro après signup.
      navigate("/inscription?role=owner&redirect=/pros/inscription&as=pro");
      return;
    }
    // F-09: empêche la création d'une 2e fiche pro
    (async () => {
      const { data: existing } = await supabase
        .from("pro_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (existing) {
        toast.info("Vous avez déjà une fiche pro. Redirection vers votre espace.");
        navigate("/pros/mon-espace", { replace: true });
      }
    })();
  }, [user, navigate]);

  const update = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.raison_sociale || !form.category) {
      toast.error("Raison sociale et catégorie sont obligatoires.");
      return;
    }
    // F-11 : au moins un moyen de contact public
    if (!form.phone && !form.email_contact && !form.website) {
      toast.error("Renseignez au moins un contact (téléphone, email ou site web).");
      return;
    }
    if (!form.city) {
      toast.error("La ville est obligatoire pour le référencement local.");
      return;
    }

    setLoading(true);
    try {
      let logoUrl: string | null = null;
      if (logoFile) {
        const ext = logoFile.name.split(".").pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("pro-logos")
          .upload(path, logoFile, { upsert: true });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("pro-logos").getPublicUrl(path);
        logoUrl = pub.publicUrl;
      }

      // F-12 : slug stable + anti-collision (retry avec suffixe incrémenté)
      const baseSlug = `${slugify(form.raison_sociale)}-${slugify(form.city)}`;
      let attempt = 0;
      let lastError: any = null;
      while (attempt < 5) {
        const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
        const { error } = await supabase.from("pro_profiles").insert({
          user_id: user.id,
          slug,
          raison_sociale: form.raison_sociale,
          siret: form.siret || null,
          category: form.category as ProCategory,
          city: form.city || null,
          postal_code: form.postal_code || null,
          description: form.description || null,
          phone: form.phone || null,
          website: form.website || null,
          email_contact: form.email_contact || null,
          urgences_24_7: form.urgences_24_7,
          logo_url: logoUrl,
          tarif_min: form.tarif_min ? parseInt(form.tarif_min, 10) : null,
          tarif_max: form.tarif_max ? parseInt(form.tarif_max, 10) : null,
          tarif_note: form.tarif_note || null,
          diplomes: form.diplomes
            ? form.diplomes.split("\n").map((s) => s.trim()).filter(Boolean)
            : [],
          ordre_number: form.ordre_number || null,
          zone_radius_km: form.zone_radius_km ? parseInt(form.zone_radius_km, 10) : 20,
          horaires: form.horaires_text ? { text: form.horaires_text } : {},
          status: "pending",
        });
        if (!error) {
          lastError = null;
          break;
        }
        // 23505 = unique_violation (collision sur slug)
        if ((error as any).code !== "23505") {
          lastError = error;
          break;
        }
        attempt++;
        lastError = error;
      }
      if (lastError) throw lastError;

      toast.success("Fiche envoyée. Modération sous 48h.");
      navigate("/pros/mon-espace");
    } catch (err: any) {
      toast.error(err?.message ?? "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Inscrire mon activité pro | Guardiens</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <main className="container mx-auto px-4 py-10 max-w-2xl min-w-0">
        <h1 className="text-3xl font-display font-bold mb-2">Inscrire mon activité pro</h1>
        <p className="text-muted-foreground mb-6">
          Annuaire en phase bêta. Validation manuelle sous 48 h pour garantir la qualité.
        </p>

        <Card className="mb-6 border-accent/30 bg-accent/5">
          <CardContent className="p-4 text-sm space-y-1">
            <p className="font-semibold text-foreground">Pros fondateurs</p>
            <p className="text-muted-foreground leading-relaxed">
              Les premiers pros inscrits bénéficient d'un accès privilégié à l'annuaire et à ses futures fonctionnalités (mise en avant, statistiques, prise de rendez-vous). Les conditions d'abonnement seront annoncées avant tout changement.
            </p>
          </CardContent>
        </Card>

        {/* Stepper */}
        <div className="flex items-center justify-between mb-6" aria-label="Progression de l'inscription">
          {[
            { n: 1, label: "Identité" },
            { n: 2, label: "Présentation" },
            { n: 3, label: "Contact & tarifs" },
          ].map((s, i) => (
            <div key={s.n} className="flex items-center flex-1">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold shrink-0 ${
                  step >= s.n
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
                aria-current={step === s.n ? "step" : undefined}
              >
                {s.n}
              </div>
              <span className={`ml-2 text-sm ${step === s.n ? "font-semibold" : "text-muted-foreground"} hidden sm:inline`}>
                {s.label}
              </span>
              {i < 2 && <div className={`h-px flex-1 mx-2 ${step > s.n ? "bg-primary" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        <Card>
          <CardContent className="p-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (step < 3) {
                  if (step === 1) {
                    if (!form.raison_sociale || !form.category || !form.city) {
                      toast.error("Raison sociale, catégorie et ville sont obligatoires.");
                      return;
                    }
                  }
                  setStep((s) => (s + 1) as 1 | 2 | 3);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                } else {
                  handleSubmit(e);
                }
              }}
              className="space-y-5"
            >
              {step === 1 && (
                <>
                  <div>
                    <Label htmlFor="raison">Raison sociale ou nom commercial *</Label>
                    <Input
                      id="raison"
                      value={form.raison_sociale}
                      onChange={(e) => update("raison_sociale", e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Label>Catégorie principale *</Label>
                    <Select value={form.category} onValueChange={(v) => update("category", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir une catégorie" />
                      </SelectTrigger>
                      <SelectContent>
                        {PRO_CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="siret">SIRET</Label>
                    <div className="flex gap-2">
                      <Input
                        id="siret"
                        value={form.siret}
                        onChange={(e) => update("siret", e.target.value.replace(/\D/g, ""))}
                        placeholder="14 chiffres"
                        maxLength={14}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleSiretLookup}
                        disabled={siretLookup || form.siret.length !== 14}
                      >
                        {siretLookup ? "Recherche…" : "Pré-remplir"}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Récupère automatiquement raison sociale, ville et code postal depuis la base officielle entreprises.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="logo">Logo (optionnel, 2 Mo max)</Label>
                    <Input
                      id="logo"
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        if (f && f.size > 2 * 1024 * 1024) {
                          toast.error("Le logo dépasse 2 Mo.");
                          return;
                        }
                        setLogoFile(f);
                      }}
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">Ville *</Label>
                      <Input
                        id="city"
                        value={form.city}
                        onChange={(e) => update("city", e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="cp">Code postal</Label>
                      <Input
                        id="cp"
                        value={form.postal_code}
                        onChange={(e) => update("postal_code", e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div>
                    <Label htmlFor="desc">Présentation de votre activité</Label>
                    <Textarea
                      id="desc"
                      rows={6}
                      value={form.description}
                      onChange={(e) => update("description", e.target.value)}
                      placeholder="Spécialités, parcours, ce qui vous distingue…"
                    />
                  </div>

                  <div>
                    <Label htmlFor="hor">Horaires d'ouverture</Label>
                    <Textarea id="hor" rows={3} value={form.horaires_text}
                      onChange={(e) => update("horaires_text", e.target.value)}
                      placeholder="Ex : Lun-Ven 9h-19h, Sam 9h-13h" />
                  </div>

                  <div>
                    <Label htmlFor="dipl">Diplômes et certifications (1 par ligne)</Label>
                    <Textarea id="dipl" rows={3} value={form.diplomes}
                      onChange={(e) => update("diplomes", e.target.value)}
                      placeholder={"ACACED\nDocteur vétérinaire (Maisons-Alfort, 2015)"} />
                  </div>

                  <div>
                    <Label htmlFor="ord">N° d'inscription à l'Ordre (vétérinaires)</Label>
                    <Input id="ord" value={form.ordre_number}
                      onChange={(e) => update("ordre_number", e.target.value)}
                      placeholder="Ex : 12345" />
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="urg"
                      checked={form.urgences_24_7}
                      onCheckedChange={(v) => update("urgences_24_7", !!v)}
                    />
                    <Label htmlFor="urg" className="cursor-pointer">
                      Je propose des urgences 24/7
                    </Label>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <p className="text-sm text-muted-foreground">
                    Au moins un moyen de contact public est obligatoire.
                  </p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone">Téléphone pro</Label>
                      <Input
                        id="phone"
                        value={form.phone}
                        onChange={(e) => update("phone", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email contact</Label>
                      <Input
                        id="email"
                        type="email"
                        value={form.email_contact}
                        onChange={(e) => update("email_contact", e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="web">Site web</Label>
                    <Input
                      id="web"
                      type="url"
                      value={form.website}
                      onChange={(e) => update("website", e.target.value)}
                      placeholder="https://"
                    />
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="tmin">Tarif min (€)</Label>
                      <Input id="tmin" type="number" min={0}
                        value={form.tarif_min}
                        onChange={(e) => update("tarif_min", e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="tmax">Tarif max (€)</Label>
                      <Input id="tmax" type="number" min={0}
                        value={form.tarif_max}
                        onChange={(e) => update("tarif_max", e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="zone">Rayon (km)</Label>
                      <Input id="zone" type="number" min={1} max={300}
                        value={form.zone_radius_km}
                        onChange={(e) => update("zone_radius_km", e.target.value)} />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="tnote">Précisions tarifs</Label>
                    <Input id="tnote" value={form.tarif_note}
                      onChange={(e) => update("tarif_note", e.target.value)}
                      placeholder="Ex : forfait consultation, sur devis…" />
                  </div>
                </>
              )}

              <div className="flex gap-2 pt-2">
                {step > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setStep((s) => (s - 1) as 1 | 2 | 3);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="flex-1"
                  >
                    Retour
                  </Button>
                )}
                <Button type="submit" disabled={loading} className="flex-1">
                  {step < 3 ? "Continuer" : loading ? "Envoi…" : "Envoyer pour validation"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
