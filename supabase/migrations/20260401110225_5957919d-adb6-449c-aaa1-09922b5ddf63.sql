
ALTER TABLE public.long_stay_applications DROP CONSTRAINT long_stay_applications_sitter_id_fkey;
ALTER TABLE public.long_stay_applications ADD CONSTRAINT long_stay_applications_sitter_id_fkey FOREIGN KEY (sitter_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public.long_stays DROP CONSTRAINT long_stays_user_id_fkey;
ALTER TABLE public.long_stays ADD CONSTRAINT long_stays_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public.skills_library DROP CONSTRAINT skills_library_first_submitted_by_fkey;
ALTER TABLE public.skills_library ADD CONSTRAINT skills_library_first_submitted_by_fkey FOREIGN KEY (first_submitted_by) REFERENCES profiles(id) ON DELETE SET NULL;
