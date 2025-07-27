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
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const InscriptionForm = () => {
  const { toast } = useToast();
  const [proclamateurs, setProclamateurs] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [formData, setFormData] = useState({
    date: '',
    creneau: '',
    proclamateurId: '1', // Utilisateur connecté par défaut
    type: 'diffusion' // diffusion ou installation
  });

  useEffect(() => {
    loadProclamateurs();
  }, []);

  const loadProclamateurs = () => {
    const saved = JSON.parse(localStorage.getItem('proclamateurs') || '[]');
    const actifs = saved.filter((p: any) => p.actif);
    setProclamateurs(actifs);
  };

  const creneaux = [
    { value: '8h-9h30', label: '8h00 - 9h30' },
    { value: '9h30-11h', label: '9h30 - 11h00' },
    { value: '11h-12h30', label: '11h00 - 12h30' }
  ];

  // Simuler les créneaux occupés (récupérés depuis localStorage)
  const getCreneauxDisponibles = () => {
    const inscriptions = JSON.parse(localStorage.getItem('inscriptions') || '[]');
    const today = new Date().toISOString().split('T')[0];
    
    return creneaux.map(creneau => {
      const inscriptionsForCreneau = inscriptions.filter(
        (ins: any) => ins.date === formData.date && ins.creneau === creneau.value && ins.statut !== 'refuse'
      );
      
      const places = formData.type === 'installation' ? 2 : 3;
      const placesOccupees = inscriptionsForCreneau.length;
      const hommes = inscriptionsForCreneau.filter((ins: any) => ins.sexe === 'homme').length;
      
      return {
        ...creneau,
        placesDisponibles: places - placesOccupees,
        besoinHomme: formData.type === 'diffusion' && hommes === 0 && placesOccupees > 0
      };
    });
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

  const getSelectedProclamateur = () => {
    return proclamateurs.find(p => p.id.toString() === formData.proclamateurId);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.date || !formData.creneau || !formData.proclamateurId) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs",
        variant: "destructive"
      });
      return;
    }

    const selectedProclamateur = getSelectedProclamateur();
    if (!selectedProclamateur) {
      toast({
        title: "Erreur",
        description: "Proclamateur non trouvé",
        variant: "destructive"
      });
      return;
    }

    // Vérification des contraintes
    const inscriptions = JSON.parse(localStorage.getItem('inscriptions') || '[]');
    
    // Vérifier les inscriptions du mois pour cette personne
    const currentMonth = new Date(formData.date).getMonth();
    const currentYear = new Date(formData.date).getFullYear();
    const inscriptionsPersonne = inscriptions.filter((ins: any) => {
      const insDate = new Date(ins.date);
      return ins.proclamateurId === formData.proclamateurId &&
             insDate.getMonth() === currentMonth &&
             insDate.getFullYear() === currentYear &&
             ins.statut === 'valide';
    });

    if (inscriptionsPersonne.length >= 2) {
      toast({
        title: "Erreur",
        description: "Vous êtes déjà inscrit 2 fois ce mois",
        variant: "destructive"
      });
      return;
    }

    // Vérifier les créneaux identiques
    const creneauIdentique = inscriptionsPersonne.some((ins: any) => ins.creneau === formData.creneau);
    if (creneauIdentique) {
      toast({
        title: "Erreur",
        description: "Vous êtes déjà inscrit à ce créneau ce mois-ci",
        variant: "destructive"
      });
      return;
    }

    // Vérifier la disponibilité du créneau
    const creneauxDispo = getCreneauxDisponibles();
    const creneauChoisi = creneauxDispo.find(c => c.value === formData.creneau);
    
    if (creneauChoisi && creneauChoisi.placesDisponibles <= 0) {
      toast({
        title: "Erreur",
        description: "Ce créneau est complet",
        variant: "destructive"
      });
      return;
    }

    // Sauvegarder l'inscription
    const newInscription = {
      id: Date.now(),
      ...formData,
      nom: `${selectedProclamateur.prenom} ${selectedProclamateur.nom}`,
      sexe: selectedProclamateur.sexe,
      statut: 'en_attente',
      createdAt: new Date().toISOString()
    };
    
    inscriptions.push(newInscription);
    localStorage.setItem('inscriptions', JSON.stringify(inscriptions));

    toast({
      title: "Succès",
      description: "Inscription enregistrée. En attente de validation.",
    });

    // Réinitialiser le formulaire
    setFormData({
      date: '',
      creneau: '',
      proclamateurId: '1',
      type: 'diffusion'
    });
    setSelectedDate(undefined);
  };

  const creneauxDisponibles = formData.date ? getCreneauxDisponibles() : [];

  return (
    <Layout title="Inscription aux créneaux">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Layout en 3 colonnes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Type d'activité */}
          <Card className="gradient-card shadow-soft border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <span className="text-xl">⚙️</span>
                Type d'activité
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="diffusion" id="diffusion" />
                  <Label htmlFor="diffusion">Diffusion (2-3 personnes dont 1 homme min)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="installation" id="installation" />
                  <Label htmlFor="installation">Installation/Désinstallation (2 personnes max)</Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Créneau souhaité */}
          <Card className="gradient-card shadow-soft border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <span className="text-xl">📅</span>
                Créneau souhaité
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="date">Date (dimanche uniquement) *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP", { locale: fr }) : <span>Choisir un dimanche</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDateSelect}
                      disabled={(date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        return date < today || date.getDay() !== 0; // Seulement les dimanches
                      }}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              {formData.date && (
                <div>
                  <Label htmlFor="creneau">Créneau horaire *</Label>
                  <Select value={formData.creneau} onValueChange={(value) => handleInputChange('creneau', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un créneau" />
                    </SelectTrigger>
                    <SelectContent>
                      {creneauxDisponibles.map((creneau) => (
                        <SelectItem 
                          key={creneau.value} 
                          value={creneau.value}
                          disabled={creneau.placesDisponibles <= 0}
                        >
                          <div className="flex justify-between items-center w-full">
                            <span>{creneau.label}</span>
                            <span className="text-sm text-muted-foreground ml-4">
                              {creneau.placesDisponibles > 0 
                                ? `${creneau.placesDisponibles} place(s)`
                                : 'Complet'
                              }
                              {creneau.besoinHomme && ' - Homme souhaité'}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

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
        </div>

        {/* Utilisateur connecté */}
        <Card className="gradient-card shadow-soft border-border/50 bg-secondary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <span className="text-xl">👤</span>
              <div>
                <h3 className="font-semibold text-foreground">Utilisateur connecté</h3>
                <p className="text-sm text-muted-foreground">
                  {proclamateurs.find(p => p.id.toString() === formData.proclamateurId)?.prenom}{' '}
                  {proclamateurs.find(p => p.id.toString() === formData.proclamateurId)?.nom}
                  {proclamateurs.find(p => p.id.toString() === formData.proclamateurId)?.sexe && 
                    ` (${proclamateurs.find(p => p.id.toString() === formData.proclamateurId)?.sexe})`
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Boutons */}
        <div className="flex gap-4">
          <Button type="submit" className="flex-1">
            S'inscrire
          </Button>
          <Button type="button" variant="outline" onClick={() => window.history.back()}>
            Retour
          </Button>
        </div>
      </form>
    </Layout>
  );
};

export default InscriptionForm;