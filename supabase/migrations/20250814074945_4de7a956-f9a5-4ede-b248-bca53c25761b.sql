-- Créer la table pour les affiches
CREATE TABLE public.affiches (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom text NOT NULL,
  description text,
  url_image text,
  actif boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Activer RLS sur la table affiches
ALTER TABLE public.affiches ENABLE ROW LEVEL SECURITY;

-- Politique pour que les utilisateurs authentifiés puissent voir les affiches
CREATE POLICY "Authenticated users can view affiches" 
ON public.affiches 
FOR SELECT 
TO authenticated
USING (actif = true);

-- Politique pour que les admins puissent gérer les affiches
CREATE POLICY "Admins can manage affiches" 
ON public.affiches 
FOR ALL 
TO authenticated
USING (get_current_user_role() = 'admin');

-- Ajouter les colonnes manquantes à la table creneaux
ALTER TABLE public.creneaux 
ADD COLUMN min_participants integer DEFAULT 1,
ADD COLUMN nombre_presentoirs_recommandes integer DEFAULT 0,
ADD COLUMN affiche_id uuid REFERENCES public.affiches(id);

-- Créer le trigger pour updated_at sur affiches
CREATE TRIGGER update_affiches_updated_at
    BEFORE UPDATE ON public.affiches
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();