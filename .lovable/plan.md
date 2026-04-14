

## Plan — Cohérence du parcours Entraide sur le profil public

### Problèmes identifiés

1. **Compétences spécifiques invisibles** : `PublicSkills` ne charge pas `sitter_profiles.competences`. Un visiteur arrivant sur le profil depuis "Voir le profil" ne voit que les catégories génériques (Jardin, Animaux), pas les compétences détaillées.

2. **Entraide cachée sous "Avis"** : `EntraideSection` (missions réalisées, badges, avis d'entraide) est enfouie en bas de l'onglet "Avis". Pas de tab dédié "Entraide".

3. **CTA "Proposer un échange" cassé** : Le lien dans `PublicSkills` ouvre un message brut (`/messages?new=true&to=...`) au lieu d'ouvrir le dialogue structuré `ProposeHelperExchangeDialog` qui crée une mission + conversation + notification.

### Corrections prévues

**1. Afficher les compétences spécifiques sur le profil public**
- Modifier `PublicSkills.tsx` : ajouter une requête vers `sitter_profiles.competences` (en plus des `custom_skills` déjà chargés)
- Afficher ces compétences comme pills distinctes sous les catégories

**2. Créer un onglet "Entraide" dédié dans le profil public**
- `PublicProfile.tsx` : ajouter un tab "Entraide" dans la TabsList
- Y déplacer `PublicSkills` + `EntraideSection` (retirer des emplacements actuels)
- Conditionné à : `profile.available_for_help` ou activité entraide existante

**3. Remplacer le CTA par un vrai dialogue d'échange**
- `PublicSkills.tsx` : remplacer le lien `/messages?new=true` par un bouton qui ouvre `ProposeHelperExchangeDialog`
- Passer les données du helper (id, prénom, ville, compétences) au dialogue
- Résultat : même workflow que depuis la page `/petites-missions` (création mission + conversation + notification)

### Fichiers modifiés
- `src/components/profile/PublicSkills.tsx`
- `src/pages/PublicProfile.tsx`

