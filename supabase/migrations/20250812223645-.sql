-- Ajouter support pour créneaux récurrents et valideurs
-- Ajouter colonnes à type_activite pour les créneaux récurrents
ALTER TABLE public.type_activite 
ADD COLUMN valideur_id UUID REFERENCES public.profiles(id),
ADD COLUMN recurrence_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN recurrence_days INTEGER[] DEFAULT '{}', -- 0=dimanche, 1=lundi, etc.
ADD COLUMN recurrence_weeks INTEGER[] DEFAULT '{}', -- semaines dans le mois (1,2,3,4)
ADD COLUMN default_heure_debut TIME,
ADD COLUMN default_heure_fin TIME,
ADD COLUMN auto_create_slots BOOLEAN DEFAULT FALSE;

-- Table pour stocker les créneaux récurrents générés automatiquement
CREATE TABLE public.creneaux_recurrents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type_activite_id UUID NOT NULL REFERENCES public.type_activite(id) ON DELETE CASCADE,
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  jours_semaine INTEGER[] NOT NULL, -- 0=dimanche, 1=lundi, etc.
  semaines_mois INTEGER[] NOT NULL, -- 1,2,3,4 pour première, deuxième, troisième, quatrième semaine
  heure_debut TIME NOT NULL,
  heure_fin TIME NOT NULL,
  actif BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Activer RLS sur la nouvelle table
ALTER TABLE public.creneaux_recurrents ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour creneaux_recurrents
CREATE POLICY "Admins can manage recurring slots"
ON public.creneaux_recurrents
FOR ALL
USING (get_current_user_role() = 'admin');

CREATE POLICY "Users can view recurring slots"
ON public.creneaux_recurrents
FOR SELECT
USING (actif = true);

-- Trigger pour mise à jour automatique de updated_at
CREATE TRIGGER update_creneaux_recurrents_updated_at
BEFORE UPDATE ON public.creneaux_recurrents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger pour mise à jour automatique de updated_at sur type_activite
CREATE TRIGGER update_type_activite_updated_at
BEFORE UPDATE ON public.type_activite
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();