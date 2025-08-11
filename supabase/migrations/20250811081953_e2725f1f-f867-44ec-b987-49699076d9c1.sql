-- Add provisional status to inscriptions table
ALTER TABLE public.inscriptions ADD COLUMN statut TEXT DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'provisoire', 'confirme', 'refuse'));

-- Update existing records
UPDATE public.inscriptions SET statut = CASE 
  WHEN confirme = true THEN 'confirme'
  ELSE 'en_attente'
END;