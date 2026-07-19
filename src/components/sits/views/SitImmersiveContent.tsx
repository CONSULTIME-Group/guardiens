/**
 * Orchestrateur "fiche annonce immersive".
 *
 * Responsabilités :
 *  - Composer Hero, Quick facts, 4 onglets (Garde / Animaux / Logement / Attentes), Sidebar
 *
 * Le détail de chaque section vit dans `./tabs/*` pour rester maintenable.
 * Le hero et le corps sont également exportés séparément (SitImmersiveHero /
 * SitImmersiveBody) pour permettre à SitterSitView de placer l'action et la
 * rencontre entre le hero et le reste du contenu.
 *
 * IMPORTANT : on ré-exporte `parseRoutine` et `cleanFreeText` pour préserver
 * la compatibilité avec la batterie de tests `__tests__/parseRoutine.test.ts`.
 */
import SitImmersiveHero from "./SitImmersiveHero";
import SitImmersiveBody from "./SitImmersiveBody";

interface SitImmersiveContentProps {
  sit: any;
  owner: any;
  property: any;
  pets: any[];
  ownerProfile: any;
}

const SitImmersiveContent = (props: SitImmersiveContentProps) => {
  return (
    <>
      <SitImmersiveHero {...props} />
      <SitImmersiveBody {...props} />
    </>
  );
};

export default SitImmersiveContent;

export { parseRoutine, cleanFreeText } from "./tabs/parseRoutine";
