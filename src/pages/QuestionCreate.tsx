import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import PageMeta from "@/components/PageMeta";
import PageBreadcrumb from "@/components/seo/PageBreadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";
import { COMMUNITY_CATEGORIES, type CommunityCategory } from "@/lib/communityCategories";

const schema = z.object({
  category: z.enum(["animaux", "jardin", "maison", "garde", "autre"]),
  title: z.string().trim().min(5, "5 caractères minimum").max(120, "120 caractères maximum"),
  body: z.string().trim().min(20, "20 caractères minimum").max(4000, "4000 caractères maximum"),
  city: z.string().trim().max(100).optional().or(z.literal("")),
});

const QuestionCreate = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [category, setCategory] = useState<CommunityCategory>("animaux");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [city, setCity] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!user) {
      toast.error("Connectez-vous pour poser une question.");
      navigate("/login?redirect=/questions/nouvelle");
      return;
    }
    const parsed = schema.safeParse({ category, title, body, city });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase
      .from("community_questions")
      .insert({
        author_id: user.id,
        category: parsed.data.category,
        title: parsed.data.title,
        body: parsed.data.body,
        city: parsed.data.city || null,
      })
      .select("id")
      .single();
    setSubmitting(false);
    if (error || !data) {
      toast.error("Impossible de publier votre question.");
      return;
    }
    trackEvent("question_create_submit", { metadata: { category: parsed.data.category } });
    toast.success("Question publiée.");
    navigate(`/questions/${data.id}`);
  };

  return (
    <>
      <PageMeta
        title="Poser une question, Guardiens"
        description="Posez votre question à la communauté Guardiens."
        path="/questions/nouvelle"
        noindex
      />
      <div className="min-h-screen bg-background">
        <PageBreadcrumb items={[{ label: "Questions & conseils", href: "/questions" }, { label: "Nouvelle" }]} />
        <section className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
          <h1 className="font-heading text-2xl sm:text-3xl font-bold mb-2">Poser une question</h1>
          <p className="text-foreground/70 mb-6">
            Décrivez votre situation avec quelques détails. Plus c'est précis, plus les réponses seront utiles.
          </p>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="cat">Catégorie</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as CommunityCategory)}>
                <SelectTrigger id="cat"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COMMUNITY_CATEGORIES.map((c) => (
                    <SelectItem key={c.key} value={c.key}>
                      {c.label}, {c.hint.toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Titre</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex : Mon chien aboie sur tous les vélos, comment faire ?"
                maxLength={120}
              />
              <p className="text-xs text-foreground/55">{title.length}/120</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Votre question</Label>
              <Textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Décrivez le contexte, ce que vous avez déjà essayé, vos contraintes."
                rows={8}
                maxLength={4000}
              />
              <p className="text-xs text-foreground/55">{body.length}/4000</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">Ville (optionnel)</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Lyon, Annecy, Grenoble…"
                maxLength={100}
              />
            </div>

            <Button onClick={submit} disabled={submitting} className="w-full sm:w-auto">
              {submitting ? "Publication…" : "Publier ma question"}
            </Button>
          </div>
        </section>
      </div>
    </>
  );
};

export default QuestionCreate;
