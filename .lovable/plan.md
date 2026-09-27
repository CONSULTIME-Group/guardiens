# Lots P1 à P3 : Entraide et accueil

Règles : textes repris mot pour mot, aucun tiret cadratin ni demi-cadratin, aucune construction négative, « voisin » et « gratuit » proscrits, vouvoiement. Aucune publication.

## P2 : état actuel du parcours d'acceptation (lu en base et dans le code)

- Aujourd'hui, on ne peut choisir quelqu'un qu'à un seul endroit : la page du besoin (`SmallMissionDetail.tsx`), dans la carte de réponse `MissionResponseCard.tsx`, bouton « Retenir cette personne ». Ce bouton appelle `accept_mission_response`.
- Pourquoi ce choix reste invisible pour le demandeur :
  1. Les 7 réponses en attente n'ont aucun `conversation_id` et aucune conversation n'est rattachée au besoin (`small_mission_id` vide). Les échanges ont bien lieu, mais dans des conversations `sitter_inquiry` sans lien avec le besoin : 1, 9, 4 et 4 messages. Dans la messagerie, rien ne rappelle donc le besoin et aucun bouton ne permet de choisir.
  2. Le bouton « Ouvrir la messagerie » de la carte mène à `/messages`, sans conversation précise. Le demandeur quitte ainsi la page du besoin pour ne plus y revenir.
  3. Aucune relance n'invite à choisir. Le vocabulaire « Retenir » est aussi plus discret que l'action attendue.
- Correction de votre constat : en base, 7 réponses sont en attente (de 5 à 83 jours) et non 4. Deux concernent des besoins annulés et une un besoin terminé. Les 4 dont vous parlez sont celles des besoins encore ouverts.

## P1 : vérité et « Je peux »

1. `src/components/landing/ConfianceSection.tsx`, 3e condition : « Écusson « Identité vérifiée » et avis croisés publiés après les gardes. Pour les propriétaires, Guardiens est offert. »
2. Dans `src/i18n/locales/fr/common.json` :
   - `landing.faq.a1` : la phrase finale devient « Chacun rend service à l'autre : l'échange se fait en temps et en services. »
   - `landing.faq.a8` : « les dossiers à compléter sont revus par notre équipe ».
   - Les mêmes textes sont repris dans `HomeJsonLd.tsx`, via `siteRoutes.ts` et la synchronisation de `index.html` si la phrase y figure.
   - Pendant l'écriture, je relève toutes les autres constructions négatives de la FAQ et de l'accueil (« ne ... pas », « aucun », « sans », « jamais », « rien »), avec la liste avant et après dans le rapport. Je ne réécris aucune d'elles sans votre accord.
3. « Je peux » sur `/petites-missions` (`EntraideHub.tsx`, `EntraideCards.tsx`) : le clic ouvre un Dialog existant (shadcn).
   - Texte : « Vous proposez votre aide à {prénom} pour « {titre} ». {Prénom} reçoit votre message et vous répond. »
   - Un champ Textarea prérempli avec « Je peux vous aider. », modifiable.
   - Deux boutons : « Envoyer » et « Annuler ».
   - L'envoi passe par la même fonction `respondToMission`, avec les mêmes contrôles (statut ouvert, garde-fou argent, déjà répondu). Le prénom du demandeur vient de `public_small_missions` ou `public_profiles`, à vérifier pendant l'écriture.
4. Réponses retirées :
   - Migration Drizzle `0021_mission_response_counts_active` : `CREATE OR REPLACE VIEW public.public_mission_response_counts` à l'identique, plus `AND r.status IN ('pending','accepted')`. Les grants sont conservés.
   - `myResponses` dans `EntraideHub.tsx` ajoute `.in("status", ["pending","accepted"])`.
   - Je vérifie aussi `respondToMission` : l'insertion ne doit pas échouer sur une contrainte d'unicité (mission, membre) quand une ligne `withdrawn` existe. Si elle existe, je vous propose une remise en attente de la ligne retirée plutôt qu'un nouvel insert, sans changer le schéma.
