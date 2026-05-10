
-- Add status column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Add index for status filtering
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
