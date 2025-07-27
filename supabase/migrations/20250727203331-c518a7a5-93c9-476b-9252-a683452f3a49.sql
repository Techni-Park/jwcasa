-- Create enum types
CREATE TYPE public.activite_type AS ENUM ('predication', 'etude_biblique', 'visite_retour', 'autre');
CREATE TYPE public.status_type AS ENUM ('actif', 'inactif', 'temporaire');
CREATE TYPE public.role_type AS ENUM ('admin', 'responsable', 'proclamateur');

-- Create profiles table for user management
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  telephone TEXT,
  role role_type NOT NULL DEFAULT 'proclamateur',
  status status_type NOT NULL DEFAULT 'actif',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create proclamateurs table
CREATE TABLE public.proclamateurs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  baptise BOOLEAN DEFAULT false,
  ancien BOOLEAN DEFAULT false,
  assistant_ministeriel BOOLEAN DEFAULT false,
  pionnier BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create type_activite table
CREATE TABLE public.type_activite (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL UNIQUE,
  description TEXT,
  duree_minutes INTEGER DEFAULT 60,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create creneaux table
CREATE TABLE public.creneaux (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date_creneau DATE NOT NULL,
  heure_debut TIME NOT NULL,
  heure_fin TIME NOT NULL,
  type_activite_id UUID NOT NULL REFERENCES public.type_activite(id),
  max_participants INTEGER DEFAULT 2,
  responsable_id UUID REFERENCES public.profiles(id),
  notes TEXT,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create inscriptions table
CREATE TABLE public.inscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creneau_id UUID NOT NULL REFERENCES public.creneaux(id) ON DELETE CASCADE,
  proclamateur_id UUID NOT NULL REFERENCES public.proclamateurs(id) ON DELETE CASCADE,
  date_inscription TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  confirme BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(creneau_id, proclamateur_id)
);

-- Create rapports table
CREATE TABLE public.rapports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proclamateur_id UUID NOT NULL REFERENCES public.proclamateurs(id) ON DELETE CASCADE,
  mois INTEGER NOT NULL CHECK (mois >= 1 AND mois <= 12),
  annee INTEGER NOT NULL,
  heures_predication INTEGER DEFAULT 0,
  placements INTEGER DEFAULT 0,
  videos INTEGER DEFAULT 0,
  etudes_bibliques INTEGER DEFAULT 0,
  notes TEXT,
  soumis_le TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(proclamateur_id, mois, annee)
);

-- Create parametrages table
CREATE TABLE public.parametrages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cle TEXT NOT NULL UNIQUE,
  valeur TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proclamateurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.type_activite ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creneaux ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rapports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parametrages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create RLS policies for proclamateurs
CREATE POLICY "Users can view their own proclamateur data" ON public.proclamateurs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = proclamateurs.profile_id AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all proclamateurs" ON public.proclamateurs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create RLS policies for type_activite (readable by all authenticated users)
CREATE POLICY "Authenticated users can view activity types" ON public.type_activite
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage activity types" ON public.type_activite
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create RLS policies for creneaux
CREATE POLICY "Authenticated users can view active slots" ON public.creneaux
  FOR SELECT TO authenticated USING (actif = true);

CREATE POLICY "Admins can manage all slots" ON public.creneaux
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create RLS policies for inscriptions
CREATE POLICY "Users can view their own inscriptions" ON public.inscriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.proclamateurs p
      JOIN public.profiles pr ON p.profile_id = pr.id
      WHERE p.id = inscriptions.proclamateur_id AND pr.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own inscriptions" ON public.inscriptions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.proclamateurs p
      JOIN public.profiles pr ON p.profile_id = pr.id
      WHERE p.id = proclamateur_id AND pr.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all inscriptions" ON public.inscriptions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create RLS policies for rapports
CREATE POLICY "Users can view their own reports" ON public.rapports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.proclamateurs p
      JOIN public.profiles pr ON p.profile_id = pr.id
      WHERE p.id = rapports.proclamateur_id AND pr.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own reports" ON public.rapports
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.proclamateurs p
      JOIN public.profiles pr ON p.profile_id = pr.id
      WHERE p.id = rapports.proclamateur_id AND pr.user_id = auth.uid()
    )
  );

-- Create RLS policies for parametrages (admin only)
CREATE POLICY "Admins can manage settings" ON public.parametrages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_proclamateurs_updated_at
  BEFORE UPDATE ON public.proclamateurs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_creneaux_updated_at
  BEFORE UPDATE ON public.creneaux
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rapports_updated_at
  BEFORE UPDATE ON public.rapports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_parametrages_updated_at
  BEFORE UPDATE ON public.parametrages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nom, prenom, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nom', 'Nom'),
    COALESCE(NEW.raw_user_meta_data ->> 'prenom', 'Prénom'),
    'proclamateur'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert default activity types
INSERT INTO public.type_activite (nom, description, duree_minutes) VALUES
  ('Prédication', 'Activité de prédication publique', 120),
  ('Étude biblique', 'Conduite d''étude biblique', 60),
  ('Visite de retour', 'Visite de personnes intéressées', 90),
  ('Témoignage informel', 'Témoignage occasionnel', 30);

-- Insert default settings
INSERT INTO public.parametrages (cle, valeur, description) VALUES
  ('max_inscriptions_par_creneau', '2', 'Nombre maximum d''inscriptions par créneau'),
  ('delai_inscription_heures', '24', 'Délai minimum en heures avant le créneau pour s''inscrire'),
  ('notification_rappel', 'true', 'Activer les notifications de rappel'),
  ('heure_debut_default', '09:00', 'Heure de début par défaut pour les créneaux'),
  ('heure_fin_default', '11:00', 'Heure de fin par défaut pour les créneaux');