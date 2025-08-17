import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { ChevronDown, ChevronRight, Crown, Loader2, User, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import type { Tables } from '@/integrations/supabase/types';

type InscriptionAvecCreneau = Tables<'inscriptions'> & {
  creneaux: Tables<'creneaux'> & {
    type_activite: Tables<'type_activite'>;
  };
};

type CreneauDisponible = Tables<'creneaux'> & {
  type_activite: Tables<'type_activite'>;
  inscriptions_count: number;
  user_inscriptions: Tables<'inscriptions'>[];
};

type Profile = Tables<'profiles'>;
type Proclamateur = Tables<'proclamateurs'>;

const MesInscriptions = ({ proclamateurId }: { proclamateurId: string }) => {
  const [inscriptionsEnAttente, setInscriptionsEnAttente] = useState<InscriptionAvecCreneau[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInscriptionsEnAttente();
  }, [proclamateurId]);

  const loadInscriptionsEnAttente = async () => {
    try {
      const { data, error } = await supabase
        .from('inscriptions')
        .select(`
          *,
          creneaux(
            date_creneau,
            heure_debut,
            heure_fin,
            type_activite(nom)
          )
        `)
        .eq('proclamateur_id', proclamateurId)
        .eq('confirme', false)
        .order('date_inscription', { ascending: false });

      if (error) throw error;
      setInscriptionsEnAttente(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des inscriptions en attente:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-4"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (inscriptionsEnAttente.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <p>Aucune inscription en attente</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {inscriptionsEnAttente.map((inscription) => (
        <div
          key={inscription.id}
          className="p-3 border rounded-lg bg-yellow-50 border-yellow-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-foreground">
                {inscription.creneaux?.type_activite?.nom}
              </div>
              <div className="text-sm text-muted-foreground">
                {format(new Date(inscription.creneaux?.date_creneau), 'EEEE d MMMM yyyy', { locale: fr })}
                {' • '}
                {inscription.creneaux?.heure_debut} - {inscription.creneaux?.heure_fin}
              </div>
              {inscription.notes && (
                <div className="text-sm text-muted-foreground mt-1">
                  Notes: {inscription.notes}
                </div>
              )}
            </div>
            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
              En attente
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
};

const InscriptionForm = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [proclamateurData, setProclamateurData] = useState<Proclamateur | null>(null);
  const [loading, setLoading] = useState(true);
  const [creneaux, setCreneaux] = useState<CreneauDisponible[]>([]);
  const [typeActivites, setTypeActivites] = useState<Tables<'type_activite'>[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [formData, setFormData] = useState({
    date: '',
    creneau_id: '',
    type_activite_id: '',
    notes: ''
  });
  const [expandedCreneaux, setExpandedCreneaux] = useState<Set<string>>(new Set());
  const [inscriptions, setInscriptions] = useState<InscriptionAvecCreneau[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedCreneauForInscription, setSelectedCreneauForInscription] = useState<CreneauDisponible | null>(null);
  const [violatedRules, setViolatedRules] = useState<string[]>([]);

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
        .maybeSingle();

      if (profileError) throw profileError;
      
      if (!profile) {
        toast({
          title: "Erreur",
          description: "Profil utilisateur non trouvé",
          variant: "destructive"
        });
        return;
      }
      
      setUserProfile(profile);

      // Récupérer les données proclamateur
      const { data: proclamateurData, error: proclamateurError } = await supabase
        .from('proclamateurs')
        .select('*')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (proclamateurError) throw proclamateurError;
      
      let proclamateur = proclamateurData;
      
      // Si pas de données proclamateur, les créer automatiquement
      if (!proclamateur) {
        const { data: newProclamateur, error: createError } = await supabase
          .from('proclamateurs')
          .insert({
            profile_id: profile.id,
            frère: false,
            ancien: false,
            assistant_ministeriel: false,
            pionnier: false,
            notes: ''
          })
          .select()
          .single();

        if (createError) {
          console.error('Erreur lors de la création des données proclamateur:', createError);
          toast({
            title: "Erreur",
            description: "Impossible de créer vos données proclamateur. Contactez l'administrateur.",
            variant: "destructive"
          });
          return;
        }

        proclamateur = newProclamateur;
      }
      
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
      console.log('🔍 Chargement des créneaux pour:', {
        date: formData.date,
        type_activite_id: formData.type_activite_id
      });

      const { data, error } = await supabase
        .from('creneaux')
        .select(`
          *,
          inscriptions(
            id, 
            proclamateur_id, 
            confirme,
            proclamateurs(
              profile_id,
              profiles(nom, prenom)
            )
          )
        `)
        .eq('date_creneau', formData.date)
        .eq('type_activite_id', formData.type_activite_id)
        .eq('actif', true)
        .order('heure_debut');

      console.log('📊 Résultat de la requête créneaux:', { 
        data, 
        error, 
        count: data?.length || 0,
        query: {
          date_creneau: formData.date,
          type_activite_id: formData.type_activite_id,
          actif: true
        }
      });

      if (error) throw error;
      
      // Calculer les places disponibles
      const creneauxAvecPlaces = data?.map(creneau => ({
        ...creneau,
        inscriptions_count: creneau.inscriptions?.length || 0,
        places_disponibles: creneau.max_participants - (creneau.inscriptions?.length || 0)
      })) || [];

      console.log('✅ Créneaux avec places calculées:', creneauxAvecPlaces);

      setCreneaux(creneauxAvecPlaces);
      setInscriptions(data?.flatMap(c => c.inscriptions || []) || []);
    } catch (error) {
      console.error('❌ Erreur lors du chargement des créneaux:', error);
    }
  };

  const checkInscriptionRules = async (creneauId: string) => {
    if (!proclamateurData) return [];
    
    const violations: string[] = [];
    const currentMonth = new Date(formData.date).getMonth() + 1;
    const currentYear = new Date(formData.date).getFullYear();

    try {
      // Vérifier le nombre d'inscriptions du mois
      const { data: inscriptionsMonth } = await supabase
        .from('inscriptions')
        .select('id, creneau_id, creneaux(type_activite_id)')
        .eq('proclamateur_id', proclamateurData.id)
        .gte('date_inscription', `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`)
        .lt('date_inscription', `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-01`);

      if (inscriptionsMonth && inscriptionsMonth.length >= 2) {
        violations.push("Maximum 2 inscriptions par mois déjà atteint");
      }

      // Vérifier si déjà inscrit au même créneau dans le mois
      const sameSlotThisMonth = inscriptionsMonth?.some(inscription => 
        inscription.creneau_id === creneauId
      );
      
      if (sameSlotThisMonth) {
        violations.push("Déjà inscrit à ce créneau ce mois-ci");
      }

    } catch (error) {
      console.error('Erreur lors de la vérification des règles:', error);
    }

    return violations;
  };

  const toggleCreneauExpansion = (creneauId: string) => {
    const newExpanded = new Set(expandedCreneaux);
    if (newExpanded.has(creneauId)) {
      newExpanded.delete(creneauId);
    } else {
      newExpanded.add(creneauId);
    }
    setExpandedCreneaux(newExpanded);
  };

  const handleSlotClick = async (creneau: CreneauDisponible) => {
    if (creneau.places_disponibles <= 0) return;
    
    const violations = await checkInscriptionRules(creneau.id);
    setViolatedRules(violations);
    setSelectedCreneauForInscription(creneau);
    setShowConfirmDialog(true);
  };

  const confirmInscription = async () => {
    if (!selectedCreneauForInscription || !proclamateurData) return;

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('inscriptions')
        .insert({
          proclamateur_id: proclamateurData.id,
          creneau_id: selectedCreneauForInscription.id,
          notes: formData.notes,
          confirme: false
        });

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Inscription enregistrée. En attente de validation.",
      });

      // Recharger les créneaux
      await loadCreneauxForDate();
      
    } catch (error) {
      console.error('Erreur lors de l\'inscription:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer l'inscription",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setShowConfirmDialog(false);
      setSelectedCreneauForInscription(null);
      setViolatedRules([]);
    }
  };


  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      const dateString = date.toISOString().split('T')[0];
      handleInputChange('date', dateString);
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
      <div className="space-y-6">
        {/* Règles importantes */}
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

        {/* Type d'activité */}
        <Card className="gradient-card shadow-soft border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <span className="text-xl">🎯</span>
              Type d'activité
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Label htmlFor="type_activite">Sélectionner un type d'activité *</Label>
            <Select value={formData.type_activite_id} onValueChange={(value) => handleInputChange('type_activite_id', value)}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Choisir un type d'activité" />
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
          </CardContent>
        </Card>

        {/* Calendrier et créneaux côte à côte */}
        {formData.type_activite_id && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Calendrier */}
            <Card className="gradient-card shadow-soft border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <span className="text-xl">📅</span>
                  Sélectionner une date
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md bg-background">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    disabled={(date) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return date < today; // Toutes les dates dans le futur
                    }}
                    weekStartsOn={1} // Lundi
                    className="p-3"
                    locale={fr}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Créneaux disponibles */}
            <Card className="gradient-card shadow-soft border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <span className="text-xl">⏰</span>
                  Créneaux disponibles
                  {selectedDate && (
                    <span className="text-sm font-normal text-muted-foreground">
                      - {format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {formData.date ? (
                  <div className="space-y-3">
                    {creneaux.length > 0 ? (
                      creneaux.map((creneau) => (
                        <Collapsible
                          key={creneau.id}
                          open={expandedCreneaux.has(creneau.id)}
                          onOpenChange={() => toggleCreneauExpansion(creneau.id)}
                        >
                          <div className="border rounded-lg p-4 space-y-3">
                            {/* En-tête du créneau */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <CollapsibleTrigger asChild>
                                  <Button variant="ghost" size="sm" className="p-0">
                                    {expandedCreneaux.has(creneau.id) ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                  </Button>
                                </CollapsibleTrigger>
                                <div>
                                  <div className="font-medium">
                                    {creneau.heure_debut} - {creneau.heure_fin}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {creneau.inscriptions_count}/{creneau.max_participants} inscrits
                                  </div>
                                </div>
                              </div>
                              <Badge variant={creneau.places_disponibles > 0 ? "default" : "secondary"}>
                                {creneau.places_disponibles > 0 
                                  ? `${creneau.places_disponibles} places`
                                  : 'Complet'
                                }
                              </Badge>
                            </div>

                            {/* Places occupées et libres */}
                            <div className="grid grid-cols-2 gap-2">
                              {/* Places occupées */}
                              {creneau.inscriptions?.map((inscription: Tables<'inscriptions'>, index: number) => (
                                <div
                                  key={inscription.id}
                                  className={cn(
                                    "flex items-center gap-2 p-2 rounded border",
                                    inscription.confirme 
                                      ? "bg-green-50 border-green-200" 
                                      : "bg-yellow-50 border-yellow-200"
                                  )}
                                >
                                  <User className="h-4 w-4" />
                                  <span className="text-sm truncate">
                                    {inscription.proclamateurs?.profiles?.prenom} {inscription.proclamateurs?.profiles?.nom}
                                  </span>
                                  {inscription.confirme && (
                                    <Badge variant="outline" className="text-xs">Validé</Badge>
                                  )}
                                </div>
                              ))}

                              {/* Places libres */}
                              {Array.from({ length: creneau.places_disponibles }).map((_, index) => (
                                <button
                                  key={`libre-${index}`}
                                  onClick={() => handleSlotClick(creneau)}
                                  className="flex items-center justify-center gap-2 p-2 rounded border border-dashed border-muted-foreground/30 hover:border-primary hover:bg-primary/5 transition-colors"
                                  disabled={loading}
                                >
                                  <Plus className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm text-muted-foreground">
                                    Place libre
                                  </span>
                                </button>
                              ))}
                            </div>

                            {/* Détails étendus */}
                            <CollapsibleContent className="space-y-2">
                              {creneau.notes && (
                                <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                                  <strong>Notes:</strong> {creneau.notes}
                                </div>
                              )}
                              {creneau.responsable_id && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Crown className="h-4 w-4 text-yellow-500" />
                                  <span>Responsable assigné</span>
                                </div>
                              )}
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>Aucun créneau disponible pour cette date</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Sélectionnez une date pour voir les créneaux disponibles</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {!formData.type_activite_id && (
          <Card className="gradient-card shadow-soft border-border/50">
            <CardContent className="py-8">
              <p className="text-muted-foreground text-center">
                Veuillez sélectionner un type d'activité pour commencer
              </p>
            </CardContent>
          </Card>
        )}

        {/* Mes inscriptions en attente */}
        {proclamateurData && (
          <Card className="gradient-card shadow-soft border-border/50 border-l-4 border-l-warning">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <span className="text-xl">⏳</span>
                Mes inscriptions en attente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MesInscriptions proclamateurId={proclamateurData.id} />
            </CardContent>
          </Card>
        )}

        {/* Notes optionnelles */}
        {formData.date && (
          <Card className="gradient-card shadow-soft border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <span className="text-xl">📝</span>
                Notes (optionnel)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Remarques particulières pour vos inscriptions..."
              />
            </CardContent>
          </Card>
        )}

        {/* Bouton retour */}
        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={() => window.history.back()}>
            Retour
          </Button>
        </div>

        {/* Dialog de confirmation d'inscription */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer l'inscription</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  <p>
                    Voulez-vous vous inscrire au créneau du{' '}
                    <strong>
                      {selectedDate && format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
                    </strong>{' '}
                    de{' '}
                    <strong>
                      {selectedCreneauForInscription?.heure_debut} - {selectedCreneauForInscription?.heure_fin}
                    </strong>
                    ?
                  </p>
                  
                  {violatedRules.length > 0 && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded">
                      <p className="font-medium text-destructive mb-2">
                        ⚠️ Règles non respectées :
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-destructive">
                        {violatedRules.map((rule, index) => (
                          <li key={index}>{rule}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmInscription}
                disabled={violatedRules.length > 0 || loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmer l'inscription
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
};

export default InscriptionForm;