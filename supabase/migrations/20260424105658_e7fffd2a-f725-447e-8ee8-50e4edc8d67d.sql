-- Supprimer la notification "Nouveau gardien disponible" (spam, faible valeur)
-- Les propriétaires intéressés peuvent configurer des alertes ciblées via alert_preferences.

DROP TRIGGER IF EXISTS on_sitter_available ON public.sitter_profiles;
DROP FUNCTION IF EXISTS public.notify_owners_sitter_available();

-- Nettoyer les notifications existantes de ce type pour ne plus polluer le centre de notifs
DELETE FROM public.notifications WHERE type = 'sitter_available';