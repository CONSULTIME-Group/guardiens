/**
 * Manifeste de synchronisation PNG ↔ cinemagraph (mp4 + webm).
 *
 * Le cinemagraph (auth-illustration.mp4 / .webm) doit refléter exactement
 * l'illustration fixe (auth-illustration.png). Quand on remasterise la PNG
 * (ajout de gags, retrait de laisses, etc.) sans régénérer la vidéo, ces deux
 * fichiers se désynchronisent et la vidéo affiche encore l'ancienne scène.
 *
 * Mode de fonctionnement :
 *  - Bumper `pngVersion` à chaque modification de la PNG.
 *  - Bumper `videoVersion` UNIQUEMENT après avoir régénéré .mp4 + .webm
 *    à partir de la nouvelle PNG.
 *  - Tant que les deux versions ne correspondent pas, AuthIllustrationPanel
 *    reste sur l'image fixe (cinemagraph désactivé silencieusement).
 *  - Dès que `videoVersion === pngVersion`, le cinemagraph se réactive
 *    automatiquement, sans changement de code dans le composant.
 */
export const authIllustrationManifest = {
  pngVersion: 21,
  videoVersion: 21,
} as const;

/** True quand la vidéo est à jour avec la PNG → cinemagraph autorisé. */
export const isCinemagraphInSync =
  authIllustrationManifest.videoVersion === authIllustrationManifest.pngVersion;
