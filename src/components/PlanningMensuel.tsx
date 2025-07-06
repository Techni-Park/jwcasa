import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface PlanningProps {
  selectedMonth?: string;
  onMonthChange?: (month: string) => void;
}

interface CreneauInfo {
  date: string;
  creneau: string;
  inscriptions: any[];
  placesLibres: number;
  complet: boolean;
}

const PlanningMensuel = ({ selectedMonth, onMonthChange }: PlanningProps) => {
  const [currentMonth, setCurrentMonth] = useState(selectedMonth || new Date().toISOString().slice(0, 7));
  const [inscriptions, setInscriptions] = useState<any[]>([]);

  const creneaux = [
    { value: '8h-9h30', label: '8h00 - 9h30' },
    { value: '9h30-11h', label: '9h30 - 11h00' },
    { value: '11h-12h30', label: '11h00 - 12h30' }
  ];

  useEffect(() => {
    loadInscriptions();
  }, []);

  useEffect(() => {
    if (selectedMonth) {
      setCurrentMonth(selectedMonth);
    }
  }, [selectedMonth]);

  const loadInscriptions = () => {
    const saved = JSON.parse(localStorage.getItem('inscriptions') || '[]');
    setInscriptions(saved);
  };

  const getDaysInMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const days = [];
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      // Ne garder que les jours ouvrables (du lundi au samedi)
      if (date.getDay() !== 0) { // 0 = dimanche
        days.push(date.toISOString().split('T')[0]);
      }
    }
    return days;
  };

  const getCreneauxForDate = (date: string): CreneauInfo[] => {
    return creneaux.map(creneau => {
      const inscriptionsForCreneau = inscriptions.filter(
        ins => ins.date === date && ins.creneau === creneau.value && ins.statut !== 'refuse'
      );
      
      const maxPlaces = 3; // Peut être ajusté selon le type
      const placesOccupees = inscriptionsForCreneau.length;
      const placesLibres = maxPlaces - placesOccupees;
      
      return {
        date,
        creneau: creneau.value,
        inscriptions: inscriptionsForCreneau,
        placesLibres,
        complet: placesLibres <= 0
      };
    });
  };

  const handleMonthChange = (newMonth: string) => {
    setCurrentMonth(newMonth);
    onMonthChange?.(newMonth);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const [year, month] = currentMonth.split('-').map(Number);
    const newDate = new Date(year, month - 1);
    
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    
    const newMonth = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`;
    handleMonthChange(newMonth);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    return {
      day: days[date.getDay()],
      date: date.getDate(),
      full: date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
    };
  };

  const monthName = new Date(currentMonth + '-01').toLocaleDateString('fr-FR', { 
    month: 'long', 
    year: 'numeric' 
  });

  const daysInMonth = getDaysInMonth(currentMonth);

  return (
    <Card className="gradient-card shadow-soft border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Planning mensuel
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[120px] text-center capitalize">
              {monthName}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Légende */}
          <div className="flex flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-success rounded"></div>
              <span>Libre</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-warning rounded"></div>
              <span>Partiel</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-destructive rounded"></div>
              <span>Complet</span>
            </div>
          </div>

          {/* Planning */}
          <div className="space-y-3">
            {daysInMonth.map(date => {
              const creneauxInfo = getCreneauxForDate(date);
              const dateInfo = formatDate(date);
              
              return (
                <div key={date} className="border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-foreground">
                      {dateInfo.full}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    {creneauxInfo.map(creneauInfo => {
                      const getStatus = () => {
                        if (creneauInfo.complet) return 'destructive';
                        if (creneauInfo.inscriptions.length > 0) return 'secondary';
                        return 'outline';
                      };
                      
                      return (
                        <div key={creneauInfo.creneau} className="text-center">
                          <Badge 
                            variant={getStatus()}
                            className="w-full text-xs p-1"
                          >
                            {creneaux.find(c => c.value === creneauInfo.creneau)?.label.split(' - ')[0]}
                          </Badge>
                          <div className="text-xs text-muted-foreground mt-1">
                            {creneauInfo.placesLibres > 0 
                              ? `${creneauInfo.placesLibres} libre(s)`
                              : 'Complet'
                            }
                          </div>
                          {creneauInfo.inscriptions.length > 0 && (
                            <div className="text-xs text-muted-foreground">
                              {creneauInfo.inscriptions.map(ins => (
                                <div key={ins.id} className={`truncate ${ins.statut === 'en_attente' ? 'opacity-60' : ''}`}>
                                  {ins.nom?.split(' ')[0]}
                                  {ins.statut === 'en_attente' && ' (att.)'}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PlanningMensuel;