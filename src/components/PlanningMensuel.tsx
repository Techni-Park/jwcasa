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
  const [currentMonth, setCurrentMonth] = useState(selectedMonth);
  const [loading, setLoading] = useState(true);
  
  // États pour le modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCellData, setSelectedCellData] = useState<{
    date: string;
    activite: TypeActivite;
    creneauDetaille?: CreneauDetaille;
  } | null>(null);

  useEffect(() => {
    if (user) {
      loadProclamateurData();
    }
  }, [user]);

  useEffect(() => {
    loadTypesActivite();
    loadCreneaux();
  }, [currentMonth]);

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

      const { data, error } = await supabase
        .from('creneaux')
        .select(`
          *,
          type_activite(nom)
        `)
        .gte('date_creneau', format(monthStart, 'yyyy-MM-dd'))
        .lte('date_creneau', format(monthEnd, 'yyyy-MM-dd'))
        .eq('actif', true)
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
  const getWeekDates = () => {
    const monthStart = startOfMonth(new Date(currentMonth + '-01'));
    const monthEnd = endOfMonth(monthStart);
    const weeks = eachWeekOfInterval(
      { start: monthStart, end: monthEnd },
      { weekStartsOn: 1 }
    );

    return weeks.map(weekStart => ({
      weekStart,
      dates: Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
        .filter(date => date <= monthEnd && date >= monthStart)
    }));
  };

  const getCreneauForDateAndActivity = (date: Date, typeActiviteId: string) => {
    const dateString = format(date, 'yyyy-MM-dd');
    return creneaux.find(c => 
      c.date_creneau === dateString && 
      c.type_activite_id === typeActiviteId
    );
  };

  const handleCellClick = async (date: Date, activite: TypeActivite) => {
    const dateString = format(date, 'yyyy-MM-dd');
    const creneauDetaille = await loadCreneauDetails(dateString, activite.id);
    
    setSelectedCellData({
      date: dateString,
      activite,
      creneauDetaille
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
        const updatedDetails = await loadCreneauDetails(selectedCellData.date, selectedCellData.activite.id);
        setSelectedCellData({
          ...selectedCellData,
          creneauDetaille: updatedDetails
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

  const weekDates = getWeekDates();

  return (
    <Card className="gradient-card shadow-soft border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📅 Planning mensuel
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Sélecteur de mois */}
        <div className="mb-6">
          <Select value={currentMonth} onValueChange={(value) => {
            setCurrentMonth(value);
            onMonthChange?.(value);
          }}>
            <SelectTrigger className="w-48">
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

        {/* Tableau planning - activités en lignes, semaines en colonnes */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border border-border p-2 text-left font-medium">Activité</th>
                {weekDates.map((week, weekIndex) => (
                  <th key={weekIndex} className="border border-border p-2 text-center font-medium">
                    Semaine {weekIndex + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {typesActivite.map((activite) => (
                <tr key={activite.id}>
                  <td className="border border-border p-2 font-medium bg-muted/50">
                    {activite.nom}
                  </td>
                  {weekDates.map((week, weekIndex) => (
                    <td key={weekIndex} className="border border-border p-1">
                      <div className="grid grid-cols-7 gap-1">
                        {week.dates.map((date) => {
                          const creneau = getCreneauForDateAndActivity(date, activite.id);
                          const isToday_ = isToday(date);
                          
                          return (
                            <button
                              key={date.toISOString()}
                              onClick={() => handleCellClick(date, activite)}
                              className={`
                                min-h-[40px] p-1 text-xs rounded transition-colors
                                ${isToday_ ? 'ring-2 ring-primary' : ''}
                                ${creneau 
                                  ? 'bg-blue-100 hover:bg-blue-200 border border-blue-300' 
                                  : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                                }
                              `}
                            >
                              <div className="font-medium">
                                {format(date, 'd')}
                              </div>
                              {creneau && (
                                <div className="text-[10px] text-blue-700">
                                  {formatTime(creneau.heure_debut)}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal des détails */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {selectedCellData?.activite.nom} - {selectedCellData && format(new Date(selectedCellData.date), 'EEEE d MMMM yyyy', { locale: fr })}
              </DialogTitle>
            </DialogHeader>
            
            {selectedCellData && (
              <div className="space-y-4">
                {selectedCellData.creneauDetaille ? (
                  <>
                    <div>
                      <h4 className="font-medium mb-2">Horaire</h4>
                      <p className="text-sm text-muted-foreground">
                        {formatTime(selectedCellData.creneauDetaille.heure_debut)} - {formatTime(selectedCellData.creneauDetaille.heure_fin)}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">
                        Inscrits ({selectedCellData.creneauDetaille.inscriptions.length}/{selectedCellData.creneauDetaille.max_participants})
                      </h4>
                      <div className="space-y-2">
                        {selectedCellData.creneauDetaille.inscriptions.length > 0 ? (
                          selectedCellData.creneauDetaille.inscriptions.map((inscription) => (
                            <div key={inscription.id} className="flex items-center justify-between p-2 border rounded">
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
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">Aucune inscription</p>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Aucun créneau programmé pour cette date et cette activité.
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