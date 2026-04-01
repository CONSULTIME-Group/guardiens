
-- CORRECTION 1: Add cancellations_as_proprio to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS cancellations_as_proprio integer NOT NULL DEFAULT 0;

-- Add check constraint (use trigger-based validation to avoid immutability issues)
CREATE OR REPLACE FUNCTION validate_cancellations_as_proprio()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.cancellations_as_proprio < 0 THEN
    RAISE EXCEPTION 'cancellations_as_proprio must be >= 0';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_cancellations_proprio ON profiles;
CREATE TRIGGER trg_validate_cancellations_proprio
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_cancellations_as_proprio();

-- Create/replace recalculate_cancellations for both roles
CREATE OR REPLACE FUNCTION recalculate_cancellations(
  p_user_id uuid,
  p_role text
) RETURNS void AS $$
BEGIN
  IF p_role = 'gardien' THEN
    UPDATE profiles
    SET cancellation_count = (
      SELECT COUNT(*) FROM sits s
      JOIN applications a ON a.sit_id = s.id AND a.status = 'accepted'
      WHERE a.sitter_id = p_user_id
        AND s.status = 'cancelled'
        AND s.cancelled_by = 'gardien'
    )
    WHERE id = p_user_id;
  ELSIF p_role = 'proprio' THEN
    UPDATE profiles
    SET cancellations_as_proprio = (
      SELECT COUNT(*) FROM sits
      WHERE user_id = p_user_id
        AND status = 'cancelled'
        AND cancelled_by = 'proprio'
    )
    WHERE id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create/replace trigger function for sits cancellation
CREATE OR REPLACE FUNCTION trigger_update_cancellations()
RETURNS TRIGGER AS $$
DECLARE
  v_sitter_id uuid;
BEGIN
  IF TG_OP = 'UPDATE'
     AND (OLD.status IS DISTINCT FROM NEW.status)
     AND NEW.status = 'cancelled' THEN

    -- If cancelled by gardien, find the accepted sitter
    IF NEW.cancelled_by = 'gardien' THEN
      SELECT a.sitter_id INTO v_sitter_id
      FROM applications a
      WHERE a.sit_id = NEW.id AND a.status = 'accepted'
      LIMIT 1;

      IF v_sitter_id IS NOT NULL THEN
        PERFORM recalculate_cancellations(v_sitter_id, 'gardien');
      END IF;
    END IF;

    -- If cancelled by proprio, update owner
    IF NEW.cancelled_by = 'proprio' THEN
      PERFORM recalculate_cancellations(NEW.user_id, 'proprio');
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_cancellations ON sits;
CREATE TRIGGER trg_update_cancellations
  AFTER UPDATE ON sits
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_cancellations();

-- CORRECTION 2: min_gardien_sits already exists on sits, just ensure constraint and index
-- Add validation trigger for allowed values
CREATE OR REPLACE FUNCTION validate_min_gardien_sits()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.min_gardien_sits NOT IN (0, 1, 3, 5) THEN
    RAISE EXCEPTION 'min_gardien_sits must be 0, 1, 3 or 5';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_min_gardien_sits ON sits;
CREATE TRIGGER trg_validate_min_gardien_sits
  BEFORE INSERT OR UPDATE ON sits
  FOR EACH ROW
  EXECUTE FUNCTION validate_min_gardien_sits();

CREATE INDEX IF NOT EXISTS idx_sits_min_gardien_sits ON sits (min_gardien_sits);
