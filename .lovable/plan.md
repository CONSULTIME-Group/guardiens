
Le Worker est bien configuré sur `guardiens.fr/*` ET `*guardiens.fr/*` (les deux routes couvrent tout le trafic, y compris `www`). Le token Prerender est en place. La config Cloudflare est correcte.

Il faut maintenant **tester en conditions réelles** que le Worker intercepte bien Googlebot et renvoie le HTML prérendu.

## Plan de vérification

**1. Tests curl avec User-Agent Googlebot**
Lancer 3 requêtes en parallèle sur des URLs critiques :
- Page d'accueil : `https://guardiens.fr/`
- Article : `https://guardiens.fr/actualites/s-absenter-avec-animal-guide-solutions-2026`
- Profil ville : `https://guardiens.fr/house-sitting/lyon`

Vérifier dans les réponses :
- Header `X-Prerender-Status: hit` (= Worker actif + Prerender.io répond)
- Header `cf-worker` ou similaire (= Worker exécuté)
- `<title>` réel de la page (pas le shell générique de 3.9KB)
- Présence du contenu textuel (h1, paragraphes)

**2. Comparaison avec User-Agent navigateur normal**
Même URL, UA Chrome → doit renvoyer le shell React standard (pas de prérendu). Confirme que le bypass fonctionne.

**3. Diagnostic selon résultats**

| Résultat | Diagnostic | Action |
|----------|-----------|--------|
| `X-Prerender-Status: hit` + contenu HTML | ✅ Tout fonctionne | Soumettre sitemap à Google Search Console |
| Header présent mais HTML vide/erreur | Token Prerender invalide ou quota dépassé | Vérifier compte prerender.io |
| Aucun header Prerender | Worker pas déclenché malgré la route | Vérifier ordre des routes / cache Vercel |
| Shell React 3.9KB renvoyé | Worker bypass le bot | Vérifier regex `BOT_AGENTS` |

**4. Si tout est OK**
- Tester Google Rich Results : `https://search.google.com/test/rich-results`
- Soumettre 5 URLs prioritaires dans GSC pour indexation accélérée
- Documenter le statut dans le mémoire SEO

**Aucune modification de code prévue à ce stade** — uniquement diagnostic. Si un problème est détecté, je proposerai un correctif ciblé.
