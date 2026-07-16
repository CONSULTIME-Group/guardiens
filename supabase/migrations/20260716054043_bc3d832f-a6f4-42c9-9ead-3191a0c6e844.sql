
CREATE OR REPLACE FUNCTION public.guard_row_no_llm_refusal()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  col_name text;
  col_value text;
BEGIN
  FOREACH col_name IN ARRAY TG_ARGV::text[] LOOP
    EXECUTE format('SELECT ($1).%I::text', col_name) INTO col_value USING NEW;
    IF col_value IS NOT NULL AND public.is_llm_refusal_text(col_value) THEN
      RAISE EXCEPTION 'Contenu invalide (%) : ressemble à une réponse d''assistant IA en échec. Merci de personnaliser le texte avant enregistrement.', col_name
        USING ERRCODE = 'check_violation';
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_sit_no_llm_refusal ON public.sits;
CREATE TRIGGER trg_guard_sit_no_llm_refusal
BEFORE INSERT OR UPDATE OF title, specific_expectations, daily_routine, owner_message
ON public.sits
FOR EACH ROW EXECUTE FUNCTION public.guard_row_no_llm_refusal('title', 'specific_expectations', 'daily_routine', 'owner_message');

DROP TRIGGER IF EXISTS trg_guard_review_no_llm_refusal ON public.reviews;
CREATE TRIGGER trg_guard_review_no_llm_refusal
BEFORE INSERT OR UPDATE OF comment
ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.guard_row_no_llm_refusal('comment');

DROP TRIGGER IF EXISTS trg_guard_small_mission_no_llm_refusal ON public.small_missions;
CREATE TRIGGER trg_guard_small_mission_no_llm_refusal
BEFORE INSERT OR UPDATE OF title, description, exchange_offer
ON public.small_missions
FOR EACH ROW EXECUTE FUNCTION public.guard_row_no_llm_refusal('title', 'description', 'exchange_offer');

DROP TRIGGER IF EXISTS trg_guard_house_guide_no_llm_refusal ON public.house_guides;
CREATE TRIGGER trg_guard_house_guide_no_llm_refusal
BEFORE INSERT OR UPDATE OF wifi_instructions, detailed_instructions, vet_address, emergency_contact_name
ON public.house_guides
FOR EACH ROW EXECUTE FUNCTION public.guard_row_no_llm_refusal('wifi_instructions', 'detailed_instructions', 'vet_address', 'emergency_contact_name');
