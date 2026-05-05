import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import photoLight from "@/assets/photo-tip-light.jpg";
import photoPet from "@/assets/photo-tip-pet.jpg";
import photoGarden from "@/assets/photo-tip-garden.jpg";
import photoBedroom from "@/assets/photo-tip-bedroom.jpg";

const EXAMPLES = [
  {
    src: photoLight,
    title: "Une pièce de vie lumineuse",
    desc: "Photographiez en pleine journée, fenêtres dégagées. La lumière naturelle change tout.",
  },
  {
    src: photoPet,
    title: "Votre animal dans son quotidien",
    desc: "Un instant naturel (panier, jeu, câlin) crée un lien immédiat avec le futur gardien.",
  },
  {
    src: photoGarden,
    title: "Le jardin ou la terrasse",
    desc: "Mettez en valeur les extérieurs : c'est souvent un argument décisif.",
  },
  {
    src: photoBedroom,
    title: "La chambre du gardien",
    desc: "Lit fait, linge propre, espace rangé. Le gardien doit se projeter chez vous.",
  },
];

const PhotoExamplesDialog = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          Voir des exemples de photos qui marchent
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Les photos qui attirent les gardiens</DialogTitle>
          <DialogDescription>
            Inspirez-vous de ces exemples pour mettre votre logement en valeur et recevoir des candidatures plus rapidement.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
          {EXAMPLES.map((ex) => (
            <div key={ex.title} className="space-y-2">
              <div className="rounded-xl overflow-hidden border border-border aspect-[3/2]">
                <img
                  src={ex.src}
                  alt={ex.title}
                  width={768}
                  height={512}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <p className="font-heading font-semibold text-sm">{ex.title}</p>
                <p className="text-sm text-muted-foreground">{ex.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl bg-muted p-4 text-sm text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">À éviter</p>
          <ul className="list-disc pl-5 space-y-0.5">
            <li>Photos sombres, floues ou prises de nuit avec flash.</li>
            <li>Pièces en désordre, vaisselle apparente, lit défait.</li>
            <li>Captures d'écran ou photos issues d'autres sites.</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PhotoExamplesDialog;
