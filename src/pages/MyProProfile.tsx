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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export default function MyProProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/login?redirect=/pros/mon-espace");
      return;
    }
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("pro_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!data) {
        navigate("/pros/inscription");
        return;
      }
      setProfile(data);
      setLoading(false);
    })();
  }, [user, navigate]);

  if (loading || !profile) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-2xl text-muted-foreground min-w-0">
        Chargement…
      </div>
    );
  }

  const update = (k: string, v: any) => setProfile((p: any) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      let logo_url = profile.logo_url;
      if (logoFile) {
        const ext = logoFile.name.split(".").pop();
        const path = `${user!.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("pro-logos")
          .upload(path, logoFile, { upsert: true });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("pro-logos").getPublicUrl(path);
        logo_url = pub.publicUrl;
      }

      const patch: any = {
        raison_sociale: profile.raison_sociale,
        siret: profile.siret,
        category: profile.category,
        city: profile.city,
        postal_code: profile.postal_code,
        description: profile.description,
        phone: profile.phone,
        website: profile.website,
        email_contact: profile.email_contact,
        urgences_24_7: profile.urgences_24_7,
        logo_url,
      };

      // Toute modification fait repasser en pending (sauf si déjà approuvée et que rien de critique ne change)
      // Règle simple, MVP : on garde le statut tel quel, sauf catégorie qui force re-modération
      // (cf mémoire produit).
      // Approche prudente : on remet en pending si la fiche était rejetée ou si la catégorie change.
      if (profile.status === "rejected") patch.status = "pending";

      const { error } = await supabase
        .from("pro_profiles")
        .update(patch)
        .eq("id", profile.id);
      if (error) throw error;

      toast.success("Fiche mise à jour");
      setLogoFile(null);
    } catch (err: any) {
      toast.error(err?.message ?? "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const statusBadge = {
    pending: <Badge variant="secondary">En attente de validation</Badge>,
    approved: <Badge>Approuvée et publiée</Badge>,
    rejected: <Badge variant="destructive">Refusée</Badge>,
  }[profile.status as "pending" | "approved" | "rejected"];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Mon espace pro | Guardiens</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <main className="container mx-auto px-4 py-10 max-w-2xl min-w-0">
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <h1 className="text-3xl font-display font-bold">Mon espace pro</h1>
          <div className="flex items-center gap-2">
            {profile.status === "approved" && profile.slug && (
              <Button asChild variant="outline" size="sm">
                <a href={`/pros/${profile.slug}`} target="_blank" rel="noopener noreferrer">
                  Voir ma fiche publique
                </a>
              </Button>
            )}
            {statusBadge}
          </div>
        </div>

        <Card className="mb-5 border-border/60">
          <CardContent className="p-4 text-sm text-muted-foreground">
            Cette fiche apparaît dans <strong>l'annuaire public des pros animaliers</strong>. Si vous êtes par ailleurs gardien sur la plateforme et que vous souhaitez obtenir la pastille <strong>« Pro vérifié »</strong> sur votre profil gardien, complétez la section dédiée dans{" "}
            <a href="/settings#pro" className="underline">vos paramètres</a>.
          </CardContent>
        </Card>


        {profile.status === "rejected" && profile.rejection_reason && (
          <Card className="mb-5 border-destructive/40">
            <CardContent className="p-4 text-sm">
              <strong>Motif du refus :</strong> {profile.rejection_reason}
              <br />
              Corrigez les éléments puis sauvegardez pour renvoyer en validation.
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-6 space-y-5">
            <div>
              <Label>Raison sociale *</Label>
              <Input
                value={profile.raison_sociale ?? ""}
                onChange={(e) => update("raison_sociale", e.target.value)}
              />
            </div>

            <div>
              <Label>Catégorie principale</Label>
              <Select value={profile.category} onValueChange={(v) => update("category", v as ProCategory)}>
                <SelectTrigger>
                  <SelectValue />
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
              <Label>SIRET</Label>
              <Input
                value={profile.siret ?? ""}
                maxLength={14}
                onChange={(e) => update("siret", e.target.value)}
              />
            </div>

            <div>
              <Label>Logo</Label>
              {profile.logo_url && !logoFile && (
                <img
                  src={profile.logo_url}
                  alt="Logo actuel"
                  className="w-20 h-20 rounded-lg object-contain bg-muted mb-2"
                />
              )}
              <Input
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
                <Label>Ville</Label>
                <Input value={profile.city ?? ""} onChange={(e) => update("city", e.target.value)} />
              </div>
              <div>
                <Label>Code postal</Label>
                <Input
                  value={profile.postal_code ?? ""}
                  onChange={(e) => update("postal_code", e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label>Présentation</Label>
              <Textarea
                rows={6}
                value={profile.description ?? ""}
                onChange={(e) => update("description", e.target.value)}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Téléphone</Label>
                <Input value={profile.phone ?? ""} onChange={(e) => update("phone", e.target.value)} />
              </div>
              <div>
                <Label>Email contact</Label>
                <Input
                  type="email"
                  value={profile.email_contact ?? ""}
                  onChange={(e) => update("email_contact", e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label>Site web</Label>
              <Input
                type="url"
                value={profile.website ?? ""}
                onChange={(e) => update("website", e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="urg"
                checked={!!profile.urgences_24_7}
                onCheckedChange={(v) => update("urgences_24_7", !!v)}
              />
              <Label htmlFor="urg" className="cursor-pointer">
                Je propose des urgences 24/7
              </Label>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
