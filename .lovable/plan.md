

## Audit Expert — Parcours Échange de Services & Petites Missions

---

### [M] MÉTIER — Réalité terrain

**Le parcours fonctionne, mais il y a 7 problèmes concrets :**

1. **Deux dialogues d'échange avec des logiques différentes** : `ProposeExchangeDialog` (depuis une mission) et `ProposeHelperExchangeDialog` (depuis un profil/helper). Le second crée une mission fantôme (titre = la description tronquée), ce qui pollue la liste des missions. Un utilisateur qui propose un échange à un helper se retrouve avec une mission publiée à son nom qu'il n'a pas demandée.

2. **Pas de bouton "Marquer comme terminée"** : L'auteur peut accepter une proposition → mission passe en `in_progress`. Mais pour passer à `completed`, il n'y a aucun bouton visible. Le feedback n'apparaît que quand `status === "completed"`. **Le cycle de vie est cassé.**

3. **Le CTA "Proposer mon aide" dans le dashboard redirige vers `/petites-missions/creer?type=offre`** mais CreateSmallMission ne gère pas le paramètre `type`. L'utilisateur tombe sur le formulaire standard sans comprendre la différence.

4. **Sur le profil public**, le `PublicSkills` est affiché deux fois : une fois dans le header (ligne 226-228) et une fois dans l'onglet Entraide (ligne 472-473). Doublon visible.

5. **`handleContact` dans PublicProfile** crée une conversation privée (sans `small_mission_id`) mais ne force pas `sit_id = null` ni `small_mission_id = null`. Risque de collision si une conv existe déjà avec un `sit_id`.

6. **La recherche par compétence** dans SmallMissions ne filtre que les helpers, pas les missions. Incohérent.

7. **Catégorie `house` vs `coups_de_main`** : confusion. `CreateSmallMission` propose `house`, `SmallMissions` filtre `coups_de_main`, et le mapping `SKILL_TO_MISSION` dans MissionsNearbySection mappe `coups_de_main → house`. Les missions catégorie `house` sont filtrées en dur (`if (m.category === "house") return false` ligne 435). **Certaines missions créées sont invisibles.**

---

### [P] PRODUIT — Faisabilité et correctifs

**Correctifs prioritaires (par impact) :**

| # | Problème | Correctif | Complexité |
|---|----------|-----------|------------|
| 1 | Cycle de vie cassé (pas de "Terminer") | Ajouter bouton "Mission terminée" dans SmallMissionDetail quand `status === "in_progress"` et `isAuthor` | Simple |
| 2 | Doublon PublicSkills | Retirer l'affichage dans le header (ligne 226-228 de PublicProfile) — garder uniquement dans l'onglet Entraide | Simple |
| 3 | Catégorie house invisible | Renommer `house` → afficher dans la liste OU retirer le filtre ligne 435 | Simple |
| 4 | Mission fantôme créée par ProposeHelperExchangeDialog | Refactorer pour ne plus créer de `small_mission` — juste créer une conversation + message structuré + notification | Moyen |
| 5 | CTA "Proposer mon aide" → formulaire sans contexte | Soit ouvrir le dialogue local (comme dans SmallMissions), soit gérer `?type=offre` dans CreateSmallMission | Simple |
| 6 | handleContact sans null explicite | Forcer `sit_id: null, small_mission_id: null` dans l'insert | Trivial |
| 7 | Recherche compétence ne filtre pas les missions | Appliquer le même filtre textuel aux titres/descriptions de missions | Simple |

---

### [C] COMMERCIAL — Impact conversion

**Le problème #1 (pas de bouton "Terminer") bloque directement la boucle de feedback.** Sans feedback, pas de badges, pas de preuve sociale, pas de rétention. C'est le frein le plus critique à l'engagement.

**Le problème #4 (mission fantôme)** dégrade la qualité perçue de la liste de missions. Un visiteur voit des missions avec des titres tronqués et sans contexte.

---

### Fichiers modifiés

- `src/pages/SmallMissionDetail.tsx` — bouton "Terminer la mission"
- `src/pages/PublicProfile.tsx` — retirer doublon PublicSkills du header
- `src/pages/SmallMissions.tsx` — retirer filtre `house`, harmoniser catégories
- `src/components/missions/ProposeHelperExchangeDialog.tsx` — refactorer (plus de mission fantôme)
- `src/pages/CreateSmallMission.tsx` — gérer `?type=offre`
- `src/components/dashboard/MissionsNearbySection.tsx` — corriger le CTA
- `src/pages/PublicProfile.tsx` — forcer null dans handleContact

---

### JURY

| | |
|---|---|
| ⚠ **LE POINT QUI NE TIENT PAS** | Le cycle de vie `open → in_progress → ???` est cassé. Aucun utilisateur ne peut terminer une mission. Les feedbacks sont inaccessibles. Tout le système de réputation d'entraide est mort-né. |
| 🔍 **L'ANGLE MORT** | La catégorie `house` créée par le formulaire est filtrée par la liste. Des missions existent en base mais sont **invisibles**. Si un utilisateur a posté une mission "house", elle a disparu sans explication. |
| 💡 **L'ALTERNATIVE RADICALE** | Supprimer `ProposeHelperExchangeDialog` entièrement. Un helper = un profil avec compétences. L'échange commence par un message libre, pas par un formulaire qui crée une mission fantôme. Simplifier au lieu d'ajouter de la mécanique. |
| ✅ **L'AJUSTEMENT ACTIONNABLE** | Ajouter le bouton "Terminer la mission" maintenant — c'est 15 lignes de code et ça débloque toute la chaîne de valeur. |
| → Si j'étais Jérémie, je changerais : | J'ajouterais le bouton "Terminer" et je supprimerais la création de mission fantôme dans ProposeHelperExchangeDialog — dans cet ordre, aujourd'hui. |

