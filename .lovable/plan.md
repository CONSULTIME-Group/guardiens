

## Diagnostic — État actuel

Le flux est correctement câblé côté code :

1. **Inscription** (`AuthContext.register`) → `signUp` avec `emailRedirectTo: /auth/confirm?next=/dashboard` et `data: { role }` en metadata
2. **Email** → `auth-email-hook` rend le template `signup.tsx` avec `confirmationUrl` (le lien Supabase)
3. **Clic lien** → arrive sur `/auth/confirm` → `AuthConfirm.tsx` écoute `onAuthStateChange` + tente `verifyOtp` si `token_hash` en query params
4. **Trigger DB** (`apply_role_from_metadata`) → quand `email_confirmed_at` passe de NULL à non-NULL, applique le rôle + crée `sitter_profiles` / `owner_profiles`

Le trigger a été corrigé avec le cast `::public.user_role` dans la migration précédente. L'`auto_confirm_email` avait été activé comme palliatif.

## Plan d'exécution

### Étape 1 — Désactiver auto-confirm email
Utiliser `cloud--configure_auth` pour remettre `auto_confirm_email: false`. Cela rétablit le flux normal : inscription → email de confirmation → clic → activation.

### Étape 2 — Vérifier le trigger en base
Exécuter une requête `read_query` pour confirmer que le trigger `apply_role_from_metadata` est bien attaché à `auth.users` et que le corps de la fonction contient le cast `::public.user_role`.

### Étape 3 — Vérifier la cohérence du code front
- `Register.tsx` affiche bien l'écran "Vérifiez votre boîte mail" (`step === "confirmation"`) quand `data.session` est null
- `AuthConfirm.tsx` gère correctement les 3 cas : `SIGNED_IN`, `PASSWORD_RECOVERY`, timeout 15s
- `emailRedirectTo` pointe bien vers `/auth/confirm?next=/dashboard`

→ Tout est déjà correct dans le code actuel, aucune modification front nécessaire.

### Étape 4 — Test end-to-end via le navigateur
1. Naviguer vers `/register`
2. Créer un compte test (rôle gardien)
3. Vérifier que l'écran de confirmation s'affiche (pas de redirection directe au dashboard)
4. Vérifier dans les logs edge function que l'email de confirmation part bien
5. Vérifier dans la base que le profil n'a PAS encore de `sitter_profiles` (car non confirmé)

### Résumé des actions
| Action | Outil | Risque |
|--------|-------|--------|
| Désactiver auto-confirm | `configure_auth` | Aucun — rétablit le flux normal |
| Vérifier trigger DB | `read_query` | Lecture seule |
| Test navigateur | Browser tools | Aucun |

Aucune modification de fichier nécessaire. Le code front et le trigger sont déjà prêts pour le flux avec confirmation email.

