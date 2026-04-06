-- Add conversation_id column to small_mission_responses
ALTER TABLE public.small_mission_responses 
  ADD COLUMN conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL;

-- Add unique constraint on (mission_id, responder_id) for upsert
ALTER TABLE public.small_mission_responses 
  ADD CONSTRAINT small_mission_responses_mission_responder_unique 
  UNIQUE (mission_id, responder_id);

-- Allow responder to update their own response status (for marking complete)
CREATE POLICY "Responder can update own response"
  ON public.small_mission_responses
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = responder_id);

-- Enable realtime for small_mission_responses
ALTER PUBLICATION supabase_realtime ADD TABLE public.small_mission_responses;