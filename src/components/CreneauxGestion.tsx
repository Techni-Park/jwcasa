import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, Calendar, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

interface Creneau {
  id: string;
  date_creneau: string;
  heure_debut: string;
  heure_fin: string;
  type_activite_id: string;
  min_participants: number;
  max_participants: number;
  nombre_presentoirs_recommandes: number;
  affiche_id: string | null;
  actif: boolean;
  notes: string | null;
  type_activite?: {
    nom: string;
  };
  affiche?: {
    nom: string;
  };
}

interface TypeActivite {
  id: string;
  nom: string;
}

interface Affiche {
  id: string;
  nom: string;
  description: string | null;
}

const CreneauxGestion = () => {
  const { toast } = useToast();
  const [creneaux, setCreneaux] = useState<Creneau[]>([]);
  const [typesActivite, setTypesActivite] = useState<TypeActivite[]>([]);
  const [affiches, setAffiches] = useState<Affiche[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedTypeActivite, setSelectedTypeActivite] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCreneau, setEditingCreneau] = useState<Creneau | null>(null);
  
  const [formData, setFormData] = useState({
    date_creneau: "",
    heure_debut: "",
    heure_fin: "",
    type_activite_id: "",
    min_participants: 1,
    max_participants: 2,
    nombre_presentoirs_recommandes: 0,
    affiche_id: "",
    notes: ""
  });

  const fetchDataCallback = useCallback(async () => {
    try {
      setLoading(true);

      // Charger les types d'activité
      const { data: typesData, error: typesError } = await supabase
        .from('type_activite')
        .select('id, nom')
        .eq('actif', true)
        .order('nom');

      if (typesError) throw typesError;
      setTypesActivite(typesData || []);

      // Charger les créneaux pour la date sélectionnée
      if (selectedDate) {
        let query = supabase
          .from('creneaux')
          .select(`
            *,
            type_activite:type_activite_id(nom, description),
            inscriptions(id, proclamateur_id, confirme, notes)
          `)
          .eq('date_creneau', selectedDate)
          .eq('actif', true)
          .order('heure_debut');

        if (selectedTypeActivite && selectedTypeActivite !== 'all') {
          query = query.eq('type_activite_id', selectedTypeActivite);
        }

        const { data: creneauxData, error: creneauxError } = await query;
        if (creneauxError) throw creneauxError;
        
        setCreneaux(creneauxData || []);
      } else {
        setCreneaux([]);
      }
      
      // Charger les affiches
      const { data: affichesData, error: affichesError } = await supabase
        .from('affiches')
        .select('id, nom')
        .eq('actif', true)
        .order('nom');
      
      if (affichesError) throw affichesError;
      setAffiches(affichesData || []);
      
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedTypeActivite, toast]);

  useEffect(() => {
    fetchDataCallback();
  }, [fetchDataCallback]);


  const handleSubmit = async () => {
    try {
      if (!formData.date_creneau || !formData.heure_debut || !formData.heure_fin || !formData.type_activite_id) {
        toast({
          title: "Erreur",
          description: "Veuillez remplir tous les champs obligatoires",
          variant: "destructive",
        });
        return;
      }

      const dataToSave = {
        ...formData,
        affiche_id: formData.affiche_id || null,
        notes: formData.notes || null
      };

      if (editingCreneau) {
        const { error } = await supabase
          .from('creneaux')
          .update(dataToSave)
          .eq('id', editingCreneau.id);

        if (error) throw error;

        toast({
          title: "Succès",
          description: "Créneau modifié avec succès",
        });
      } else {
        const { error } = await supabase
          .from('creneaux')
          .insert([{ ...dataToSave, actif: true }]);

        if (error) throw error;

        toast({
          title: "Succès",
          description: "Créneau créé avec succès",
        });
      }

      setIsDialogOpen(false);
      setEditingCreneau(null);
      resetForm();
      await fetchData();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le créneau",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (creneauId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce créneau ?")) return;

    try {
      const { error } = await supabase
        .from('creneaux')
        .delete()
        .eq('id', creneauId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Créneau supprimé avec succès",
      });

      await fetchData();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le créneau",
        variant: "destructive",
      });
    }
  };

  const handleToggleActif = async (creneauId: string, actif: boolean) => {
    try {
      const { error } = await supabase
        .from('creneaux')
        .update({ actif })
        .eq('id', creneauId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: `Créneau ${actif ? 'activé' : 'désactivé'} avec succès`,
      });

      await fetchData();
    } catch (error) {
      console.error('Erreur lors de la modification:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le créneau",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      date_creneau: "",
      heure_debut: "",
      heure_fin: "",
      type_activite_id: "",
      min_participants: 1,
      max_participants: 2,
      nombre_presentoirs_recommandes: 0,
      affiche_id: "",
      notes: ""
    });
  };

  const openEditDialog = (creneau: Creneau) => {
    setEditingCreneau(creneau);
    setFormData({
      date_creneau: creneau.date_creneau,
      heure_debut: creneau.heure_debut,
      heure_fin: creneau.heure_fin,
      type_activite_id: creneau.type_activite_id,
      min_participants: creneau.min_participants,
      max_participants: creneau.max_participants,
      nombre_presentoirs_recommandes: creneau.nombre_presentoirs_recommandes,
      affiche_id: creneau.affiche_id || "",
      notes: creneau.notes || ""
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingCreneau(null);
    resetForm();
    setIsDialogOpen(true);
  };

  if (loading) {
    return <div className="text-center">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Gestion des créneaux</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nouveau créneau
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingCreneau ? 'Modifier le créneau' : 'Créer un nouveau créneau'}
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div>
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date_creneau}
                  onChange={(e) => setFormData({ ...formData, date_creneau: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="type">Type d'activité *</Label>
                <Select
                  value={formData.type_activite_id}
                  onValueChange={(value) => setFormData({ ...formData, type_activite_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une activité" />
                  </SelectTrigger>
                  <SelectContent>
                    {typesActivite.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="heure_debut">Heure de début *</Label>
                <Input
                  id="heure_debut"
                  type="time"
                  value={formData.heure_debut}
                  onChange={(e) => setFormData({ ...formData, heure_debut: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="heure_fin">Heure de fin *</Label>
                <Input
                  id="heure_fin"
                  type="time"
                  value={formData.heure_fin}
                  onChange={(e) => setFormData({ ...formData, heure_fin: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="min_participants">Participants minimum</Label>
                <Input
                  id="min_participants"
                  type="number"
                  min="1"
                  value={formData.min_participants}
                  onChange={(e) => setFormData({ ...formData, min_participants: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div>
                <Label htmlFor="max_participants">Participants maximum</Label>
                <Input
                  id="max_participants"
                  type="number"
                  min="1"
                  value={formData.max_participants}
                  onChange={(e) => setFormData({ ...formData, max_participants: parseInt(e.target.value) || 2 })}
                />
              </div>
              <div>
                <Label htmlFor="presentoirs">Présentoirs recommandés</Label>
                <Input
                  id="presentoirs"
                  type="number"
                  min="0"
                  value={formData.nombre_presentoirs_recommandes}
                  onChange={(e) => setFormData({ ...formData, nombre_presentoirs_recommandes: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="affiche">Affiche (optionnel)</Label>
                <Select
                  value={formData.affiche_id}
                  onValueChange={(value) => setFormData({ ...formData, affiche_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une affiche" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Aucune affiche</SelectItem>
                    {affiches.map((affiche) => (
                      <SelectItem key={affiche.id} value={affiche.id}>
                        {affiche.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Notes optionnelles..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSubmit}>
                {editingCreneau ? 'Modifier' : 'Créer'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtres */}
      <Card>
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="filter-date">Date</Label>
            <Input
              id="filter-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="filter-type">Type d'activité</Label>
            <Select value={selectedTypeActivite} onValueChange={setSelectedTypeActivite}>
              <SelectTrigger>
                <SelectValue placeholder="Tous les types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous les types</SelectItem>
                {typesActivite.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Liste des créneaux */}
      <div className="grid gap-4">
        {creneaux.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">Aucun créneau trouvé</p>
            </CardContent>
          </Card>
        ) : (
          creneaux.map((creneau) => (
            <Card key={creneau.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{new Date(creneau.date_creneau).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{creneau.heure_debut} - {creneau.heure_fin}</span>
                    </div>
                    <Badge variant="outline">{creneau.type_activite?.nom}</Badge>
                    {!creneau.actif && <Badge variant="destructive">Inactif</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-muted-foreground">
                      {creneau.min_participants}-{creneau.max_participants} participants
                      {creneau.nombre_presentoirs_recommandes > 0 && (
                        <span> • {creneau.nombre_presentoirs_recommandes} présentoirs</span>
                      )}
                      {creneau.affiche?.nom && (
                        <span> • {creneau.affiche.nom}</span>
                      )}
                    </div>
                    <Switch
                      checked={creneau.actif}
                      onCheckedChange={(checked) => handleToggleActif(creneau.id, checked)}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(creneau)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(creneau.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {creneau.notes && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    Notes: {creneau.notes}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default CreneauxGestion;