/**
 * Lot ERR1 : empreinte stable d'un dossier réseau (méthode, chemin sans
 * paramètres ni identifiants, statut). Sans elle, l'empreinte suivait le nom
 * du fichier compilé et chaque mise en ligne ouvrait un nouveau dossier.
 */
export const networkFingerprintKey = (method: string, url: string, status: number): string => {
  let path = url;
  try {
    path = new URL(url, "https://guardiens.fr").pathname;
  } catch {
    path = url.split(/[?#]/)[0];
  }
  path = path.replace(
    /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?=\/|$)/gi,
    "/:id",
  );
  return `network|${method}|${path}|${status}`;
};
