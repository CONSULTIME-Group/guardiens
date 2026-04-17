
## Plan: Réponse "prix des instances Cloud"

C'est une question pure d'information, pas de code. Aucun fichier à modifier.

### Ce que dit la doc officielle Lovable (vérifié)

**Lovable ne publie PAS de tarif fixe par taille d'instance** (Tiny / Mini / Small / Medium / Large). C'est volontaire : le modèle est **100% à l'usage**, calculé en temps réel sur :
- L'activité (nombre d'utilisateurs, requêtes)
- Le transfert de données (uploads/downloads)
- La taille d'instance choisie (multiplicateur)

### Ce qu'on peut affirmer avec certitude

| Info | Valeur officielle |
|---|---|
| Crédit Cloud offert/mois (tous plans) | **25 $** |
| Crédit AI offert/mois | **1 $** |
| Reset | 1er du mois à 00:00 UTC, **non cumulable** |
| Offre temporaire jusqu'à fin mai 2026 | 25 $ Cloud + 1 $ AI même sur plan Free |
| Top-up minimum (plans payants) | 10 $ |

### Exemples officiels de coût mensuel total (extraits doc)

| Type d'app | Cloud | AI | Coût net |
|---|---|---|---|
| Blog perso (500 visites) | 1 $ | 1 $ | **0 $** (couvert par les 25$ offerts) |
| Site PME (5 000 visites) | 5 $ | 2 $ | **1 $** |
| Outil équipe (10 000 visites, 20 users) | 15 $ | 5 $ | **4 $** |
| E-commerce (10 000 visites, 500 ventes) | 65 $ | 10 $ | **49 $** |

### Estimation honnête pour Guardiens (Medium)

Votre profil = entre "outil équipe" et "e-commerce" à cause du SEO + edge functions + bots. Estimation réaliste : **15–30 $/mois Cloud net après crédit gratuit de 25 $**, soit **probablement gratuit à payant léger**.

### Réponse que je vais formater pour vous

1. Dire clairement qu'**il n'y a pas de prix fixe par taille** — c'est de l'usage
2. Donner les 25 $ offerts comme repère
3. Montrer le tableau d'exemples de la doc
4. Estimer Guardiens en Medium
5. Recommander : passez Medium, surveillez 1 semaine **Settings → Cloud & AI balance**, ajustez si besoin
6. Lien vers la page de monitoring exacte

**Aucun fichier modifié. Réponse texte uniquement.**