5. HelperCard : dans `EntraideCards.tsx` ligne 207, la version liste affiche encore « Disponible pour un coup de main ». Elle n'affichera plus cette ligne quand `helps_with` est vide. Je vérifie aussi la version compacte et `NearbyHelpersCarousel`, et j'ajoute un test sur les deux versions.
6. Liste des besoins :
   - Une seule liste, triée par distance. Le titre « Besoins ouverts » devient visible (il est aujourd'hui `sr-only`).
   - Avant le premier besoin situé à plus de 30 km, un séparateur discret : « Plus loin, pour celles et ceux qui voyagent ».
   - S'il n'existe aucun besoin à 30 km ou moins, l'encart « Le premier besoin de votre secteur peut être le vôtre. » et son bouton restent en tête.
   - La liste n'est jamais repliée ni vide tant qu'il existe au moins un besoin. Un test couvre ce point.
7. `LiveListingsStrip.tsx` :
   - Le titre par défaut est « En ce moment sur Guardiens ».
   - Il devient « En ce moment près de {ville} » quand une origine est connue : la ville saisie dans le hero (état partagé via le paramètre existant du hero, à vérifier), ou les coordonnées et la ville du profil pour un membre connecté.
   - Le tri se fait alors automatiquement par distance, avec le tri local existant.

## P2 : fermer la boucle

8. Rattacher la conversation au besoin :
   - Quand un « Je peux » est envoyé, ou quand le demandeur écrit à la personne depuis la carte, la conversation est créée ou réutilisée avec `small_mission_id` et `context_type='mission_help'`, puis enregistrée dans `small_mission_responses.conversation_id`. Tout passe par une fonction serveur SECURITY DEFINER, pour éviter de toucher aux politiques d'accès existantes.
   - Les conversations `sitter_inquiry` déjà ouvertes entre les deux membres sont retrouvées par paire (demandeur, répondant) pour les 4 cas actuels, sans aucune modification de données tant que vous n'avez pas donné votre GO.
9. Bouton « Choisir {prénom} » :
   - Dans `Messages.tsx`, un bandeau en tête de toute conversation liée à un besoin ouvert, visible par le demandeur, rappelle le titre du besoin et porte le bouton « Choisir {prénom} ».
   - Sur la page du besoin, « Retenir cette personne » devient « Choisir {prénom} ». Le bouton « Ouvrir la messagerie » ouvre la bonne conversation.
   - Les deux boutons appellent `accept_mission_response`, qui n'est pas modifiée.
10. Email à 48 h :
    - Nouveau gabarit `entraide-choisir-aide`, envoyé au demandeur 48 h après le premier échange de messages sans choix.
    - Texte : « Vous avez échangé avec {prénom} au sujet de « {titre} ». C'est {prénom} qui vous aide ? »
    - Un seul bouton porte un jeton `mission_action_tokens` (action `choose_helper`, besoin, répondant) et mène à une page qui confirme le choix via `consume_mission_action_token`, étendue pour appeler `accept_mission_response`.
    - Déclenchement : passage dans `notify-mission-wave`, déjà planifié toutes les heures, pour éviter une nouvelle tâche planifiée. Un seul envoi par couple (idempotence).
11. Question de rencontre (`confirm_mission_meetup`, existante) : elle part après la date du besoin, ou 7 jours après le choix si le besoin n'a pas de date. Même passage horaire, un seul envoi. Je vérifie d'abord comment elle est déclenchée aujourd'hui.

## P3 : mise en page de l'accueil

12. `HowItWorksSection.tsx` :
    - Deux cartes de même structure : un titre, 3 étapes et un bouton chacune, « Publier mon annonce de garde » et « Demander un coup de main ».
    - En dessous, les 6 pastilles en pleine largeur, avec le titre « Un coup de main en un clic, par exemple : ». Les illustrations restent dans cette section.
13. `ServiceAfterServiceSection.tsx` :
    - Les 3 illustrations sont retirées. Chaque étape affiche le mois en grand, en Playfair, puis la phrase.
    - Viennent ensuite la citation, le paragraphe, puis la signature « Elisa et Jérémie · Lire notre histoire » (lien `/a-propos`).
    - Un seul bouton, « Demander un coup de main », puis le lien « Lire l'article ».
    - Les 3 lignes d'histoire et le bouton de garde sont retirés. L'image des toits reste.
14. Cohérence :
    - Le H2 de « En ce moment » prend la classe H2 commune.
    - L'alternance des fonds est rétablie entre « Qu'est-ce que Guardiens ? » et la FAQ.
    - Deux styles de bouton seulement : plein arrondi et contour arrondi (`rounded-full`, variants `default` et `outline`). Je relève chaque écart.
15. Parcours visiteur :
    - Un petit utilitaire `memberOrSignup(path)` envoie les visiteurs non connectés vers `/inscription?redirect=<chemin>`. Il s'applique à `HowItWorksSection`, aux pastilles, à `ServiceAfterServiceSection` et à `FinalCtaSection`.
    - La phrase « Inscription en 2 minutes… » du CTA final s'affiche aux visiteurs seulement.
    - Je vérifie que `/inscription` accepte bien `redirect`. Sinon, je l'ajoute.

## Migrations prévues

- `0021_mission_response_counts_active` : la vue filtrée.
- `0022_mission_choose_loop` :
  - une fonction qui lie la conversation au besoin ;
  - `consume_mission_action_token` étendue à l'action `choose_helper` ;
  - une colonne nullable `small_mission_responses.choose_reminder_sent_at` et une colonne `meetup_question_sent_at`, si elle n'existe pas déjà.
  - Aucune suppression. Une table de sauvegarde datée sera créée si une fonction existante est remplacée.

## Validation

Pour chaque lot : tests ciblés, dont la liste jamais vide, le séparateur à 30 km, la fenêtre « Je peux », la HelperCard, le titre dynamique et les redirections des visiteurs. Puis Vitest complet, tsgo, test:sql, build et un contrôle visuel à 360 et 1 440 px. Je redéploie seulement `notify-mission-wave` et `send-transactional-email`. Aucune publication. Livraison dans l'ordre P1, P2, P3, avec un commit par lot.
