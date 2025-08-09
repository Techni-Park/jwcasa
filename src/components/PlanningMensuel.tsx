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

  const getDaysWithCreneaux = () => {
    // Grouper les créneaux par date
    const creneauxByDate = creneaux.reduce((acc, creneau) => {
      const dateString = creneau.date_creneau;
      if (!acc[dateString]) {
        acc[dateString] = [];
      }
      
      const userInscription = inscriptions.find(
        inscription => inscription.creneau_id === creneau.id
      );
      
      acc[dateString].push({
        ...creneau,
        userInscription
      });
      
      return acc;
    }, {} as Record<string, any[]>);

    // Retourner uniquement les jours avec des créneaux
    return Object.entries(creneauxByDate).map(([dateString, dayCreneaux]) => ({
      date: new Date(dateString),
      creneaux: dayCreneaux
    })).sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  const renderDayCard = ({ date, creneaux: dayCreneaux }: { date: Date; creneaux: any[] }) => {
    return (
      <Card key={date.toISOString()} className={`
        p-4 border border-border/50 hover:border-border transition-colors
        ${isToday(date) ? 'bg-primary/5 border-primary/30' : 'bg-background'}
      `}>
        <div className="mb-3">
          <div className={`text-lg font-semibold ${isToday(date) ? 'text-primary' : ''}`}>
            {format(date, 'EEEE d', { locale: fr })}
          </div>
          <div className="text-sm text-muted-foreground">
            {format(date, 'MMMM yyyy', { locale: fr })}
          </div>
        </div>
        
        <div className="space-y-2">
          {dayCreneaux.map((creneau) => (
            <div key={creneau.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge 
                  variant="outline" 
                  className={`text-xs ${
                    creneau.userInscription 
                      ? creneau.userInscription.confirme 
                        ? 'bg-green-100 text-green-800 border-green-300' 
                        : 'bg-yellow-100 text-yellow-800 border-yellow-300'
                      : 'bg-blue-100 text-blue-800 border-blue-300'
                  }`}
                >
                  {format(new Date(`2000-01-01T${creneau.heure_debut}`), 'HH:mm')} - {format(new Date(`2000-01-01T${creneau.heure_fin}`), 'HH:mm')}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {creneau.type_activite?.nom}
                </span>
              </div>
              {creneau.userInscription && (
                <span className="text-lg">
                  {creneau.userInscription.confirme ? '✓' : '⏳'}
                </span>
              )}
            </div>
          ))}
        </div>
      </Card>
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

        {/* Jours avec créneaux */}
        <div className="space-y-4">
          {getDaysWithCreneaux().length > 0 ? (
            getDaysWithCreneaux().map(renderDayCard)
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Aucun créneau disponible ce mois-ci
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PlanningMensuel;