## Objectif

Intégrer 3 fonctionnalités LLM légères via Lovable AI Gateway (Gemini Flash, ~0.01€/appel, aucune clé à fournir), sans toucher au produit existant.

## 1. Réécriture d'annonce (bouton "Améliorer ma description")

- Edge function `improve-sit-description` : entrée = texte brut + contexte (animaux, type logement, dates), sortie JSON `{ title, description, suggestions[] }`.
- Bouton ajouté dans le formulaire de création/édition de sit, à côté du champ description.
- Modal de prévisualisation avant/après avec acceptation partielle (titre seul, description seule, ou les deux).
- Garde-fou tone : vouvoiement obligatoire, pas de tiret cadratin, pas du mot proscrit « voisin », pas d'AURA (mémoires projet respectées).

## 2. Bio guidée gardien (3 brouillons à partir de 5 questions)

- Edge function `generate-bio-drafts` : entrée = 5 réponses courtes (expériences animaux, dispos, motivations, style, lieu), sortie = 3 brouillons distincts (chaleureux / pro / décontracté).
- Ajout dans le profil gardien : bouton "Générer ma bio" qui ouvre un mini-wizard (5 questions courtes) puis affiche les 3 cartes. Clic = remplit le champ bio.
- Booste le completion score (seuil 60% pour Level 1).

## 3. Modération pré-publication (annonces + messages)

- Edge function `moderate-content` : entrée = texte + type (annonce/message), sortie = `{ status: ok|warning|block, reasons[] }`.
- Détection : coordonnées (tel, email, adresses), tentatives de transaction off-platform, propos hors-charte, mot proscrit.
- Hook côté front : appelé silencieusement à la soumission. Si `warning` → toast non bloquant avec correction suggérée. Si `block` → modal explicative + lien CGS.
- Trace en DB (`moderation_logs`) pour la file admin existante.

## Architecture technique

- 3 edge functions Supabase, modèle `google/gemini-3-flash-preview`, `verify_jwt=true` par défaut.
- Provider helper partagé `_shared/ai-gateway.ts`.
- Lazy-import depuis le front (pas de surcoût bundle).
- Toasts via `sonner` existant.
- Aucune nouvelle dépendance npm.

## DB (nouvelle table)

```sql
create table public.moderation_logs (
  id uuid pk default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  content_type text, -- 'sit' | 'message' | 'bio'
  status text,      -- 'ok' | 'warning' | 'block'
  reasons jsonb,
  excerpt text,
  created_at timestamptz default now()
);
```
+ RLS : user voit ses propres logs, admin via `has_role`, GRANT standards.

## Hors scope (à proposer plus tard si succès)

- Matching sémantique (embeddings) → phase 2
- Réponses suggérées en messagerie → phase 2
- Chat FAQ → phase 3

## Coût estimé

~0.005–0.02 € par appel selon longueur. Modération = appel court (~0.003 €). Réécriture/bio = ~0.015 €. Volume gardien actuel = négligeable sur le budget Lovable AI.
