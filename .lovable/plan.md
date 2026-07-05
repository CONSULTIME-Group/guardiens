# Nettoyage dead code « long_stay » / garde longue durée

## Verdict d'audit

**Mort.** Aucun composant UI actif. La route `/long-stays/:id` existe mais redirige vers `/`. Résidus : payloads `p_long_stay_id: null` (compat RPC), enum analytics jamais émis, tables Supabase encore présentes en DB.

## Portée du nettoyage

### 1. Frontend

- `src/App.tsx` — supprimer la route legacy `/long-stays/:id` (ligne 303-304) et son commentaire.
- `src/hooks/useAutoOpenConversation.ts:94` — retirer `p_long_stay_id: null` de l'appel RPC.
- `src/lib/conversation.ts:48` — idem.
- `src/components/sits/ApplicationModal.tsx:170` — idem.
- `src/lib/analytics.ts:140` — retirer `"long_stay_created"` du type union.
- `src/pages/admin/AdminSitsManagement.tsx:26,276` — retirer les commentaires devenus obsolètes.

### 2. Backend (Lovable Cloud)

Migration SQL pour supprimer proprement :

- FK `conversations.long_stay_id` et la colonne.
- Table `public.long_stay_applications`.
- Table `public.long_stays`.
- Enums `long_stay_status`, `long_stay_access_level`.
- Retrait de la valeur `"long_stay"` de l'enum concerné (types.ts:6100, 6349) — nécessite recréation de l'enum.
- Paramètre `p_long_stay_id` des fonctions RPC concernées (RPC `open_or_create_conversation` ou équivalent) — soit suppression du paramètre, soit conservation en `default null` si d'autres appelants dépendent de la signature.

Après migration, `src/integrations/supabase/types.ts` sera régénéré automatiquement.

## Détails techniques

**Point d'attention RPC** : avant de supprimer le paramètre `p_long_stay_id` de la fonction Postgres, il faut vérifier qu'aucune edge function ni appelant externe ne l'utilise. Option prudente : garder le paramètre côté SQL avec `default null` et se contenter de retirer les `null` explicites côté client (moins invasif, même résultat visible).

**Ordre de migration recommandé** :

```text
1. DROP TABLE long_stay_applications CASCADE
2. ALTER TABLE conversations DROP COLUMN long_stay_id
3. DROP TABLE long_stays CASCADE
4. DROP TYPE long_stay_status, long_stay_access_level
5. Recréer l'enum sit_type sans 'long_stay' (si présent)
6. Régénérer types.ts
```

**Vérifications post-nettoyage** :

- `bunx tsgo --noEmit` doit passer.
- Recherche `rg -i "long_stay|longstay|garde longue"` doit ne retourner que d'éventuels commentaires historiques anodins.
- Test manuel : `/long-stays/abc` doit désormais renvoyer une 404 propre (au lieu d'une redirection silencieuse), sauf si vous préférez conserver la redirection pour les liens externes indexés.

## Question ouverte

**Conserver ou supprimer la redirection `/long-stays/:id → /`** ? Utile si des liens externes (emails passés, indexation) pointent encore vers ces URLs. Sinon, 404 propre.
