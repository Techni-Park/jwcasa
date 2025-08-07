import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CreneauInscrit {
  id: string;
  date_creneau: string;
  heure_debut: string;
  heure_fin: string;
  type_activite: {
    nom: string;
  };
  hasRapport: boolean;
}

const RapportForm = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [creneauxInscrits, setCreneauxInscrits] = useState<CreneauxInscrit[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [formData, setFormData] = useState({
    creneau_id: '',
    conversations: '',
    videos: '',
    revues: '',
    brochures: '',
    tracts: '',
    temoignages: '',
    commentaires: ''
  });

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // Charger le profil utilisateur
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (profileError) throw profileError;
      setUserProfile(profile);

      if (!profile) return;

      // Charger les proclamateurs associés à ce profil
      const { data: proclamateurs, error: proclamateursError } = await supabase
        .from('proclamateurs')
        .select('id')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (proclamateursError) throw proclamateursError;

      if (!proclamateurs) return;

      // Charger les créneaux où l'utilisateur est inscrit et confirmé
      const { data: inscriptions, error: inscriptionsError } = await supabase
        .from('inscriptions')
        .select(`
          creneau_id,
          creneaux (
            id,
            date_creneau,
            heure_debut,
            heure_fin,
            type_activite (
              nom
            )
          )
        `)
        .eq('proclamateur_id', proclamateurs.id)
        .eq('confirme', true);

      if (inscriptionsError) throw inscriptionsError;

      // Charger les rapports existants pour vérifier lesquels ont déjà un rapport
      const { data: rapports, error: rapportsError } = await supabase
        .from('rapports')
        .select('creneau_id')
        .eq('proclamateur_id', proclamateurs.id);

      if (rapportsError) throw rapportsError;

      const rapportCreneauIds = new Set(rapports?.map(r => r.creneau_id) || []);

      const creneauxAvecRapport = inscriptions?.map(inscription => ({
        id: inscription.creneaux.id,
        date_creneau: inscription.creneaux.date_creneau,
        heure_debut: inscription.creneaux.heure_debut,
        heure_fin: inscription.creneaux.heure_fin,
        type_activite: inscription.creneaux.type_activite,
        hasRapport: rapportCreneauIds.has(inscription.creneaux.id)
      })) || [];

      // Trier par date décroissante (plus récents en premier)
      creneauxAvecRapport.sort((a, b) => 
        new Date(b.date_creneau).getTime() - new Date(a.date_creneau).getTime()
      );

      setCreneauxInscrits(creneauxAvecRapport);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger vos créneaux",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation basique
    if (!formData.creneau_id) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un créneau",
        variant: "destructive"
      });
      return;
    }

    try {
      // Trouver le proclamateur ID
      const { data: proclamateurs, error: proclamateursError } = await supabase
        .from('proclamateurs')
        .select('id')
        .eq('profile_id', userProfile?.id)
        .maybeSingle();

      if (proclamateursError) throw proclamateursError;

      if (!proclamateurs) {
        toast({
          title: "Erreur",
          description: "Profil proclamateur non trouvé",
          variant: "destructive"
        });
        return;
      }

      // Sauvegarder le rapport
      const { error } = await supabase
        .from('rapports')
        .insert({
          proclamateur_id: proclamateurs.id,
          creneau_id: formData.creneau_id,
          heures_predication: parseInt(formData.conversations) || 0,
          placements: (parseInt(formData.revues) || 0) + 
                     (parseInt(formData.brochures) || 0) + 
                     (parseInt(formData.tracts) || 0),
          videos: parseInt(formData.videos) || 0,
          notes: `Témoignages: ${formData.temoignages}\n\nCommentaires: ${formData.commentaires}`
        });

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Rapport enregistré avec succès",
      });

      // Réinitialiser le formulaire et recharger les données
      setFormData({
        creneau_id: '',
        conversations: '',
        videos: '',
        revues: '',
        brochures: '',
        tracts: '',
        temoignages: '',
        commentaires: ''
      });
      
      loadUserData(); // Recharger pour mettre à jour les statuts des rapports
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer le rapport",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <Layout title="Nouveau rapport d'activité">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Chargement de vos créneaux...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Nouveau rapport d'activité">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Sélection du créneau */}
        <Card className="gradient-card shadow-soft border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <span className="text-xl">📋</span>
              Créneau d'activité
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="creneau_id">Sélectionner un créneau auquel vous êtes inscrit *</Label>
              <Select value={formData.creneau_id} onValueChange={(value) => handleInputChange('creneau_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un créneau confirmé" />
                </SelectTrigger>
                <SelectContent>
                  {creneauxInscrits.length === 0 ? (
                    <SelectItem value="" disabled>
                      Aucun créneau confirmé trouvé
                    </SelectItem>
                  ) : (
                    creneauxInscrits.map((creneau) => (
                      <SelectItem key={creneau.id} value={creneau.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>
                            {format(parseISO(creneau.date_creneau), 'dd/MM/yyyy', { locale: fr })} - {' '}
                            {creneau.heure_debut.slice(0, 5)} à {creneau.heure_fin.slice(0, 5)} - {' '}
                            {creneau.type_activite.nom}
                          </span>
                          {creneau.hasRapport && (
                            <Badge variant="secondary" className="ml-2">
                              Rapport existant
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {creneauxInscrits.length === 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  Vous devez d'abord vous inscrire à un créneau et avoir votre inscription confirmée pour pouvoir créer un rapport.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Layout en 2 colonnes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Colonne gauche - Statistiques d'activité */}
          <Card className="gradient-card shadow-soft border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <span className="text-xl">📊</span>
                Statistiques d'activité
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="conversations">Conversations</Label>
                  <Input
                    id="conversations"
                    type="number"
                    min="0"
                    value={formData.conversations}
                    onChange={(e) => handleInputChange('conversations', e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="videos">Vidéos montrées</Label>
                  <Input
                    id="videos"
                    type="number"
                    min="0"
                    value={formData.videos}
                    onChange={(e) => handleInputChange('videos', e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="revues">Revues</Label>
                  <Input
                    id="revues"
                    type="number"
                    min="0"
                    value={formData.revues}
                    onChange={(e) => handleInputChange('revues', e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="brochures">Brochures</Label>
                  <Input
                    id="brochures"
                    type="number"
                    min="0"
                    value={formData.brochures}
                    onChange={(e) => handleInputChange('brochures', e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="tracts">Tracts</Label>
                  <Input
                    id="tracts"
                    type="number"
                    min="0"
                    value={formData.tracts}
                    onChange={(e) => handleInputChange('tracts', e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Colonne droite - Témoignages et commentaires */}
          <Card className="gradient-card shadow-soft border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <span className="text-xl">💭</span>
                Témoignages et commentaires
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="temoignages">Témoignages</Label>
                <Textarea
                  id="temoignages"
                  value={formData.temoignages}
                  onChange={(e) => handleInputChange('temoignages', e.target.value)}
                  placeholder="Décrivez les témoignages reçus..."
                  rows={5}
                />
              </div>
              <div>
                <Label htmlFor="commentaires">Commentaires généraux</Label>
                <Textarea
                  id="commentaires"
                  value={formData.commentaires}
                  onChange={(e) => handleInputChange('commentaires', e.target.value)}
                  placeholder="Observations, remarques particulières..."
                  rows={5}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bouton de soumission */}
        <div className="flex gap-4">
          <Button 
            type="submit" 
            className="flex-1"
            disabled={!formData.creneau_id || creneauxInscrits.length === 0}
          >
            Enregistrer le rapport
          </Button>
          <Button type="button" variant="outline" onClick={() => window.history.back()}>
            Annuler
          </Button>
        </div>
      </form>
    </Layout>
  );
};

export default RapportForm;