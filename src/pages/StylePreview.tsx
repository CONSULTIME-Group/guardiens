import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

import scene1 from "@/assets/style-previews-v2/scene-1-bench.png";
import scene2 from "@/assets/style-previews-v2/scene-2-door.png";
import scene3 from "@/assets/style-previews-v2/scene-3-suitcase.png";
import scene4 from "@/assets/style-previews-v2/scene-4-letter.png";

/**
 * Page interne (non listée) — comparatif de 4 propositions de style
 * d'illustrations narratives à l'aquarelle pour les états vides.
 * Inspiration : aquarelles éditoriales de campagne française, palette
 * douce, fond crème qui se fond dans la page.
 */

const STYLES = [
  {
    id: 1,
    src: scene1,
    name: "Le banc qui attend",
    pitch:
      "Banc en bois, laisse pendue, gamelle vide, lavande. Évoque l'attente paisible du compagnon.",
    mood: "Mélancolique · Doux · Provençal",
  },
  {
    id: 2,
    src: scene2,
    name: "La porte qui s'ouvre",
    pitch:
      "Porte en bois entrouverte, paillasson welcome, écuelle, roses grimpantes. Évoque l'accueil.",
    mood: "Chaleureux · Hospitalier · Romantique",
  },
  {
    id: 3,
    src: scene3,
    name: "La valise prête",
    pitch:
      "Valise vintage devant une fenêtre ouverte sur la campagne, clocher au loin. Évoque le départ.",
    mood: "Contemplatif · Voyage · Nostalgique",
  },
  {
    id: 4,
    src: scene4,
    name: "Le mot manuscrit",
    pitch:
      "Lettre, brin de lavande, tasse de thé, pot d'herbes sur table en bois. Évoque la correspondance.",
    mood: "Intime · Artisanal · Épistolaire",
  },
];

const StylePreview = () => {
  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="space-y-3">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Button>
          </Link>
          <h1 className="font-heading text-3xl md:text-4xl font-semibold text-foreground">
            4 propositions — aquarelles narratives
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Inspiration : aquarelles éditoriales de campagne française, palette douce, fond crème qui se fond dans la page. Chaque carte simule un état vide réel pour juger l'intégration.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {STYLES.map((s) => (
            <Card
              key={s.id}
              className="overflow-hidden border border-border bg-card hover:shadow-lg transition-shadow"
            >
              {/* Bandeau numéro */}
              <div className="px-5 py-3 border-b border-border bg-muted/40 flex items-center justify-between">
                <span className="font-heading text-sm font-semibold text-foreground">
                  Style {s.id} — {s.name}
                </span>
                <span className="text-xs text-muted-foreground">{s.mood}</span>
              </div>

              {/* Simulation d'un état vide réel */}
              <div className="text-center py-10 px-4 space-y-5">
                <img
                  src={s.src}
                  alt={`Aperçu style ${s.name}`}
                  loading="lazy"
                  width={1024}
                  height={1024}
                  className="block mx-auto h-auto w-48 sm:w-56 mix-blend-multiply select-none pointer-events-none"
                  draggable={false}
                />
                <div className="space-y-2">
                  <h3 className="font-heading text-lg font-semibold text-foreground">
                    Aucun message pour le moment
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                    Vos échanges avec les gardiens s'afficheront ici dès qu'une conversation démarrera.
                  </p>
                </div>
                <Button variant="outline" size="sm" className="mt-2">
                  Découvrir les gardiens
                </Button>
              </div>

              {/* Pitch */}
              <div className="px-5 py-4 border-t border-border bg-muted/20">
                <p className="text-xs text-muted-foreground leading-relaxed">{s.pitch}</p>
              </div>
            </Card>
          ))}
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-lg p-5 text-center">
          <p className="text-sm text-foreground">
            Dites-moi simplement <strong>« style 1 »</strong>, <strong>« style 2 »</strong>,{" "}
            <strong>« style 3 »</strong> ou <strong>« style 4 »</strong> — je décline le style choisi sur les 5 illustrations (messages, candidatures, gardes, favoris, calendrier).
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Vous pouvez aussi mixer (ex. « style 1 pour la palette, style 4 pour la composition »).
          </p>
        </div>
      </div>
    </div>
  );
};

export default StylePreview;
