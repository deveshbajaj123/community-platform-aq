-- Add bio column to members table
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS bio TEXT;
