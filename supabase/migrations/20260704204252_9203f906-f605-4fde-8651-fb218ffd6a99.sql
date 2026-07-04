-- 0) Ajouter 'archived' à l'enum sit_status s'il manque
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'sit_status' AND e.enumlabel = 'archived'
  ) THEN
    ALTER TYPE public.sit_status ADD VALUE 'archived';
  END IF;
END $$;
