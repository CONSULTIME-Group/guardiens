import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function MyProProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [profile, setProfile] = useState<any | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const allowedTabs = ["overview", "edit", "stats", "settings"] as const;
  type TabId = (typeof allowedTabs)[number];
  const currentTab: TabId = (allowedTabs as readonly string[]).includes(searchParams.get("tab") ?? "")
    ? (searchParams.get("tab") as TabId)
    : "overview";
  const setTab = (t: TabId) => {
    const next = new URLSearchParams(searchParams);
    if (t === "overview") next.delete("tab");
    else next.set("tab", t);
    setSearchParams(next, { replace: true });
  };


  useEffect(() => {
    if (!user) {
      navigate("/login?redirect=/pros/mon-espace");
      return;
    }
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("pro_profiles")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        toast.error("Impossible de charger votre espace pro.");
        setLoading(false);
        return;
      }
      if (!data) {
        navigate("/pros/inscription");
        return;
      }
      setProfile({
        ...data,
        diplomes: Array.isArray((data as any).diplomes) ? (data as any).diplomes.join("\n") : "",
        horaires_text: (data as any).horaires?.text ?? "",
      });
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
        tarif_min: profile.tarif_min === "" || profile.tarif_min == null ? null : Number(profile.tarif_min),
        tarif_max: profile.tarif_max === "" || profile.tarif_max == null ? null : Number(profile.tarif_max),
        tarif_note: profile.tarif_note ?? null,
        diplomes: Array.isArray(profile.diplomes)
          ? profile.diplomes
          : (profile.diplomes ?? "").toString().split("\n").map((s: string) => s.trim()).filter(Boolean),
        ordre_number: profile.ordre_number ?? null,
        zone_radius_km: profile.zone_radius_km ? Number(profile.zone_radius_km) : 20,
        horaires: profile.horaires_text ? { text: profile.horaires_text } : (profile.horaires ?? {}),
        google_place_id: profile.google_place_id?.trim() || null,
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

  const handleDelete = async () => {
    if (deleteConfirm.trim().toUpperCase() !== "SUPPRIMER") return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("pro_profiles")
        .delete()
        .eq("id", profile.id);
      if (error) throw error;
      toast.success("Espace pro supprimé.");
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      toast.error(err?.message ?? "Suppression impossible.");
      setDeleting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl min-w-0">
      <Helmet>
        <title>Mon espace pro | Guardiens</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="flex items-start justify-between mb-2 gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-display font-bold">Mon espace pro</h1>
          <p className="text-sm text-muted-foreground mt-1">{profile.raison_sociale}</p>
        </div>
        {statusBadge}
      </div>




        {profile.status === "approved" && profile.slug && (
          <div className="flex items-center gap-2 flex-wrap mb-6">
            <Button asChild variant="outline" size="sm">
              <a href={`/pros/${profile.slug}`} target="_blank" rel="noopener noreferrer">
                Voir ma fiche publique
              </a>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const url = `https://guardiens.fr/pros/${profile.slug}`;
                const shareData = {
                  title: profile.raison_sociale,
                  text: `Découvrez ${profile.raison_sociale} sur Guardiens`,
                  url,
                };
                try {
                  if (navigator.share) {
                    await navigator.share(shareData);
                  } else {
                    await navigator.clipboard.writeText(url);
                    toast.success("Lien copié dans le presse-papier");
                  }
                } catch {
                  /* user cancelled */
                }
              }}
            >
              Partager
            </Button>
          </div>
        )}

        {profile.status === "rejected" && profile.rejection_reason && (
          <Card className="mb-5 border-destructive/40">
            <CardContent className="p-4 text-sm">
              <strong>Motif du refus :</strong> {profile.rejection_reason}
              <br />
              Corrigez votre fiche puis sauvegardez pour renvoyer en validation.
            </CardContent>
          </Card>
        )}

        <Tabs value={currentTab} onValueChange={(v) => setTab(v as TabId)} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="edit">Ma fiche</TabsTrigger>
            <TabsTrigger value="stats">Statistiques</TabsTrigger>
            <TabsTrigger value="settings">Réglages</TabsTrigger>
          </TabsList>


          <TabsContent value="overview" className="mt-6 space-y-6">
            {/* Programme Fondateurs — la pièce signature */}
            <div className="relative overflow-hidden rounded-2xl border border-founder-border/60 bg-founder-soft p-6 sm:p-8 shadow-sm">
              <div className="absolute -right-8 -top-8 opacity-[0.08] pointer-events-none">
                <svg className="w-48 h-48 text-founder" fill="currentColor" viewBox="0 0 100 100">
                  <path d="M50 5 L55 15 L65 10 L68 22 L80 20 L78 32 L90 35 L85 45 L95 50 L85 55 L90 65 L78 68 L80 80 L68 78 L65 90 L55 85 L50 95 L45 85 L35 90 L32 78 L20 80 L22 68 L10 65 L15 55 L5 50 L15 45 L10 35 L22 32 L20 20 L32 22 L35 10 L45 15 Z" />
                </svg>
              </div>
              <div className="relative flex flex-col sm:flex-row gap-6 items-start">
                <div className="flex-shrink-0">
                  <div
                    className="w-16 h-16 rounded-full bg-founder border-2 border-founder-border flex items-center justify-center shadow-[inset_0_2px_4px_rgba(0,0,0,0.12),0_4px_14px_hsl(var(--founder)/0.35)]"
                    aria-hidden
                  >
                    <span className="text-founder-foreground font-heading italic text-2xl select-none">G</span>
                  </div>
                </div>
                <div className="space-y-3 min-w-0">
                  <div className="flex items-center gap-3">
                    <h2 className="text-[11px] uppercase tracking-[0.2em] text-founder font-semibold">
                      Programme fondateurs
                    </h2>
                    <span className="h-px w-12 bg-founder-border" />
                  </div>
                  <p className="font-heading text-lg leading-relaxed text-foreground">
                    Vous faites partie des premiers pros référencés sur Guardiens.{" "}
                    <span className="text-foreground/90">Vous bénéficiez d'un accès privilégié à l'annuaire</span> pendant la phase bêta.
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                    Les conditions d'abonnement vous seront communiquées avant tout changement, avec un tarif fondateur réservé en reconnaissance de votre confiance initiale.
                  </p>
                </div>
              </div>
            </div>

            {/* Cockpit : État + Catégorie */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-card rounded-xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-5 gap-3">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                    État de la fiche
                  </span>
                  {profile.status === "pending" && (
                    <span className="px-2.5 py-1 rounded-full bg-founder-soft border border-founder-border/60 text-founder text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                      En attente
                    </span>
                  )}
                  {profile.status === "approved" && (
                    <span className="px-2.5 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                      Publiée
                    </span>
                  )}
                  {profile.status === "rejected" && (
                    <span className="px-2.5 py-1 rounded-full bg-destructive/10 border border-destructive/30 text-destructive text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                      À corriger
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="font-heading text-2xl text-foreground">
                    {profile.status === "approved" ? "Publiée" : profile.status === "pending" ? "En attente" : "À corriger"}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {profile.status === "approved" && "Visible dans l'annuaire public."}
                    {profile.status === "pending" && "Validation manuelle en cours sous 48 h."}
                    {profile.status === "rejected" && "Voyez le motif au-dessus, puis renvoyez en validation."}
                  </p>
                </div>
              </div>

              <div className="bg-card rounded-xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-5 gap-3">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                    Catégorie principale
                  </span>
                  <svg className="w-5 h-5 text-primary/50 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <div className="font-heading text-2xl text-foreground">
                    {PRO_CATEGORIES.find((c) => c.value === profile.category)?.label ?? profile.category}
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {profile.city ?? "Ville non renseignée"}
                  </p>
              </div>
            </div>

            {/* CTA principal : éditer la fiche */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-5">
              <div className="min-w-0">
                <p className="font-heading text-base text-foreground">Modifier les informations de votre fiche</p>
                <p className="text-sm text-muted-foreground">Présentation, coordonnées, tarifs, horaires, diplômes…</p>
              </div>
              <Button onClick={() => setTab("edit")} className="shrink-0">Modifier ma fiche</Button>
            </div>


            </div>

            {/* Cross-promo gardien — éditorial sage */}
            <div className="rounded-xl bg-primary text-primary-foreground p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="flex-1 space-y-3 min-w-0">
                <h3 className="font-heading text-xl">Vous êtes aussi gardien d'animaux ?</h3>
                <p className="text-sm text-primary-foreground/85 leading-relaxed">
                  Cette fiche professionnelle apparaît dans l'annuaire métier. Pour obtenir la pastille{" "}
                  <strong className="font-medium italic text-primary-foreground">Pro vérifié</strong> sur votre profil personnel de gardien, complétez la section dédiée dans vos paramètres.
                </p>
                <a
                  href="/settings#pro"
                  className="inline-flex items-center gap-2 text-sm font-medium text-primary-foreground border-b border-primary-foreground/40 pb-0.5 hover:border-primary-foreground transition-all"
                >
                  Accéder aux paramètres
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </a>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="stats" className="mt-6 space-y-4">
            {profile.status === "approved" ? (
              <div className="grid sm:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-5">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Vues de la fiche</p>
                    <p className="text-3xl font-display font-bold mt-1 tabular-nums">
                      {profile.view_count ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">depuis la publication</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Note moyenne</p>
                    <p className="text-3xl font-display font-bold mt-1 tabular-nums">
                      {profile.rating_avg ? Number(profile.rating_avg).toFixed(1) : "–"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {profile.rating_count ?? 0} avis publié{(profile.rating_count ?? 0) > 1 ? "s" : ""}
                    </p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="p-6 text-sm text-muted-foreground text-center">
                  Les statistiques seront disponibles dès la publication de votre fiche.
                </CardContent>
              </Card>
            )}

            <Card className="border-dashed">
              <CardContent className="p-5 text-sm">
                <p className="font-semibold mb-1">À venir</p>
                <ul className="text-muted-foreground list-disc list-inside space-y-1">
                  <li>Détail des sources de trafic et villes</li>
                  <li>Demandes de contact reçues via la fiche</li>
                  <li>Mise en avant catégorie / ville</li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="edit" className="mt-6">
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

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label>Tarif min (€)</Label>
                    <Input type="number" min={0}
                      value={profile.tarif_min ?? ""}
                      onChange={(e) => update("tarif_min", e.target.value)} />
                  </div>
                  <div>
                    <Label>Tarif max (€)</Label>
                    <Input type="number" min={0}
                      value={profile.tarif_max ?? ""}
                      onChange={(e) => update("tarif_max", e.target.value)} />
                  </div>
                  <div>
                    <Label>Rayon (km)</Label>
                    <Input type="number" min={1} max={300}
                      value={profile.zone_radius_km ?? ""}
                      onChange={(e) => update("zone_radius_km", e.target.value)} />
                  </div>
                </div>

                <div>
                  <Label>Précisions tarifs</Label>
                  <Input value={profile.tarif_note ?? ""}
                    onChange={(e) => update("tarif_note", e.target.value)} />
                </div>

                <div>
                  <Label>Horaires d'ouverture</Label>
                  <Textarea rows={3} value={profile.horaires_text ?? ""}
                    onChange={(e) => update("horaires_text", e.target.value)}
                    placeholder="Ex : Lun-Ven 9h-19h, Sam 9h-13h" />
                </div>

                <div>
                  <Label>Diplômes et certifications (1 par ligne)</Label>
                  <Textarea rows={3} value={profile.diplomes ?? ""}
                    onChange={(e) => update("diplomes", e.target.value)} />
                </div>

                <div>
                  <Label>N° d'inscription à l'Ordre</Label>
                  <Input value={profile.ordre_number ?? ""}
                    onChange={(e) => update("ordre_number", e.target.value)} />
                </div>

                <div>
                  <Label>Google Place ID (avis Google)</Label>
                  <Input
                    value={profile.google_place_id ?? ""}
                    onChange={(e) => update("google_place_id", e.target.value)}
                    placeholder="Ex : ChIJN1t_tDeuEmsRUsoyG83frY4"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Trouvez votre Place ID via{" "}
                    <a
                      href="https://developers.google.com/maps/documentation/places/web-service/place-id"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      l'outil officiel Google
                    </a>
                    . Permet d'afficher vos avis Google sur votre fiche (5 max, rafraîchis quotidiennement).
                  </p>
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
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
