-- Étendre l'enum conversation_context pour différencier les contacts d'aidants
ALTER TYPE public.conversation_context ADD VALUE IF NOT EXISTS 'helper_inquiry';