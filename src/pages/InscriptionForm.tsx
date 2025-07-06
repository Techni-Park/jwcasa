import { useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';

const InscriptionForm = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    date: '',
    creneau: '',
    nom: '',
    sexe: '',
    type: 'diffusion' // diffusion ou installation
  });

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.date || !formData.creneau || !formData.nom || !formData.sexe) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs",
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
      return ins.nom.toLowerCase() === formData.nom.toLowerCase() &&
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
      nom: '',
      sexe: '',
      type: 'diffusion'
    });
  };

  const creneauxDisponibles = formData.date ? getCreneauxDisponibles() : [];

  return (
    <Layout title="Inscription aux créneaux">
      <form onSubmit={handleSubmit} className="space-y-6">
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

        {/* Informations personnelles */}
        <Card className="gradient-card shadow-soft border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <span className="text-xl">👤</span>
              Informations personnelles
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="nom">Nom complet *</Label>
              <Input
                id="nom"
                value={formData.nom}
                onChange={(e) => handleInputChange('nom', e.target.value)}
                placeholder="Votre nom complet"
                required
              />
            </div>
            <div>
              <Label>Sexe *</Label>
              <RadioGroup value={formData.sexe} onValueChange={(value) => handleInputChange('sexe', value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="homme" id="homme" />
                  <Label htmlFor="homme">Homme</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="femme" id="femme" />
                  <Label htmlFor="femme">Femme</Label>
                </div>
              </RadioGroup>
            </div>
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
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
              />
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

        {/* Informations importantes */}
        <Card className="gradient-card shadow-soft border-border/50 border-l-4 border-l-info">
          <CardContent className="p-4">
            <h3 className="font-semibold text-foreground mb-2">📋 Règles importantes</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Maximum 2 inscriptions par mois</li>
              <li>• Pas deux fois le même créneau dans le mois</li>
              <li>• Diffusion: 2-3 personnes dont au moins 1 homme</li>
              <li>• Installation: 2 personnes maximum</li>
              <li>• Validation requise par l'administrateur</li>
            </ul>
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