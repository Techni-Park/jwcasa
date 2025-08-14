-- Add missing updated_at column to type_activite table
ALTER TABLE public.type_activite 
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();