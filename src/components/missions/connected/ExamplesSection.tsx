import { Card, CardContent } from "@/components/ui/card";
import { CATEGORY_META, EXAMPLES } from "./constants";

const ExamplesSection = () => (
  <section className="space-y-8">
    <h2 className="font-heading text-2xl font-bold text-foreground text-center">Quelques exemples d'échanges</h2>
    {(["animals", "garden", "skills"] as const).map((cat) => {
      const meta = CATEGORY_META[cat];
      const items = EXAMPLES.filter((e) => e.cat === cat);
      return (
        <div key={cat} className="space-y-3">
          <h3 className="font-heading text-lg font-semibold">{meta.label}</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((ex) => (
              <Card key={ex.title} className="border-dashed border-border bg-card">
                <CardContent className="p-4 space-y-2">
                  <p className="font-medium text-sm text-foreground">{ex.title}</p>
                  <p className="text-xs text-muted-foreground">En échange : {ex.exchange}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      );
    })}
  </section>
);

export default ExamplesSection;
