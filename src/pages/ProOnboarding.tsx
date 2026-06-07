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
  });

  useEffect(() => {
    if (!user) {
      navigate("/login?redirect=/pros/inscription");
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

      const slug = `${slugify(form.raison_sociale)}-${slugify(form.city || "fr")}-${Math.random()
        .toString(36)
        .slice(2, 6)}`;

      const { error } = await supabase.from("pro_profiles" as any).insert({
        user_id: user.id,
        slug,
        raison_sociale: form.raison_sociale,
        siret: form.siret || null,
        category: form.category,
        city: form.city || null,
        postal_code: form.postal_code || null,
        description: form.description || null,
        phone: form.phone || null,
        website: form.website || null,
        email_contact: form.email_contact || null,
        urgences_24_7: form.urgences_24_7,
        logo_url: logoUrl,
        status: "pending",
      });

      if (error) throw error;

      toast.success("Fiche envoyée. Modération sous 48h.");
      navigate("/pros");
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
        <p className="text-muted-foreground mb-8">
          Fiche gratuite. Validation manuelle sous 48h pour garantir la qualité de l'annuaire.
        </p>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
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
                <Input
                  id="siret"
                  value={form.siret}
                  onChange={(e) => update("siret", e.target.value)}
                  placeholder="14 chiffres"
                  maxLength={14}
                />
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
                  <Label htmlFor="city">Ville</Label>
                  <Input
                    id="city"
                    value={form.city}
                    onChange={(e) => update("city", e.target.value)}
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

              <div>
                <Label htmlFor="desc">Présentation de votre activité</Label>
                <Textarea
                  id="desc"
                  rows={5}
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  placeholder="Spécialités, parcours, ce qui vous distingue…"
                />
              </div>

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

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Envoi…" : "Envoyer ma fiche pour validation"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
