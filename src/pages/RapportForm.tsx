import { useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

const RapportForm = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    date: '',
    creneau: '',
    representant: '',
    conversations: '',
    videos: '',
    revues: '',
    brochures: '',
    tracts: '',
    temoignages: '',
    commentaires: ''
  });

  const creneaux = [
    { value: '8h-9h30', label: '8h00 - 9h30' },
    { value: '9h30-11h', label: '9h30 - 11h00' },
    { value: '11h-12h30', label: '11h00 - 12h30' }
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation basique
    if (!formData.date || !formData.creneau || !formData.representant) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive"
      });
      return;
    }

    // Sauvegarder dans localStorage (temporaire)
    const rapports = JSON.parse(localStorage.getItem('rapports') || '[]');
    const newRapport = {
      id: Date.now(),
      ...formData,
      createdAt: new Date().toISOString()
    };
    rapports.push(newRapport);
    localStorage.setItem('rapports', JSON.stringify(rapports));

    toast({
      title: "Succès",
      description: "Rapport enregistré avec succès",
    });

    // Réinitialiser le formulaire
    setFormData({
      date: '',
      creneau: '',
      representant: '',
      conversations: '',
      videos: '',
      revues: '',
      brochures: '',
      tracts: '',
      temoignages: '',
      commentaires: ''
    });
  };

  return (
    <Layout title="Nouveau rapport d'activité">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informations générales */}
        <Card className="gradient-card shadow-soft border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <span className="text-xl">📋</span>
              Informations générales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="creneau">Créneau horaire *</Label>
                <Select value={formData.creneau} onValueChange={(value) => handleInputChange('creneau', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un créneau" />
                  </SelectTrigger>
                  <SelectContent>
                    {creneaux.map((creneau) => (
                      <SelectItem key={creneau.value} value={creneau.value}>
                        {creneau.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="representant">Nom du représentant *</Label>
              <Input
                id="representant"
                value={formData.representant}
                onChange={(e) => handleInputChange('representant', e.target.value)}
                placeholder="Nom du représentant"
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Statistiques d'activité */}
        <Card className="gradient-card shadow-soft border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <span className="text-xl">📊</span>
              Statistiques d'activité
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="conversations">Conversations</Label>
                <Input
                  id="conversations"
                  type="number"
                  min="0"
                  value={formData.conversations}
                  onChange={(e) => handleInputChange('conversations', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="videos">Vidéos montrées</Label>
                <Input
                  id="videos"
                  type="number"
                  min="0"
                  value={formData.videos}
                  onChange={(e) => handleInputChange('videos', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="revues">Revues</Label>
                <Input
                  id="revues"
                  type="number"
                  min="0"
                  value={formData.revues}
                  onChange={(e) => handleInputChange('revues', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="brochures">Brochures</Label>
                <Input
                  id="brochures"
                  type="number"
                  min="0"
                  value={formData.brochures}
                  onChange={(e) => handleInputChange('brochures', e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tracts">Tracts</Label>
                <Input
                  id="tracts"
                  type="number"
                  min="0"
                  value={formData.tracts}
                  onChange={(e) => handleInputChange('tracts', e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Témoignages et commentaires */}
        <Card className="gradient-card shadow-soft border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <span className="text-xl">💭</span>
              Témoignages et commentaires
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="temoignages">Témoignages</Label>
              <Textarea
                id="temoignages"
                value={formData.temoignages}
                onChange={(e) => handleInputChange('temoignages', e.target.value)}
                placeholder="Décrivez les témoignages reçus..."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="commentaires">Commentaires généraux</Label>
              <Textarea
                id="commentaires"
                value={formData.commentaires}
                onChange={(e) => handleInputChange('commentaires', e.target.value)}
                placeholder="Observations, remarques particulières..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Bouton de soumission */}
        <div className="flex gap-4">
          <Button type="submit" className="flex-1">
            Enregistrer le rapport
          </Button>
          <Button type="button" variant="outline" onClick={() => window.history.back()}>
            Annuler
          </Button>
        </div>
      </form>
    </Layout>
  );
};

export default RapportForm;