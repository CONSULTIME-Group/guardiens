# Messagerie admin consultable, et traitement des candidatures propriétaire

## Correction de deux prémisses, vérifiée en base aujourd'hui

Avant de trancher, deux points du brief ne correspondent pas à l'état réel du projet.

1. `sits.max_applications` **est déjà utilisé**. Valeur par défaut 5 en base, 29 annonces portent une valeur, 4 annonces ont `accepting_applications = false`. La logique vit dans `src/lib/applicationCap.ts` (`countOpenApplications`, `isCapReached`, paliers 5, 10, 20), la fermeture automatique dans `SitterSitView.tsx`, la réouverture dans `ReopenApplicationsCard.tsx`, et la relance propriétaire dans `ApplicationCapSection.tsx`. Le plafond existe donc déjà, exactement sur le modèle des 5 réponses de l'entraide.
2. Le **classement par affinité existe déjà** dans `ApplicationsList.tsx` : `sortMode` vaut `affinity` par défaut, avec bascule note ou date. Les boutons Accepter et Décliner sont déjà présents sur chaque carte de la liste, sans ouvrir le profil, mais passent tous deux par une boîte de dialogue de confirmation.

Le vrai manque côté propriétaire n'est donc pas le tri ni le plafond, c'est ce qui se passe **au moment où le propriétaire dépublie** avec des candidatures encore ouvertes, et la visibilité du reste à traiter. Le plan ci-dessous est recentré là-dessus.

Chiffres actuels : 77 conversations, 220 messages humains, 34 non lus répartis sur 27 conversations, 46 candidatures dont 9 encore ouvertes.

---

## Volet 1, écran de conversations admin

### Ce qu'on construit

`/admin/messages` gagne un second onglet, Conversations, à côté de l'onglet Statistiques actuel (les 6 KPI, la répartition par type, le graphe 14 jours et le Top 20 restent tels quels).

Liste paginée et filtrable de toutes les conversations :

- colonnes : participants (propriétaire et gardien, avatar et prénom), contexte (candidature, contact gardien, coup de main, privé), annonce ou mission liée, nombre de messages, dernier message (extrait et date), non lus, statut de réponse
- filtres : période, contexte, recherche par nom de membre, et surtout **deux filtres de service** : « sans réponse » (un seul participant a écrit) et « non lus depuis plus de N jours »
- tri par dernier message, par ancienneté du non-lu, par volume
- clic sur une ligne : panneau latéral avec le fil complet, qui a écrit, quand, lu ou pas, messages système distingués, messages masqués par la modération signalés comme tels
- liens croisés vers `/admin/users?id=` et vers l'annonce

Le classement Top 20 gagne un lien « voir ses conversations » qui pré-filtre l'onglet Conversations sur ce membre, ce qui règle le cas du membre 58e invisible.

### Tables et composants

- tables : `conversations`, `messages`, `profiles`, `sits`, `small_missions`
- nouveau : `src/pages/admin/AdminMessages.tsx` passe en deux onglets, plus `src/components/admin/messages/ConversationsTable.tsx` et `ConversationThreadPanel.tsx`
- réutilisation directe de `ListingDrilldownDialog.tsx`, qui fait déjà exactement ça mais annonce par annonce

### Contrainte technique décisive

Les policies de `messages` et `conversations` n'autorisent que les **participants**. Aucune policy admin. Un admin qui interroge ces tables depuis le client ne voit rien. Tout passe donc obligatoirement par des fonctions SECURITY DEFINER, comme `admin_get_listing_conversations` et `admin_get_conversation_messages` déjà en place. On ajoute deux fonctions du même modèle, avec contrôle de rôle admin à l'intérieur :

- `admin_list_conversations(p_since, p_context, p_user_id, p_only_unanswered, p_limit, p_offset)`
- `admin_conversation_search(p_query)` pour la recherche par membre

`admin_get_conversation_messages(uuid)` est réutilisée telle quelle pour le fil.

### Ampleur et risques

Ampleur : **moyen**, environ deux fonctions SQL et trois composants.

Risques :

- aucune modification des policies existantes, donc aucun risque de fuite côté membre, à condition que les nouvelles fonctions vérifient le rôle admin en première ligne et soient révoquées de `public`
- lecture seule, aucun trigger de notification touché, aucun `read_at` modifié par l'admin (consulter un fil ne doit jamais marquer comme lu côté membre)
- le dédoublonnage de conversations de début août est neutre ici, la liste lit l'état courant
- point de vigilance produit et RGPD : consulter le contenu privé des membres est une capacité sensible, à tracer dans `admin_action_logs` à chaque ouverture de fil

---

## Volet 2, candidatures côté propriétaire

Trois chantiers, indépendants, à trancher séparément.

### 2.1 Filet de sécurité à la dépublication (le symptôme décrit)

Aujourd'hui rien n'empêche de dépublier avec 6 candidatures ouvertes, et les candidats restent sans réponse.

- au clic sur Dépublier, si des candidatures sont encore ouvertes, boîte de dialogue qui les nomme et propose deux issues : les décliner en un geste avec un message type, ou dépublier en les laissant ouvertes
- si le propriétaire dépublie sans traiter, la fermeture automatique des candidatures orphelines déjà en place prend le relais, avec le gabarit à trois cas déjà écrit

Composants : `OwnerSitView.tsx`, `Sits.tsx`, plus un composant de dialogue dédié. Ampleur : **petit**.
Risque : le déclin en masse déclenche autant d'emails, à faire passer par la même file que les déclins unitaires pour respecter les plafonds d'envoi.

### 2.2 Réponse en un clic, réellement en un clic

Les boutons existent mais imposent une confirmation modale à chaque candidature.

- Décliner : action immédiate avec message type par défaut et bandeau d'annulation pendant quelques secondes, la modale ne s'ouvre que si le propriétaire veut personnaliser
- Accepter : la confirmation reste, c'est un engagement contractuel qui déclenche l'accord de garde

Composant : `ApplicationsList.tsx`. Ampleur : **petit à moyen**.
Risque : le déclin envoie un email au gardien, l'annulation doit donc différer l'envoi, sinon un déclin annulé part quand même.

### 2.3 Visibilité du reste à traiter

- compteur permanent « X candidatures à traiter » sur la carte d'annonce du tableau de bord propriétaire, pas seulement dans la vue détaillée
- rappel au propriétaire au bout de quelques jours quand des candidatures restent en `pending`, la fonction de détection existe déjà côté supervision

Composants : tableau de bord propriétaire, `ApplicationsSection.tsx`, `ApplicationCapSection.tsx`. Ampleur : **petit**.

### Ce que je ne recommande pas

Durcir le plafond `max_applications` en dessous de 5, ou le rendre bloquant plus tôt. Avec 9 candidatures ouvertes sur toute la plateforme, le volume n'est pas le problème, la relance et la clôture le sont. Un plafond plus bas priverait surtout les propriétaires de choix.

---

## Ordre proposé

1. Volet 2.1, filet de dépublication, c'est le symptôme vécu et le plus court
2. Volet 1, onglet Conversations admin
3. Volets 2.2 et 2.3 selon ce que l'usage montre après le 2.1

Dites-moi ce que vous gardez et dans quel ordre.
