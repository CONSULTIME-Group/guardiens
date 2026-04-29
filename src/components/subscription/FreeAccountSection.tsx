/**
 * Section explicative — Compte gratuit Guardiens.
 * Affichée sous les cartes payantes (Mensuel / Annuel) sur :
 *  - /tarifs (page publique)
 *  - /mon-abonnement (espace utilisateur)
 *  - écrans de checkout
 *
 * Objectif : clarifier ce qui reste accessible gratuitement
 * pour TOUS les comptes après le 13 juin 2026, qu'ils soient
 * abonnés ou non. Aucun CTA — section purement informative.
 */
const accesGratuits: Array<{ titre: string; detail: string }> = [
  {
    titre: "Entraide & petites missions",
    detail:
      "Arroser un potager, sortir un chien le weekend, garder des poules le temps d'un marché… Demander ou proposer un coup de main près de chez vous reste 100 % gratuit à vie, pour préserver ce lien indépendamment de toute monétisation.",
  },
  {
    titre: "Guides locaux & conseils ville",
    detail:
      "Accès libre aux guides de quartier, lieux pet-friendly, vétérinaires recommandés et bonnes adresses partagées par la communauté.",
  },
  {
    titre: "Conseils sur les races",
    detail:
      "Fiches détaillées sur les races de chiens et chats, comportements, besoins spécifiques — consultables sans abonnement.",
  },
  {
    titre: "Profil public et réputation",
    detail:
      "Votre profil reste visible, vos avis reçus restent affichés, vos badges conservés même sans abonnement gardien actif.",
  },
  {
    titre: "Messagerie liée à l'entraide",
    detail:
      "Échanger avec les membres dans le cadre des petites missions et des demandes d'entraide reste gratuit.",
  },
  {
    titre: "Recherche et favoris",
    detail:
      "Parcourir les annonces, consulter les profils gardiens, ajouter des favoris — accessible sans frais.",
  },
];

const FreeAccountSection = () => {
  return (
    <section
      aria-labelledby="compte-gratuit-titre"
      className="rounded-2xl border border-border bg-muted/30 p-6 md:p-8 mt-8"
    >
      <div className="max-w-3xl mx-auto text-center mb-6">
        <p className="text-xs tracking-widest uppercase text-muted-foreground font-body mb-2">
          Avant de parler tarifs
        </p>
        <h3
          id="compte-gratuit-titre"
          className="font-heading text-xl md:text-2xl font-semibold text-foreground mb-2"
        >
          Ce qui reste gratuit pour tout le monde
        </h3>
        <p className="text-sm font-body text-muted-foreground">
          Même sans abonnement gardien actif, votre compte Guardiens conserve un large
          accès à la plateforme. L'abonnement à 6,99&nbsp;€/mois sert uniquement
          à postuler aux gardes longues et à apparaître dans la recherche gardien.
        </p>
      </div>

      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {accesGratuits.map((item) => (
          <li
            key={item.titre}
            className="rounded-xl bg-card border border-border p-4"
          >
            <p className="font-heading text-sm font-semibold text-foreground mb-1">
              {item.titre}
            </p>
            <p className="text-sm font-body text-muted-foreground leading-relaxed">
              {item.detail}
            </p>
          </li>
        ))}
      </ul>

      <p className="text-xs font-body text-muted-foreground text-center mt-6 max-w-2xl mx-auto">
        À partir du 13&nbsp;juin&nbsp;2026, seules les fonctionnalités gardien
        (postuler aux gardes, messagerie liée aux gardes, visibilité dans la
        recherche) nécessitent un abonnement actif. Tout le reste demeure
        accessible librement.
      </p>
    </section>
  );
};

export default FreeAccountSection;
