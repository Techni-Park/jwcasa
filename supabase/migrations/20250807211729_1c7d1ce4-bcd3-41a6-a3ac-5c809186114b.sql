-- Add creneau_id column to rapports table
ALTER TABLE public.rapports ADD COLUMN creneau_id uuid;

-- Add foreign key constraint (optional but recommended)
ALTER TABLE public.rapports ADD CONSTRAINT fk_rapports_creneau 
  FOREIGN KEY (creneau_id) REFERENCES public.creneaux(id) ON DELETE SET NULL;