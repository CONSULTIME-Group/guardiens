/**
 * Garde anti crash « Node.removeChild: The node to be removed is not a child
 * of this node ».
 *
 * Cause : les traducteurs intégrés au navigateur (Firefox, Chrome, extensions)
 * remplacent les noeuds texte de la page. React garde une référence vers les
 * anciens noeuds ; au démontage il tente de les retirer d'un parent qui ne les
 * contient plus, l'exception remonte jusqu'à l'ErrorBoundary et l'écran passe
 * en page d'erreur alors que le contenu est correct.
 *
 * Correctif retenu : rendre `removeChild` et `insertBefore` tolérants quand
 * l'invariant est déjà rompu, exactement comme le fait la parade officielle
 * documentée par l'équipe React. On ne modifie rien d'autre : tout appel
 * cohérent garde le comportement natif.
 */
export function installDomTranslationGuard(): void {
  if (typeof Node === "undefined" || typeof window === "undefined") return;
  const w = window as unknown as { __domTranslationGuard?: boolean };
  if (w.__domTranslationGuard) return;
  w.__domTranslationGuard = true;

  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) {
      return child;
    }
    return originalRemoveChild.call(this, child) as T;
  } as typeof Node.prototype.removeChild;

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(
    this: Node,
    newNode: T,
    referenceNode: Node | null,
  ): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      return this.appendChild(newNode) as T;
    }
    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  } as typeof Node.prototype.insertBefore;
}

export default installDomTranslationGuard;
