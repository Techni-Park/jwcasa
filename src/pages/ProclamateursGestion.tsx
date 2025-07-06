import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Edit, Plus } from 'lucide-react';

interface Proclamateur {
  id: number;
  nom: string;
  prenom: string;
  sexe: 'homme' | 'femme';
  telephone?: string;
  email?: string;
  actif: boolean;
  createdAt: string;
}

const ProclamateursGestion = () => {
  const { toast } = useToast();
  const [proclamateurs, setProclamateurs] = useState<Proclamateur[]>([]);
  const [editingProclamateur, setEditingProclamateur] = useState<Proclamateur | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    sexe: '' as 'homme' | 'femme',
    telephone: '',
    email: '',
    actif: true
  });

  useEffect(() => {
    loadProclamateurs();
  }, []);

  const loadProclamateurs = () => {
    const saved = JSON.parse(localStorage.getItem('proclamateurs') || '[]');
    setProclamateurs(saved);
  };

  const saveProclamateurs = (newProclamateurs: Proclamateur[]) => {
    localStorage.setItem('proclamateurs', JSON.stringify(newProclamateurs));
    setProclamateurs(newProclamateurs);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nom || !formData.prenom || !formData.sexe) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive"
      });
      return;
    }

    if (editingProclamateur) {
      // Modification
      const updated = proclamateurs.map(p => 
        p.id === editingProclamateur.id 
          ? { ...p, ...formData }
          : p
      );
      saveProclamateurs(updated);
      toast({
        title: "Succès",
        description: "Proclamateur modifié avec succès"
      });
    } else {
      // Ajout
      const newProclamateur: Proclamateur = {
        id: Date.now(),
        ...formData,
        createdAt: new Date().toISOString()
      };
      saveProclamateurs([...proclamateurs, newProclamateur]);
      toast({
        title: "Succès",
        description: "Proclamateur ajouté avec succès"
      });
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      nom: '',
      prenom: '',
      sexe: '' as 'homme' | 'femme',
      telephone: '',
      email: '',
      actif: true
    });
    setEditingProclamateur(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (proclamateur: Proclamateur) => {
    setFormData({
      nom: proclamateur.nom,
      prenom: proclamateur.prenom,
      sexe: proclamateur.sexe,
      telephone: proclamateur.telephone || '',
      email: proclamateur.email || '',
      actif: proclamateur.actif
    });
    setEditingProclamateur(proclamateur);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce proclamateur ?')) {
      const updated = proclamateurs.filter(p => p.id !== id);
      saveProclamateurs(updated);
      toast({
        title: "Succès",
        description: "Proclamateur supprimé avec succès"
      });
    }
  };

  const toggleActif = (id: number) => {
    const updated = proclamateurs.map(p => 
      p.id === id ? { ...p, actif: !p.actif } : p
    );
    saveProclamateurs(updated);
  };

  const proclamateursActifs = proclamateurs.filter(p => p.actif);

  return (
    <Layout title="Gestion des Proclamateurs">
      <div className="space-y-6">
        {/* Statistiques */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="gradient-card shadow-soft border-border/50">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{proclamateursActifs.length}</div>
              <div className="text-sm text-muted-foreground">Proclamateurs actifs</div>
            </CardContent>
          </Card>
          <Card className="gradient-card shadow-soft border-border/50">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-secondary">{proclamateurs.length}</div>
              <div className="text-sm text-muted-foreground">Total proclamateurs</div>
            </CardContent>
          </Card>
        </div>

        {/* Bouton d'ajout */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un proclamateur
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingProclamateur ? 'Modifier' : 'Ajouter'} un proclamateur
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nom">Nom *</Label>
                  <Input
                    id="nom"
                    value={formData.nom}
                    onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="prenom">Prénom *</Label>
                  <Input
                    id="prenom"
                    value={formData.prenom}
                    onChange={(e) => setFormData(prev => ({ ...prev, prenom: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div>
                <Label>Sexe *</Label>
                <RadioGroup 
                  value={formData.sexe} 
                  onValueChange={(value: 'homme' | 'femme') => setFormData(prev => ({ ...prev, sexe: value }))}
                >
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

              <div>
                <Label htmlFor="telephone">Téléphone</Label>
                <Input
                  id="telephone"
                  value={formData.telephone}
                  onChange={(e) => setFormData(prev => ({ ...prev, telephone: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingProclamateur ? 'Modifier' : 'Ajouter'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Annuler
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Liste des proclamateurs */}
        <Card className="gradient-card shadow-soft border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-xl">👥</span>
              Liste des proclamateurs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {proclamateurs.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Aucun proclamateur enregistré</p>
              ) : (
                proclamateurs.map((proclamateur) => (
                  <div key={proclamateur.id} className="border border-border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground">
                            {proclamateur.prenom} {proclamateur.nom}
                          </h3>
                          <Badge variant={proclamateur.sexe === 'homme' ? 'default' : 'secondary'}>
                            {proclamateur.sexe === 'homme' ? '👨' : '👩'} {proclamateur.sexe}
                          </Badge>
                          <Badge 
                            variant={proclamateur.actif ? 'default' : 'outline'}
                            className="cursor-pointer"
                            onClick={() => toggleActif(proclamateur.id)}
                          >
                            {proclamateur.actif ? 'Actif' : 'Inactif'}
                          </Badge>
                        </div>
                        {(proclamateur.telephone || proclamateur.email) && (
                          <div className="text-sm text-muted-foreground space-y-1">
                            {proclamateur.telephone && (
                              <div>📞 {proclamateur.telephone}</div>
                            )}
                            {proclamateur.email && (
                              <div>📧 {proclamateur.email}</div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(proclamateur)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(proclamateur.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default ProclamateursGestion;