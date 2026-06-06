/**
 * Encart de conseils affiché au-dessus des zones d'upload de photos
 * (logement + galerie). Vouvoiement, pas d'icônes Lucide décoratives.
 */
import PhotoExamplesDialog from "./PhotoExamplesDialog";

const PhotoTipsAlert = () => {
  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
      <p className="font-heading font-semibold text-sm text-foreground">
        Soignez vos photos, c'est ce qui déclenche les candidatures
      </p>
      <p className="text-sm text-muted-foreground">
        Des photos lumineuses et chaleureuses permettent de trouver un gardien beaucoup plus vite.
        Prenez le temps de bien les choisir.
      </p>
      <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
        <li>Photographiez en pleine lumière du jour, fenêtres ouvertes.</li>
        <li>Rangez avant, un intérieur soigné rassure immédiatement.</li>
        <li>Montrez vos animaux dans leur quotidien (panier, jardin, câlins).</li>
        <li>Mettez en avant les commodités : jardin, terrasse, cuisine équipée, WiFi, vue.</li>
        <li>Variez les angles : pièces de vie, chambre du gardien, extérieur, quartier.</li>
        <li>Évitez les photos sombres, floues, ou prises à la verticale en intérieur étroit.</li>
      </ul>
      <div className="pt-1">
        <PhotoExamplesDialog />
      </div>
    </div>
  );
};

export default PhotoTipsAlert;

