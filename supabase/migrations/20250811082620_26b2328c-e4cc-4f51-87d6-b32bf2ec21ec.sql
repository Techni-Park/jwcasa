-- Add approval system for reports
ALTER TABLE public.rapports ADD COLUMN approuve BOOLEAN DEFAULT FALSE;
ALTER TABLE public.rapports ADD COLUMN visible_publiquement BOOLEAN DEFAULT FALSE;
ALTER TABLE public.rapports ADD COLUMN date_approbation TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.rapports ADD COLUMN approuve_par UUID REFERENCES public.profiles(id);

-- Update RLS policies for reports
DROP POLICY IF EXISTS "Users can view their own reports" ON public.rapports;
DROP POLICY IF EXISTS "Users can manage their own reports" ON public.rapports;

-- New policies for reports
CREATE POLICY "Users can manage their own reports" ON public.rapports
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM (proclamateurs p JOIN profiles pr ON (p.profile_id = pr.id))
    WHERE (p.id = rapports.proclamateur_id) AND (pr.user_id = auth.uid())
  )
);

CREATE POLICY "Users can view approved public reports" ON public.rapports
FOR SELECT USING (
  visible_publiquement = true AND approuve = true
);

CREATE POLICY "Admins can manage all reports" ON public.rapports
FOR ALL USING (get_current_user_role() = 'admin');