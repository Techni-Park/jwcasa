import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedCreneau, setSelectedCreneau] = useState('');
  const { toast } = useToast();

  const creneaux = [
    { value: '8h-9h30', label: '8h00 - 9h30' },
    { value: '9h30-11h', label: '9h30 - 11h00' },
    { value: '11h-12h30', label: '11h00 - 12h30' },
    { value: 'installation', label: 'Installation/Désinstallation' }
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
      // Ne garder que les dimanches (0 = dimanche)
      if (date.getDay() === 0) {
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
      
      const maxPlaces = creneau.value === 'installation' ? 2 : 3;
      const placesOccupees = inscriptionsForCreneau.filter(ins => ins.statut === 'valide').length;
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

  const handleCreneauClick = (date: string, creneau: string) => {
    setSelectedDate(date);
    setSelectedCreneau(creneau);
    setDialogOpen(true);
  };

  const handleInscription = () => {
    const proclamateurs = JSON.parse(localStorage.getItem('proclamateurs') || '[]');
    if (proclamateurs.length === 0) {
      toast({
        title: "Aucun proclamateur",
        description: "Veuillez d'abord ajouter des proclamateurs dans la section Admin.",
        variant: "destructive"
      });
      return;
    }

    // Rediriger vers la page d'inscription avec les paramètres
    window.location.href = `/inscription?date=${selectedDate}&creneau=${selectedCreneau}`;
  };

  const hasReport = (date: string) => {
    const rapports = JSON.parse(localStorage.getItem('rapports') || '[]');
    return rapports.some((r: any) => r.date === date);
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
              <span>En attente</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-primary rounded"></div>
              <span>Validé</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-destructive rounded"></div>
              <span>Complet</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-accent rounded"></div>
              <span>Rapport saisi</span>
            </div>
          </div>

          {/* Planning */}
          <div className="space-y-3">
            {daysInMonth.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Aucun dimanche ce mois-ci
              </div>
            ) : (
              daysInMonth.map(date => {
                const creneauxInfo = getCreneauxForDate(date);
                const dateInfo = formatDate(date);
                const dateHasReport = hasReport(date);
                
                return (
                  <div key={date} className={`border border-border rounded-lg p-3 ${dateHasReport ? 'bg-accent/10' : ''}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-foreground flex items-center gap-2">
                        {dateInfo.full}
                        {dateHasReport && <span className="text-xs bg-accent text-accent-foreground px-2 py-1 rounded">Rapport saisi</span>}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                      {creneauxInfo.map(creneauInfo => {
                        const inscriptionsValides = creneauInfo.inscriptions.filter(ins => ins.statut === 'valide');
                        const inscriptionsAttente = creneauInfo.inscriptions.filter(ins => ins.statut === 'en_attente');
                        
                        const getStatusColor = () => {
                          if (dateHasReport) return 'bg-accent text-accent-foreground';
                          if (creneauInfo.complet && inscriptionsValides.length > 0) return 'bg-destructive text-destructive-foreground';
                          if (inscriptionsValides.length > 0) return 'bg-primary text-primary-foreground';
                          if (inscriptionsAttente.length > 0) return 'bg-warning text-warning-foreground';
                          return 'bg-success text-success-foreground hover:bg-success/80';
                        };
                        
                        const isInstallation = creneauInfo.creneau === 'installation';
                        
                        return (
                          <button
                            key={creneauInfo.creneau}
                            onClick={() => handleCreneauClick(date, creneauInfo.creneau)}
                            className={`${getStatusColor()} p-2 rounded text-xs transition-colors cursor-pointer`}
                          >
                            <div className="font-medium mb-1">
                              {isInstallation ? '🔧 Installation' : creneaux.find(c => c.value === creneauInfo.creneau)?.label.split(' - ')[0]}
                            </div>
                            <div className="text-xs opacity-90 mb-1">
                              {creneauInfo.placesLibres > 0 
                                ? `${creneauInfo.placesLibres} place(s) libre(s)`
                                : 'Complet'
                              }
                            </div>
                            {creneauInfo.inscriptions.length > 0 && (
                              <div className="text-xs space-y-1">
                                {inscriptionsValides.map(ins => (
                                  <div key={ins.id} className="truncate font-medium">
                                    {isInstallation ? '🔧 ' : ''}{ins.nom?.split(' ')[0]}
                                  </div>
                                ))}
                                {inscriptionsAttente.map(ins => (
                                  <div key={ins.id} className="truncate opacity-75">
                                    {isInstallation ? '🔧 ' : ''}{ins.nom?.split(' ')[0]} (att.)
                                  </div>
                                ))}
                              </div>
                            )}
                            {creneauInfo.inscriptions.length === 0 && (
                              <div className="flex items-center justify-center">
                                <Plus className="h-3 w-3" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Dialog d'inscription */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>S'inscrire au créneau</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p>
                  Voulez-vous vous inscrire pour le <strong>{new Date(selectedDate).toLocaleDateString('fr-FR')}</strong> 
                  {' '}au créneau <strong>{creneaux.find(c => c.value === selectedCreneau)?.label}</strong> ?
                </p>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleInscription}>
                    S'inscrire
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
};

export default PlanningMensuel;