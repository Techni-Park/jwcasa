import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameMonth, startOfWeek, eachWeekOfInterval, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PlanningMensuelProps {
  selectedMonth: string;
  onMonthChange?: (month: string) => void;
}

const PlanningMensuel = ({ selectedMonth, onMonthChange }: PlanningMensuelProps) => {
  const { user } = useAuth();
  const [creneaux, setCreneaux] = useState<any[]>([]);
  const [inscriptions, setInscriptions] = useState<any[]>([]);
  const [proclamateurData, setProclamateurData] = useState<any>(null);
  const [typesActivite, setTypesActivite] = useState<any[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<string>('');
  const [currentMonth, setCurrentMonth] = useState(selectedMonth);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCreneaux();
    loadTypesActivite();
    if (user) {
      loadProclamateurData();
    }
  }, [currentMonth, user, selectedActivity]);

  useEffect(() => {
    if (proclamateurData) {
      loadInscriptions();
    }
  }, [proclamateurData, currentMonth]);

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

  const loadInscriptions = async () => {
    try {
      const { data, error } = await supabase
        .from('inscriptions')
        .select(`
          *,
          creneaux(date_creneau, heure_debut, heure_fin)
        `)
        .eq('proclamateur_id', proclamateurData.id);

      if (error) throw error;
      setInscriptions(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des inscriptions:', error);
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

      if (selectedActivity) {
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

  const getWeeksInMonth = () => {
    const monthStart = startOfMonth(new Date(currentMonth + '-01'));
    const monthEnd = endOfMonth(monthStart);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    
    const weeks = eachWeekOfInterval(
      { start: calendarStart, end: monthEnd },
      { weekStartsOn: 1 }
    );

    return weeks.map(weekStart => {
      const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
      return days.map(day => {
        const dayCreneaux = creneaux.filter(creneau => 
          creneau.date_creneau === format(day, 'yyyy-MM-dd')
        ).map(creneau => ({
          ...creneau,
          userInscription: inscriptions.find(
            inscription => inscription.creneau_id === creneau.id
          )
        }));

        return {
          date: day,
          creneaux: dayCreneaux,
          isCurrentMonth: isSameMonth(day, new Date(currentMonth + '-01'))
        };
      });
    });
  };

  const renderDayCell = (day: any) => {
    const { date, creneaux: dayCreneaux, isCurrentMonth } = day;
    
    if (!isCurrentMonth) {
      return (
        <div key={date.toISOString()} className="h-20 p-1 opacity-30">
          <div className="text-xs text-muted-foreground">
            {format(date, 'd')}
          </div>
        </div>
      );
    }

    return (
      <div key={date.toISOString()} className={`
        h-20 p-1 border border-border/20 
        ${isToday(date) ? 'bg-primary/5 border-primary/30' : 'bg-background'}
      `}>
        <div className={`text-xs font-medium mb-1 ${isToday(date) ? 'text-primary' : ''}`}>
          {format(date, 'd')}
        </div>
        
        <div className="space-y-0.5">
          {dayCreneaux.slice(0, 2).map((creneau: any) => (
            <div key={creneau.id} className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${
                creneau.userInscription 
                  ? creneau.userInscription.confirme 
                    ? 'bg-green-500' 
                    : 'bg-yellow-500'
                  : 'bg-blue-500'
              }`} />
              <span className="text-xs truncate">
                {format(new Date(`2000-01-01T${creneau.heure_debut}`), 'HH:mm')}
              </span>
            </div>
          ))}
          {dayCreneaux.length > 2 && (
            <div className="text-xs text-muted-foreground">
              +{dayCreneaux.length - 2}
            </div>
          )}
        </div>
      </div>
    );
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
                <SelectItem value="">Toutes les activités</SelectItem>
                {typesActivite.map(type => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Légende */}
        <div className="flex flex-wrap gap-2 text-xs mb-4">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>Disponible</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <span>En attente</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Confirmé</span>
          </div>
        </div>

        {/* En-têtes des jours */}
        <div className="grid grid-cols-7 gap-px mb-2">
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
            <div key={day} className="text-center text-sm font-medium p-2">
              {day}
            </div>
          ))}
        </div>

        {/* Grille calendrier */}
        <div className="space-y-px">
          {getWeeksInMonth().map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 gap-px">
              {week.map(renderDayCell)}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default PlanningMensuel;