import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameMonth } from 'date-fns';
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCreneaux();
    if (user) {
      loadProclamateurData();
    }
  }, [selectedMonth, user]);

  useEffect(() => {
    if (proclamateurData) {
      loadInscriptions();
    }
  }, [proclamateurData, selectedMonth]);

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

  const loadCreneaux = async () => {
    try {
      const monthStart = startOfMonth(new Date(selectedMonth + '-01'));
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

  const monthStart = startOfMonth(new Date(selectedMonth + '-01'));
  const monthEnd = endOfMonth(monthStart);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getCreneauxForDay = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    const dayCreneaux = creneaux.filter(creneau => 
      format(new Date(creneau.date_creneau), 'yyyy-MM-dd') === dateString
    );
    
    return dayCreneaux.map(creneau => {
      const userInscription = inscriptions.find(
        inscription => inscription.creneau_id === creneau.id
      );
      
      return {
        ...creneau,
        userInscription
      };
    });
  };

  const renderDay = (date: Date) => {
    const dayCreneaux = getCreneauxForDay(date);
    const hasCreneaux = dayCreneaux.length > 0;
    
    return (
      <div
        key={date.toISOString()}
        className={`
          min-h-[80px] p-2 border border-border/20 
          ${!isSameMonth(date, monthStart) ? 'text-muted-foreground bg-muted/20' : 'bg-background'}
          ${isToday(date) ? 'bg-primary/5 border-primary/30' : ''}
          ${hasCreneaux ? 'hover:bg-accent/10' : ''}
        `}
      >
        <div className={`text-sm font-medium mb-1 ${isToday(date) ? 'text-primary' : ''}`}>
          {format(date, 'd')}
        </div>
        
        {dayCreneaux.map((creneau) => (
          <div key={creneau.id} className="mb-1">
            <Badge 
              variant="outline" 
              className={`text-xs px-1 py-0 h-auto ${
                creneau.userInscription 
                  ? creneau.userInscription.confirme 
                    ? 'bg-green-100 text-green-800 border-green-300' 
                    : 'bg-yellow-100 text-yellow-800 border-yellow-300'
                  : 'bg-blue-100 text-blue-800 border-blue-300'
              }`}
            >
              {creneau.heure_debut}
              {creneau.userInscription && (
                <span className="ml-1">
                  {creneau.userInscription.confirme ? '✓' : '⏳'}
                </span>
              )}
            </Badge>
          </div>
        ))}
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
        {/* Légende */}
        <div className="flex flex-wrap gap-2 text-xs mb-4">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
            <span>Disponible</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded"></div>
            <span>En attente ⏳</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
            <span>Confirmé ✓</span>
          </div>
        </div>

        {/* Calendrier */}
        <div className="grid grid-cols-7 gap-1">
          {/* En-têtes des jours */}
          {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map((day) => (
            <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
              {day}
            </div>
          ))}
          
          {/* Jours du calendrier */}
          {calendarDays.map(renderDay)}
        </div>
      </CardContent>
    </Card>
  );
};

export default PlanningMensuel;