import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatTime } from '@/lib/timeUtils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameMonth, startOfWeek, eachWeekOfInterval, addDays, getWeek, isWithinInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables } from '@/integrations/supabase/types';

type Creneau = Tables<'creneaux'> & {
  type_activite: Tables<'type_activite'>;
  inscriptions_count: number;
};

type Inscription = Tables<'inscriptions'> & {
  creneaux: Tables<'creneaux'>;
  proclamateurs?: Tables<'proclamateurs'> & {
    profiles?: Tables<'profiles'>;
  };
};

type Proclamateur = Tables<'proclamateurs'>;
type TypeActivite = Tables<'type_activite'>;

type CreneauDetaille = Tables<'creneaux'> & {
  type_activite: Tables<'type_activite'>;
  inscriptions: (Tables<'inscriptions'> & {
    proclamateurs: Tables<'proclamateurs'> & {
      profiles: Tables<'profiles'>;
    };
  })[];
};

interface PlanningMensuelProps {
  selectedMonth: string;
  onMonthChange?: (month: string) => void;
}

const PlanningMensuel = ({ selectedMonth, onMonthChange }: PlanningMensuelProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [creneaux, setCreneaux] = useState<Creneau[]>([]);
  const [inscriptions, setInscriptions] = useState<Inscription[]>([]);
  const [proclamateurData, setProclamateurData] = useState<Proclamateur | null>(null);
  const [typesActivite, setTypesActivite] = useState<TypeActivite[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<string>('all');
  const [currentMonth, setCurrentMonth] = useState(selectedMonth);
  const [loading, setLoading] = useState(true);
  
  // États pour le modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCellData, setSelectedCellData] = useState<{
    weekStart: Date;
    weekEnd: Date;
    activite: TypeActivite;
    creneauxSemaine: CreneauDetaille[];
  } | null>(null);

  useEffect(() => {
    if (user) {
      loadProclamateurData();
    }
  }, [user]);

  useEffect(() => {
    loadTypesActivite();
    loadCreneaux();
  }, [currentMonth, selectedActivity]);

  useEffect(() => {
    setCurrentMonth(selectedMonth);
  }, [selectedMonth]);

  const loadProclamateurData = async () => {
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (profiles) {
        const { data: proclamateurs } = await supabase
          .from('proclamateurs')
          .select('*')
          .eq('profile_id', profiles.id)
          .single();

        setProclamateurData(proclamateurs);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données proclamateur:', error);
    }
  };

  const loadCreneauDetails = async (date: string, typeActiviteId: string): Promise<CreneauDetaille | null> => {
    try {
      const { data, error } = await supabase
        .from('creneaux')
        .select(`
          *,
          type_activite(nom),
          inscriptions(
            *,
            proclamateurs(
              *,
              profiles(nom, prenom)
            )
          )
        `)
        .eq('date_creneau', date)
        .eq('type_activite_id', typeActiviteId)
        .eq('actif', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Pas de créneau trouvé pour cette date/activité
          return null;
        }
        throw error;
      }
      
      return data as CreneauDetaille;
    } catch (error) {
      console.error('Erreur lors du chargement des détails du créneau:', error);
      return null;
    }
  };

  const loadTypesActivite = async () => {
    try {
      const { data, error } = await supabase
        .from('type_activite')
        .select('*')
        .eq('actif', true)
        .order('nom');

      if (error) throw error;
      setTypesActivite(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des types d\'activité:', error);
    }
  };

  const loadCreneaux = async () => {
    try {
      setLoading(true);
      const monthStart = startOfMonth(new Date(currentMonth + '-01'));
      const monthEnd = endOfMonth(monthStart);

      let query = supabase
        .from('creneaux')
        .select(`
          *,
          type_activite(nom)
        `)
        .gte('date_creneau', format(monthStart, 'yyyy-MM-dd'))
        .lte('date_creneau', format(monthEnd, 'yyyy-MM-dd'))
        .eq('actif', true);

      if (selectedActivity && selectedActivity !== 'all') {
        query = query.eq('type_activite_id', selectedActivity);
      }

      const { data, error } = await query
        .order('date_creneau')
        .order('heure_debut');

      if (error) throw error;
      setCreneaux(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des créneaux:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMonthOptions = () => {
    const months = [];
    const currentDate = new Date();
    
    for (let i = -1; i <= 11; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
      months.push({
        value: format(date, 'yyyy-MM'),
        label: format(date, 'MMMM yyyy', { locale: fr })
      });
    }
    
    return months;
  };

  // Nouvelles fonctions pour la vue tableau
  const getWeekRanges = () => {
    const monthStart = startOfMonth(new Date(currentMonth + '-01'));
    const monthEnd = endOfMonth(monthStart);
    const weeks = eachWeekOfInterval(
      { start: monthStart, end: monthEnd },
      { weekStartsOn: 1 }
    );

    return weeks.map(weekStart => {
      const weekEnd = addDays(weekStart, 6);
      return {
        weekStart,
        weekEnd: weekEnd > monthEnd ? monthEnd : weekEnd
      };
    });
  };

  const getCreneauxForWeekAndActivity = (weekStart: Date, weekEnd: Date, typeActiviteId: string) => {
    const weekStartStr = format(weekStart, 'yyyy-MM-dd');
    const weekEndStr = format(weekEnd, 'yyyy-MM-dd');
    
    return creneaux.filter(c => 
      c.date_creneau >= weekStartStr && 
      c.date_creneau <= weekEndStr &&
      c.type_activite_id === typeActiviteId
    );
  };

  const loadCreneauxSemaineDetails = async (weekStart: Date, weekEnd: Date, typeActiviteId: string): Promise<CreneauDetaille[]> => {
    try {
      const weekStartStr = format(weekStart, 'yyyy-MM-dd');
      const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('creneaux')
        .select(`
          *,
          type_activite(nom),
          inscriptions(
            *,
            proclamateurs(
              *,
              profiles(nom, prenom)
            )
          )
        `)
        .gte('date_creneau', weekStartStr)
        .lte('date_creneau', weekEndStr)
        .eq('type_activite_id', typeActiviteId)
        .eq('actif', true)
        .order('date_creneau')
        .order('heure_debut');

      if (error) throw error;
      return (data || []) as CreneauDetaille[];
    } catch (error) {
      console.error('Erreur lors du chargement des détails de la semaine:', error);
      return [];
    }
  };

  const handleCellClick = async (weekStart: Date, weekEnd: Date, activite: TypeActivite) => {
    const creneauxSemaine = await loadCreneauxSemaineDetails(weekStart, weekEnd, activite.id);
    
    setSelectedCellData({
      weekStart,
      weekEnd,
      activite,
      creneauxSemaine
    });
    setModalOpen(true);
  };

  const handleDeleteInscription = async (inscriptionId: string) => {
    if (!proclamateurData) return;

    try {
      const { error } = await supabase
        .from('inscriptions')
        .delete()
        .eq('id', inscriptionId)
        .eq('proclamateur_id', proclamateurData.id); // Sécurité : s'assurer que c'est bien son inscription

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Votre inscription a été supprimée",
      });

      // Recharger les détails
      if (selectedCellData) {
        const updatedDetails = await loadCreneauxSemaineDetails(selectedCellData.weekStart, selectedCellData.weekEnd, selectedCellData.activite.id);
        setSelectedCellData({
          ...selectedCellData,
          creneauxSemaine: updatedDetails
        });
      }

      // Recharger les créneaux
      loadCreneaux();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'inscription",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <Card className="gradient-card shadow-soft border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📅 Planning mensuel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const weekRanges = getWeekRanges();
  const activitesToShow = selectedActivity === 'all' ? typesActivite : typesActivite.filter(a => a.id === selectedActivity);

  return (
    <Card className="gradient-card shadow-soft border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📅 Planning mensuel
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Sélecteurs */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="min-w-0 flex-1">
            <Select value={currentMonth} onValueChange={(value) => {
              setCurrentMonth(value);
              onMonthChange?.(value);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un mois" />
              </SelectTrigger>
              <SelectContent>
                {getMonthOptions().map(month => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0 flex-1">
            <Select value={selectedActivity} onValueChange={setSelectedActivity}>
              <SelectTrigger>
                <SelectValue placeholder="Toutes les activités" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les activités</SelectItem>
                {typesActivite.map(type => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tableau planning - activités en lignes, semaines en colonnes */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border border-border p-2 text-left font-medium">Activité</th>
                {weekRanges.map((week, weekIndex) => (
                  <th key={weekIndex} className="border border-border p-2 text-center font-medium min-w-[150px]">
                    <div className="text-sm">Semaine {weekIndex + 1}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(week.weekStart, 'd')} - {format(week.weekEnd, 'd MMM', { locale: fr })}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activitesToShow.map((activite) => (
                <tr key={activite.id}>
                  <td className="border border-border p-2 font-medium bg-muted/50">
                    {activite.nom}
                  </td>
                  {weekRanges.map((week, weekIndex) => {
                    const creneauxSemaine = getCreneauxForWeekAndActivity(week.weekStart, week.weekEnd, activite.id);
                    
                    return (
                      <td key={weekIndex} className="border border-border p-2">
                        <button
                          onClick={() => handleCellClick(week.weekStart, week.weekEnd, activite)}
                          className="w-full min-h-[80px] p-2 text-left rounded transition-colors hover:bg-muted/50 border border-dashed border-muted-foreground/30"
                        >
                          {creneauxSemaine.length > 0 ? (
                            <div className="space-y-1">
                              {creneauxSemaine.slice(0, 3).map((creneau) => (
                                <div key={creneau.id} className="flex items-center gap-1 text-xs">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                                  <span className="truncate">
                                    {format(new Date(creneau.date_creneau), 'dd/MM')} {formatTime(creneau.heure_debut)}
                                  </span>
                                </div>
                              ))}
                              {creneauxSemaine.length > 3 && (
                                <div className="text-xs text-muted-foreground">
                                  +{creneauxSemaine.length - 3} autres...
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground text-center">
                              Aucun créneau
                            </div>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal des détails */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {selectedCellData?.activite.nom} - Semaine du {selectedCellData && format(selectedCellData.weekStart, 'd')} au {selectedCellData && format(selectedCellData.weekEnd, 'd MMMM yyyy', { locale: fr })}
              </DialogTitle>
            </DialogHeader>
            
            {selectedCellData && (
              <div className="space-y-4">
                {selectedCellData.creneauxSemaine.length > 0 ? (
                  selectedCellData.creneauxSemaine.map((creneau) => (
                    <div key={creneau.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-medium">
                            {format(new Date(creneau.date_creneau), 'EEEE d MMMM', { locale: fr })}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {formatTime(creneau.heure_debut)} - {formatTime(creneau.heure_fin)}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {creneau.inscriptions.length}/{creneau.max_participants} inscrits
                        </Badge>
                      </div>

                      {creneau.inscriptions.length > 0 && (
                        <div className="space-y-2">
                          {creneau.inscriptions.map((inscription) => (
                            <div key={inscription.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${
                                  inscription.confirme ? 'bg-green-500' : 'bg-yellow-500'
                                }`} />
                                <span className="text-sm">
                                  {inscription.proclamateurs.profiles.prenom} {inscription.proclamateurs.profiles.nom}
                                </span>
                                <Badge variant={inscription.confirme ? "default" : "secondary"} className="text-xs">
                                  {inscription.confirme ? "Confirmé" : "En attente"}
                                </Badge>
                              </div>
                              {proclamateurData && inscription.proclamateur_id === proclamateurData.id && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteInscription(inscription.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aucun créneau programmé pour cette semaine et cette activité.
                  </p>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default PlanningMensuel;