
-- Enums for small missions
CREATE TYPE public.small_mission_category AS ENUM ('animals', 'garden', 'house', 'skills');
CREATE TYPE public.small_mission_status AS ENUM ('open', 'in_progress', 'completed', 'cancelled');
CREATE TYPE public.small_mission_response_status AS ENUM ('pending', 'accepted', 'declined');

-- Main missions table
CREATE TABLE public.small_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  category small_mission_category NOT NULL DEFAULT 'animals',
  exchange_offer text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  postal_code text NOT NULL DEFAULT '',
  latitude numeric,
  longitude numeric,
  date_needed date,
  duration_estimate text NOT NULL DEFAULT '',
  status small_mission_status NOT NULL DEFAULT 'open',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Responses table
CREATE TABLE public.small_mission_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL REFERENCES public.small_missions(id) ON DELETE CASCADE,
  responder_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message text NOT NULL DEFAULT '',
  status small_mission_response_status NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.small_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.small_mission_responses ENABLE ROW LEVEL SECURITY;

-- RLS: small_missions
CREATE POLICY "Authenticated can read open missions" ON public.small_missions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Open missions publicly readable" ON public.small_missions
  FOR SELECT TO anon USING (status = 'open');

CREATE POLICY "Users can insert own missions" ON public.small_missions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own missions" ON public.small_missions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own missions" ON public.small_missions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- RLS: small_mission_responses
CREATE POLICY "Mission owner and responder can read" ON public.small_mission_responses
  FOR SELECT TO authenticated USING (
    auth.uid() = responder_id OR
    EXISTS (SELECT 1 FROM public.small_missions m WHERE m.id = mission_id AND m.user_id = auth.uid())
  );

CREATE POLICY "Users can insert responses" ON public.small_mission_responses
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = responder_id);

CREATE POLICY "Mission owner can update response status" ON public.small_mission_responses
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.small_missions m WHERE m.id = mission_id AND m.user_id = auth.uid())
  );

-- Trigger updated_at
CREATE TRIGGER update_small_missions_updated_at
  BEFORE UPDATE ON public.small_missions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
