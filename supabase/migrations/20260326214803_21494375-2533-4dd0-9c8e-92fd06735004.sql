
-- Owner gallery table
CREATE TYPE public.owner_gallery_category AS ENUM ('home_life', 'animals_life', 'garden', 'neighborhood', 'seasonal');

CREATE TABLE public.owner_gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  photo_url text NOT NULL,
  caption text NOT NULL DEFAULT '',
  category owner_gallery_category NOT NULL DEFAULT 'home_life',
  season text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.owner_gallery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all owner gallery photos" ON public.owner_gallery FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own gallery photos" ON public.owner_gallery FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own gallery photos" ON public.owner_gallery FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own gallery photos" ON public.owner_gallery FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Owner highlights (coups de coeur)
CREATE TABLE public.owner_highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  sitter_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  sit_id uuid REFERENCES public.sits(id) ON DELETE CASCADE NOT NULL,
  photo_url text,
  text text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  hidden boolean NOT NULL DEFAULT false
);

ALTER TABLE public.owner_highlights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view non-hidden highlights" ON public.owner_highlights FOR SELECT TO authenticated USING (hidden = false OR auth.uid() = owner_id OR auth.uid() = sitter_id);
CREATE POLICY "Sitters can insert highlights" ON public.owner_highlights FOR INSERT TO authenticated WITH CHECK (auth.uid() = sitter_id);
CREATE POLICY "Owners can update highlights (hide)" ON public.owner_highlights FOR UPDATE TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Sitters can delete own highlights" ON public.owner_highlights FOR DELETE TO authenticated USING (auth.uid() = sitter_id);
