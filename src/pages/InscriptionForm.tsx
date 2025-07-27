import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const InscriptionForm = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [proclamateurData, setProclamateurData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [creneaux, setCreneaux] = useState<any[]>([]);
  const [typeActivites, setTypeActivites] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [formData, setFormData] = useState({
    date: '',
    creneau_id: '',
    type_activite_id: '',
    notes: ''
  });

  useEffect(() => {
    if (user) {
      loadUserData();
      loadTypeActivites();
    }
  }, [user]);

  useEffect(() => {
    if (formData.date && formData.type_activite_id) {
      loadCreneauxForDate();
    }
  }, [formData.date, formData.type_activite_id]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // Récupérer le profil utilisateur
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (profileError) throw profileError;
      setUserProfile(profile);

      // Récupérer les données proclamateur
      const { data: proclamateur, error: proclamateurError } = await supabase
        .from('proclamateurs')
        .select('*')
        .eq('profile_id', profile.id)
        .single();

      if (proclamateurError) throw proclamateurError;
      setProclamateurData(proclamateur);
      
    } catch (error) {
      console.error('Erreur lors du chargement des données utilisateur:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger vos données",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTypeActivites = async () => {
    try {
      console.log('Chargement des types d\'activité...');
      const { data, error } = await supabase
        .from('type_activite')
        .select('*')
        .eq('actif', true)
        .order('nom');

      console.log('Types d\'activité récupérés:', data);
      if (error) {
        console.error('Erreur lors du chargement des types d\'activité:', error);
        throw error;
      }
      setTypeActivites(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des types d\'activité:', error);
    }
  };

  const loadCreneauxForDate = async () => {
    try {
      const { data, error } = await supabase
        .from('creneaux')
        .select(`
          *,
          inscriptions(id, proclamateur_id)
        `)
        .eq('date_creneau', formData.date)
        .eq('type_activite_id', formData.type_activite_id)
        .eq('actif', true)
        .order('heure_debut');

      if (error) throw error;
      
      // Calculer les places disponibles
      const creneauxAvecPlaces = data?.map(creneau => ({
        ...creneau,
        inscriptions_count: creneau.inscriptions?.length || 0,
        places_disponibles: creneau.max_participants - (creneau.inscriptions?.length || 0)
      })) || [];

      setCreneaux(creneauxAvecPlaces);
    } catch (error) {
      console.error('Erreur lors du chargement des créneaux:', error);
    }
  };


  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const isSunday = date.getDay() === 0;
      if (isSunday) {
        setSelectedDate(date);
        const dateString = date.toISOString().split('T')[0];
        handleInputChange('date', dateString);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.date || !formData.creneau_id || !formData.type_activite_id || !proclamateurData) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);

      // Vérifier les contraintes avant insertion
      const currentMonth = new Date(formData.date).getMonth() + 1;
      const currentYear = new Date(formData.date).getFullYear();

      // Vérifier le nombre d'inscriptions du mois
      const { data: inscriptionsMonth, error: monthError } = await supabase
        .from('inscriptions')
        .select('id')
        .eq('proclamateur_id', proclamateurData.id)
        .gte('date_inscription', `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`)
        .lt('date_inscription', `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-01`);

      if (monthError) throw monthError;

      if (inscriptionsMonth && inscriptionsMonth.length >= 2) {
        toast({
          title: "Erreur",
          description: "Vous êtes déjà inscrit 2 fois ce mois",
          variant: "destructive"
        });
        return;
      }

      // Vérifier la disponibilité du créneau
      const selectedCreneau = creneaux.find(c => c.id === formData.creneau_id);
      if (selectedCreneau && selectedCreneau.places_disponibles <= 0) {
        toast({
          title: "Erreur",
          description: "Ce créneau est complet",
          variant: "destructive"
        });
        return;
      }

      // Créer l'inscription
      const { error: insertError } = await supabase
        .from('inscriptions')
        .insert({
          proclamateur_id: proclamateurData.id,
          creneau_id: formData.creneau_id,
          notes: formData.notes,
          confirme: false
        });

      if (insertError) throw insertError;

      toast({
        title: "Succès",
        description: "Inscription enregistrée. En attente de validation.",
      });

      // Réinitialiser le formulaire
      setFormData({
        date: '',
        creneau_id: '',
        type_activite_id: '',
        notes: ''
      });
      setSelectedDate(undefined);
      setCreneaux([]);
      
    } catch (error) {
      console.error('Erreur lors de l\'inscription:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer l'inscription",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout title="Inscription aux créneaux">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Inscription aux créneaux">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Règles importantes en premier */}
        <Card className="gradient-card shadow-soft border-border/50 border-l-4 border-l-info">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <span className="text-xl">📋</span>
              Règles importantes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• Maximum 2 inscriptions par mois</li>
              <li>• Pas deux fois le même créneau dans le mois</li>
              <li>• Diffusion: 2-3 personnes dont au moins 1 homme</li>
              <li>• Installation: 2 personnes maximum</li>
              <li>• Validation requise par l'administrateur</li>
              <li>• Seulement les dimanches</li>
            </ul>
          </CardContent>
        </Card>

        {/* Interface unifiée pour inscription */}
        <Card className="gradient-card shadow-soft border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <span className="text-xl">📋</span>
              S'inscrire à un créneau
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Type d'activité */}
            <div>
              <Label htmlFor="type_activite">Type d'activité *</Label>
              <Select value={formData.type_activite_id} onValueChange={(value) => handleInputChange('type_activite_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un type d'activité" />
                </SelectTrigger>
                <SelectContent>
                  {typeActivites.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.nom}
                      {type.description && (
                        <span className="text-muted-foreground ml-2">- {type.description}</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.type_activite_id && (
              <>
                {/* Calendrier pour sélectionner la date */}
                <div>
                  <Label htmlFor="date">Sélectionner une date (dimanche uniquement) *</Label>
                  <div className="mt-2 border rounded-md bg-background">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDateSelect}
                      disabled={(date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        return date < today || date.getDay() !== 0; // Seulement les dimanches dans le futur
                      }}
                      weekStartsOn={1} // Lundi
                      className="p-3"
                      locale={fr}
                    />
                  </div>
                </div>
                
                {/* Créneaux disponibles pour la date sélectionnée */}
                {formData.date && (
                  <div>
                    <Label htmlFor="creneau">Créneau horaire disponible *</Label>
                    <Select value={formData.creneau_id} onValueChange={(value) => handleInputChange('creneau_id', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un créneau" />
                      </SelectTrigger>
                      <SelectContent>
                        {creneaux.length > 0 ? (
                          creneaux.map((creneau) => (
                            <SelectItem 
                              key={creneau.id} 
                              value={creneau.id}
                              disabled={creneau.places_disponibles <= 0}
                            >
                              <div className="flex justify-between items-center w-full">
                                <span>
                                  {creneau.heure_debut} - {creneau.heure_fin}
                                </span>
                                <span className="text-sm text-muted-foreground ml-4">
                                  {creneau.places_disponibles > 0 
                                    ? `${creneau.places_disponibles}/${creneau.max_participants} places`
                                    : 'Complet'
                                  }
                                </span>
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-slots" disabled>
                            Aucun créneau disponible
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {/* Notes optionnelles */}
                {formData.creneau_id && (
                  <div>
                    <Label htmlFor="notes">Notes (optionnel)</Label>
                    <Input
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      placeholder="Remarques particulières..."
                    />
                  </div>
                )}

                {/* Bouton d'inscription */}
                {formData.creneau_id && (
                  <div className="flex justify-end">
                    <Button type="submit" disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      S'inscrire
                    </Button>
                  </div>
                )}
              </>
            )}

            {!formData.type_activite_id && (
              <p className="text-muted-foreground text-center py-8">
                Veuillez sélectionner un type d'activité pour voir les créneaux disponibles
              </p>
            )}
          </CardContent>
        </Card>

        {/* Bouton retour */}
        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={() => window.history.back()}>
            Retour
          </Button>
        </div>
      </form>
    </Layout>
  );
};

export default InscriptionForm;