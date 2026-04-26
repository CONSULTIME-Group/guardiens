import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Sparkles, Loader2, ImagePlus, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { slugify } from "@/lib/normalize";

const ArticleEditor = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isNew = id === "new";

  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiOpen, setAiOpen] = useState(false);

  const [form, setForm] = useState({
    title: "",
    slug: "",
    category: "conseil_gardien",
    cover_image_url: "",
    excerpt: "",
    content: "",
    author_name: "L'équipe Guardiens",
    related_breed: "",
    related_city: "",
    meta_title: "",
    meta_description: "",
    published: false,
    published_at: null as string | null,
  });

  useEffect(() => {
    if (!isNew && id) {
      supabase.from("articles").select("*").eq("id", id).single().then(({ data }) => {
        if (data) setForm({
          title: data.title || "",
          slug: data.slug || "",
          category: data.category || "conseil_gardien",
          cover_image_url: data.cover_image_url || "",
          excerpt: data.excerpt || "",
          content: data.content || "",
          author_name: data.author_name || "L'équipe Guardiens",
          related_breed: (data as any).related_breed || "",
          related_city: (data as any).related_city || "",
          meta_title: (data as any).meta_title || "",
          meta_description: (data as any).meta_description || "",
          published: data.published || false,
          published_at: data.published_at,
        });
      });
    }
  }, [id, isNew]);

  const updateField = (field: string, value: any) => {
    setForm(prev => {
      const updated = { ...prev, [field]: value };
      if (field === "title" && (isNew || prev.slug === slugify(prev.title))) {
        updated.slug = slugify(value);
      }
      return updated;
    });
  };

  const handleSave = async (publish?: boolean) => {
    if (!form.title.trim()) { toast.error("Le titre est obligatoire"); return; }
    if (!form.slug.trim()) { toast.error("Le slug est obligatoire"); return; }

    // Check slug uniqueness
    const slugQuery = supabase.from("articles").select("id").eq("slug", form.slug);
    if (!isNew && id) slugQuery.neq("id", id);
    const { data: dupes } = await slugQuery;
    if (dupes && dupes.length > 0) {
      toast.error("Ce slug existe déjà — choisissez un slug unique");
      return;
    }

    setSaving(true);
    const shouldPublish = publish ?? form.published;
    const record: any = {
      title: form.title,
      slug: form.slug,
      category: form.category,
      cover_image_url: form.cover_image_url || null,
      excerpt: form.excerpt,
      content: form.content,
      author_name: form.author_name,
      related_breed: form.related_breed || null,
      related_city: form.related_city || null,
      meta_title: form.meta_title || null,
      meta_description: form.meta_description || null,
      published: shouldPublish,
      published_at: shouldPublish && !form.published_at ? new Date().toISOString() : form.published_at,
    };

    let error;
    if (isNew) {
      ({ error } = await supabase.from("articles").insert(record));
    } else {
      ({ error } = await supabase.from("articles").update(record).eq("id", id));
    }

    setSaving(false);
    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success(shouldPublish ? "Article publié !" : "Article sauvegardé");
      navigate("/admin/articles");
    }
  };

  const generateWithAI = async () => {
    if (!aiPrompt.trim()) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-article", {
        body: { description: aiPrompt },
      });
      if (error) throw error;
      if (data?.content) {
        updateField("content", data.content);
        if (data.title && !form.title) updateField("title", data.title);
        if (data.excerpt && !form.excerpt) updateField("excerpt", data.excerpt);
        toast.success("Article généré ! Vous pouvez le modifier avant de publier.");
      }
    } catch (e: any) {
      toast.error("Erreur IA : " + (e.message || "Réessayez"));
    }
    setGenerating(false);
    setAiOpen(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop();
    const path = `articles/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("property-photos").upload(path, file);
    if (error) { toast.error("Erreur upload"); return; }
    const { data: urlData } = supabase.storage.from("property-photos").getPublicUrl(path);
    updateField("cover_image_url", urlData.publicUrl);
    toast.success("Image uploadée");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/articles")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-heading text-2xl font-bold">
          {isNew ? "Nouvel article" : "Modifier l'article"}
        </h1>
      </div>

      <div className="space-y-4 bg-card rounded-xl p-6 border">
        <div>
          <Label>Titre</Label>
          <Input value={form.title} onChange={e => updateField("title", e.target.value)} placeholder="Mon article…" />
        </div>

        <div>
          <Label>Slug (URL)</Label>
          <Input value={form.slug} onChange={e => updateField("slug", e.target.value)} placeholder="mon-article" />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Catégorie</Label>
            <Select value={form.category} onValueChange={v => updateField("category", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="guide_race">Guide race</SelectItem>
                <SelectItem value="guide_lieu">Guide lieu</SelectItem>
                <SelectItem value="conseil_gardien">Conseil gardien</SelectItem>
                <SelectItem value="conseil_proprio">Conseil proprio</SelectItem>
                <SelectItem value="temoignage">Témoignage</SelectItem>
                <SelectItem value="actualite">Actualité</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Auteur</Label>
            <Input value={form.author_name} onChange={e => updateField("author_name", e.target.value)} />
          </div>
        </div>

        <div>
          <Label>Image de couverture</Label>
          {form.cover_image_url && (
            <div className="relative mb-2">
              <img src={form.cover_image_url} alt="" className="w-full h-48 object-cover rounded-lg" />
              <div className="absolute bottom-2 right-2 flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="bg-background/90 backdrop-blur-sm"
                  onClick={() => document.getElementById("cover-upload")?.click()}
                >
                  Changer l'image
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="bg-background/90 backdrop-blur-sm"
                  onClick={() => updateField("cover_image_url", "")}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
          {!form.cover_image_url && (
            <Button
              type="button"
              variant="outline"
              className="w-full h-32 border-dashed flex flex-col gap-1"
              onClick={() => document.getElementById("cover-upload")?.click()}
            >
              <ImagePlus className="h-6 w-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Ajouter une image de couverture</span>
            </Button>
          )}
          <input id="cover-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        </div>

        <div>
          <Label>Résumé <span className="text-muted-foreground text-xs">(max 200 caractères)</span></Label>
          <Textarea
            value={form.excerpt}
            onChange={e => updateField("excerpt", e.target.value)}
            maxLength={200}
            placeholder="Résumé affiché dans les listes et sur les réseaux"
            rows={2}
          />
          <p className="text-xs text-muted-foreground mt-1">{form.excerpt.length}/200</p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Contenu <span className="text-muted-foreground text-xs">(Markdown)</span></Label>
            <Dialog open={aiOpen} onOpenChange={setAiOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Sparkles className="h-4 w-4 mr-2" /> Générer avec l'IA
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Générer un article avec l'IA</DialogTitle>
                </DialogHeader>
                <Textarea
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  placeholder="Ex : Guide complet pour garder un Berger Australien, avec conseils pratiques pour les gardiens"
                  rows={4}
                />
                <Button onClick={generateWithAI} disabled={generating || !aiPrompt.trim()}>
                  {generating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Génération…</> : "Générer"}
                </Button>
              </DialogContent>
            </Dialog>
          </div>
          <Textarea
            value={form.content}
            onChange={e => updateField("content", e.target.value)}
            placeholder="Écrivez votre article en Markdown…"
            rows={16}
            className="font-mono text-sm"
          />
        </div>

        {(form.category === "guide_race") && (
          <div>
            <Label>Race liée</Label>
            <Input value={form.related_breed} onChange={e => updateField("related_breed", e.target.value)} placeholder="Ex : Berger Australien" />
          </div>
        )}

        {(form.category === "guide_lieu") && (
          <div>
            <Label>Ville liée</Label>
            <Input value={form.related_city} onChange={e => updateField("related_city", e.target.value)} placeholder="Ex : Lyon" />
          </div>
        )}

        <details className="pt-2" open>
          <summary className="text-sm font-medium cursor-pointer">SEO</summary>
          <div className="space-y-3 pt-3">
            <div>
              <Label>Meta title <span className="text-muted-foreground text-xs">(max 60 car.)</span></Label>
              <Input value={form.meta_title} onChange={e => updateField("meta_title", e.target.value)} placeholder="Auto-généré depuis le titre si vide" />
              <div className="flex items-center justify-between mt-1">
                <p className={`text-xs ${form.meta_title.length > 60 ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                  {form.meta_title.length}/60
                </p>
                {form.meta_title.length > 60 && (
                  <p className="text-xs text-destructive">Trop long — Google tronquera à 60 caractères</p>
                )}
              </div>
            </div>
            <div>
              <Label>Meta description <span className="text-muted-foreground text-xs">(max 155 car.)</span></Label>
              <Textarea value={form.meta_description} onChange={e => updateField("meta_description", e.target.value)} placeholder="Auto-généré depuis le résumé si vide" rows={2} />
              <div className="flex items-center justify-between mt-1">
                <p className={`text-xs ${form.meta_description.length > 155 ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                  {form.meta_description.length}/155
                </p>
                {form.meta_description.length > 155 && (
                  <p className="text-xs text-destructive">Trop long — Google tronquera à 155 caractères</p>
                )}
              </div>
            </div>
          </div>
        </details>

        <div className="flex items-center gap-3 pt-2">
          <Switch checked={form.published} onCheckedChange={v => updateField("published", v)} id="published" />
          <Label htmlFor="published">Publié</Label>
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={() => handleSave(false)} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Sauvegarder brouillon
        </Button>
        <Button onClick={() => handleSave(true)} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Publier
        </Button>
      </div>
    </div>
  );
};

export default ArticleEditor;
