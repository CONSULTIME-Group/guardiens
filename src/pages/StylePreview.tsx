import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

import style1 from "@/assets/style-previews/style-1-line.png";
import style2 from "@/assets/style-previews/style-2-wash.png";
import style3 from "@/assets/style-previews/style-3-pencil.png";
import style4 from "@/assets/style-previews/style-4-flat.png";

/**
 * Page interne (non listée) pour comparer 4 propositions de style
 * d'illustrations pour les états vides. Chaque carte simule un état
 * vide réel avec titre + description, pour juger l'intégration.
 */

const STYLES = [
  {
    id: 1,
    src: style1,
    name: "Trait continu",
    pitch: "Une seule ligne fine, vert sapin. Très éditorial, presque calligraphique.",
    mood: "Élégant · Discret · Moderne",
  },
  {
    id: 2,
    src: style2,
    name: "Aquarelle diluée",
    pitch: "Lavis très dilué, sans contour, qui se fond dans le crème. Presque un souffle.",
    mood: "Onirique · Doux · Atmosphérique",
  },
  {
    id: 3,
    src: style3,
    name: "Crayon doux",
    pitch: "Esquisse au crayon de couleur, texture papier, ton terre. Carnet d'artiste.",
    mood: "Artisanal · Chaleureux · Intime",
  },
  {
    id: 4,
    src: style4,
    name: "Aplats organiques",
    pitch: "Formes simples bicolores, sans contour. Style spot illustration éditoriale.",
    mood: "Graphique · Apaisé · Contemporain",
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
            4 propositions de style
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Chaque carte simule un état vide réel pour juger l'intégration à la page. Indiquez-moi le numéro qui vous parle le plus — je l'appliquerai partout.
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
                  className="block mx-auto h-auto w-40 sm:w-48 mix-blend-multiply select-none pointer-events-none"
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
            <strong>« style 3 »</strong> ou <strong>« style 4 »</strong> — je décline le choix sur les 5 illustrations (chat, chien, boîte, calendrier, marque-page).
          </p>
        </div>
      </div>
    </div>
  );
};

export default StylePreview;
