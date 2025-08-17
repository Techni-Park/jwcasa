import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Settings, Users, Calendar, Plus, Edit, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import type { Tables } from "@/integrations/supabase/types";
import { format, addDays, addWeeks, startOfDay, parseISO, isValid } from "date-fns";
import { fr } from "date-fns/locale";

type TypeActivite = Tables<'type_activite'> & {
  valideur?: {
    nom: string;
    prenom: string;
  };
};

type Profile = Tables<'profiles'>;
type Creneau = Tables<'creneaux'> & {
  type_activite: Tables<'type_activite'>;
  inscriptions_count?: number;
};

const JOURS_SEMAINE = [
  { value: 0, label: "Dimanche" },
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" }
];

const FREQUENCES = [
  { value: "weekly", label: "Hebdomadaire" },
  { value: "biweekly", label: "Toutes les 2 semaines" },
  { value: "monthly", label: "Mensuel" }
];

interface CreneauRecurrent {
  jour: number;
  heure_debut: string;
  heure_fin: string;
  frequence: "weekly" | "biweekly" | "monthly";
  date_fin: string;
  min_participants?: number;
  max_participants?: number;
  notes?: string;
}

const formatDateSafe = (dateString: string): string => {
  try {
    if (!dateString) return 'Date invalide';
    const date = parseISO(dateString);
    if (!isValid(date)) return 'Date invalide';
    return format(date, 'EEEE d MMMM yyyy', { locale: fr });
  } catch {
    return 'Date invalide';
  }
};

const Parametrage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [typesActivite, setTypesActivite] = useState<TypeActivite[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [creneaux, setCreneaux] = useState<Creneau[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTypeId, setSelectedTypeId] = useState<string>("");
  const [isCreneauDialogOpen, setIsCreneauDialogOpen] = useState(false);
  const [editingCreneau, setEditingCreneau] = useState<Creneau | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // Formulaire pour créneau récurrent
  const [creneauRecurrent, setCreneauRecurrent] = useState<CreneauRecurrent>({
    jour: 1,
    heure_debut: "09:00",
    heure_fin: "10:00",
    frequence: "weekly",
    date_fin: "",
    min_participants: 1,
    max_participants: 2,
    notes: ""
  });

  const selectedType = typesActivite.find(t => t.id === selectedTypeId);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Charger les types d'activité avec leurs valideurs
      const { data: typesData, error: typesError } = await supabase
        .from('type_activite')
        .select(`
          *,
          valideur:profiles!valideur_id(nom, prenom)
        `)
        .neq('actif', false) // Charger tout sauf les explicitement désactivés
        .order('nom');

      if (typesError) throw typesError;
      
      console.log('Types d\'activité chargés:', typesData?.length || 0, typesData);

      // Charger les profils pour la sélection des valideurs
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, nom, prenom, role')
        .in('role', ['admin', 'responsable'])
        .order('nom');

      if (profilesError) throw profilesError;

      setTypesActivite(typesData || []);
      setProfiles(profilesData || []);
      
      // Sélectionner le premier type par défaut
      if (typesData && typesData.length > 0 && !selectedTypeId) {
        setSelectedTypeId(typesData[0].id);
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, selectedTypeId]);

  const fetchCreneaux = useCallback(async () => {
    if (!selectedTypeId) return;

    try {
      const { data, error } = await supabase
        .from('creneaux')
        .select(`
          *,
          type_activite(nom),
          inscriptions(count)
        `)
        .eq('type_activite_id', selectedTypeId)
        .eq('actif', true)
        .order('date_creneau')
        .order('heure_debut');

      if (error) throw error;
      
      // Filtrer les créneaux avec des dates valides
      const validCreneaux = (data || []).filter(creneau => {
        try {
          return creneau.date_creneau && isValid(parseISO(creneau.date_creneau));
        } catch {
          return false;
        }
      });
      
      setCreneaux(validCreneaux);
    } catch (error) {
      console.error('Erreur lors du chargement des créneaux:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les créneaux",
        variant: "destructive",
      });
    }
  }, [selectedTypeId, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (selectedTypeId) {
      fetchCreneaux();
    }
  }, [selectedTypeId, fetchCreneaux]);

  const saveTypeActivite = async (updates: Partial<TypeActivite>) => {
    if (!selectedType) return;

    try {
      const { error } = await supabase
        .from('type_activite')
        .update(updates)
        .eq('id', selectedType.id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Paramètres sauvegardés avec succès",
      });

      await fetchData();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les paramètres",
        variant: "destructive",
      });
    }
  };

  const createCreneauxRecurrents = async () => {
    if (!selectedType || !creneauRecurrent.date_fin) return;

    try {
      const dateDebut = new Date();
      const dateFin = parseISO(creneauRecurrent.date_fin);
      
      if (!isValid(dateFin)) {
        toast({
          title: "Erreur",
          description: "Date de fin invalide",
          variant: "destructive",
        });
        return;
      }
      const creneauxToCreate = [];

      let currentDate = startOfDay(dateDebut);
      
      // Ajuster la date de début au jour de la semaine souhaité
      while (currentDate.getDay() !== creneauRecurrent.jour) {
        currentDate = addDays(currentDate, 1);
      }

      while (currentDate <= dateFin) {
        creneauxToCreate.push({
          type_activite_id: selectedType.id,
          date_creneau: format(currentDate, 'yyyy-MM-dd'),
          heure_debut: creneauRecurrent.heure_debut,
          heure_fin: creneauRecurrent.heure_fin,
          min_participants: creneauRecurrent.min_participants || 1,
          max_participants: creneauRecurrent.max_participants || 2,
          notes: creneauRecurrent.notes || null,
          actif: true
        });

        // Calculer la prochaine occurrence selon la fréquence
        switch (creneauRecurrent.frequence) {
          case "weekly":
            currentDate = addWeeks(currentDate, 1);
            break;
          case "biweekly":
            currentDate = addWeeks(currentDate, 2);
            break;
          case "monthly":
            currentDate = addWeeks(currentDate, 4);
            break;
        }
      }

      if (creneauxToCreate.length === 0) {
        toast({
          title: "Attention",
          description: "Aucun créneau à créer avec ces paramètres",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('creneaux')
        .insert(creneauxToCreate);

      if (error) throw error;

      toast({
        title: "Succès",
        description: `${creneauxToCreate.length} créneaux créés avec succès`,
      });

      setIsCreneauDialogOpen(false);
      await fetchCreneaux();

      // Réinitialiser le formulaire
      setCreneauRecurrent({
        jour: 1,
        heure_debut: "09:00",
        heure_fin: "10:00",
        frequence: "weekly",
        date_fin: "",
        min_participants: 1,
        max_participants: 2,
        notes: ""
      });

    } catch (error) {
      console.error('Erreur lors de la création des créneaux:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer les créneaux récurrents",
        variant: "destructive",
      });
    }
  };

  const deleteCreneau = async (creneauId: string) => {
    try {
      const { error } = await supabase
        .from('creneaux')
        .update({ actif: false })
        .eq('id', creneauId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Créneau supprimé avec succès",
      });

      await fetchCreneaux();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le créneau",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (creneau: Creneau) => {
    setEditingCreneau(creneau);
    setIsEditDialogOpen(true);
  };

  const updateCreneau = async () => {
    if (!editingCreneau) return;

    try {
      const { error } = await supabase
        .from('creneaux')
        .update({
          date_creneau: editingCreneau.date_creneau,
          heure_debut: editingCreneau.heure_debut,
          heure_fin: editingCreneau.heure_fin,
          min_participants: editingCreneau.min_participants,
          max_participants: editingCreneau.max_participants,
          notes: editingCreneau.notes
        })
        .eq('id', editingCreneau.id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Créneau modifié avec succès",
      });

      setIsEditDialogOpen(false);
      setEditingCreneau(null);
      await fetchCreneaux();
    } catch (error) {
      console.error('Erreur lors de la modification:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le créneau",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="text-center">Chargement...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-2 mb-6">
          <Settings className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Paramétrage</h1>
        </div>

        {/* Sélecteur de type d'activité en en-tête */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Type d'activité ({typesActivite.length} trouvé{typesActivite.length !== 1 ? 's' : ''})</CardTitle>
          </CardHeader>
          <CardContent>
            {typesActivite.length > 0 ? (
              <Select value={selectedTypeId} onValueChange={setSelectedTypeId}>
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue placeholder="Sélectionner un type d'activité" />
                </SelectTrigger>
                <SelectContent>
                  {typesActivite.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="text-muted-foreground">
                Aucun type d'activité disponible. Contactez l'administrateur pour en créer.
              </div>
            )}
          </CardContent>
        </Card>

        {selectedType && (
          <Tabs defaultValue="parametres" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="parametres" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Paramètres généraux
              </TabsTrigger>
              <TabsTrigger value="creneaux" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Créneaux
              </TabsTrigger>
            </TabsList>

            {/* Onglet Paramètres généraux */}
            <TabsContent value="parametres" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Configuration - {selectedType.nom}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Valideur */}
                  <div>
                    <Label>Valideur des inscriptions</Label>
                    <div className="flex items-center gap-4 mt-2">
                      {selectedType.valideur && (
                        <Badge variant="secondary">
                          {selectedType.valideur.prenom} {selectedType.valideur.nom}
                        </Badge>
                      )}
                      <Select 
                        value={selectedType.valideur_id && selectedType.valideur_id !== "" ? selectedType.valideur_id : "none"} 
                        onValueChange={(value) => {
                          saveTypeActivite({ valideur_id: value === "none" ? null : value });
                        }}
                      >
                        <SelectTrigger className="w-64">
                          <SelectValue placeholder="Sélectionner un valideur" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Aucun valideur</SelectItem>
                          {profiles.filter(profile => profile.id && profile.id.trim() !== "").map((profile) => (
                            <SelectItem key={profile.id} value={profile.id}>
                              {profile.prenom} {profile.nom} ({profile.role})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Horaires par défaut */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="heure-debut">Heure de début par défaut</Label>
                      <Input
                        id="heure-debut"
                        type="time"
                        value={selectedType.default_heure_debut || ""}
                        onChange={(e) => {
                          const newType = { ...selectedType, default_heure_debut: e.target.value };
                          setTypesActivite(prev => prev.map(t => t.id === selectedType.id ? newType : t));
                        }}
                        onBlur={() => {
                          saveTypeActivite({ default_heure_debut: selectedType.default_heure_debut });
                        }}
                      />
                    </div>
                    <div>
                      <Label htmlFor="heure-fin">Heure de fin par défaut</Label>
                      <Input
                        id="heure-fin"
                        type="time"
                        value={selectedType.default_heure_fin || ""}
                        onChange={(e) => {
                          const newType = { ...selectedType, default_heure_fin: e.target.value };
                          setTypesActivite(prev => prev.map(t => t.id === selectedType.id ? newType : t));
                        }}
                        onBlur={() => {
                          saveTypeActivite({ default_heure_fin: selectedType.default_heure_fin });
                        }}
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={selectedType.description || ""}
                      onChange={(e) => {
                        const newType = { ...selectedType, description: e.target.value };
                        setTypesActivite(prev => prev.map(t => t.id === selectedType.id ? newType : t));
                      }}
                      onBlur={() => {
                        saveTypeActivite({ description: selectedType.description });
                      }}
                      placeholder="Description de l'activité"
                    />
                  </div>

                  <Button 
                    onClick={() => saveTypeActivite(selectedType)}
                    className="w-full"
                  >
                    Sauvegarder les paramètres
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Onglet Créneaux */}
            <TabsContent value="creneaux" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Créneaux planifiés</h3>
                <Dialog open={isCreneauDialogOpen} onOpenChange={setIsCreneauDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Créer des créneaux récurrents
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Créer des créneaux récurrents</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Jour de la semaine</Label>
                        <Select 
                          value={creneauRecurrent.jour.toString()} 
                          onValueChange={(value) => setCreneauRecurrent({...creneauRecurrent, jour: parseInt(value)})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {JOURS_SEMAINE.map((jour) => (
                              <SelectItem key={jour.value} value={jour.value.toString()}>
                                {jour.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Heure début</Label>
                          <Input
                            type="time"
                            value={creneauRecurrent.heure_debut}
                            onChange={(e) => setCreneauRecurrent({...creneauRecurrent, heure_debut: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label>Heure fin</Label>
                          <Input
                            type="time"
                            value={creneauRecurrent.heure_fin}
                            onChange={(e) => setCreneauRecurrent({...creneauRecurrent, heure_fin: e.target.value})}
                          />
                        </div>
                      </div>

                      <div>
                        <Label>Fréquence</Label>
                        <Select 
                          value={creneauRecurrent.frequence} 
                          onValueChange={(value: "weekly" | "biweekly" | "monthly") => 
                            setCreneauRecurrent({...creneauRecurrent, frequence: value})
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FREQUENCES.map((freq) => (
                              <SelectItem key={freq.value} value={freq.value}>
                                {freq.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Date de fin</Label>
                        <Input
                          type="date"
                          value={creneauRecurrent.date_fin}
                          onChange={(e) => setCreneauRecurrent({...creneauRecurrent, date_fin: e.target.value})}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Min participants</Label>
                          <Input
                            type="number"
                            min="1"
                            value={creneauRecurrent.min_participants}
                            onChange={(e) => setCreneauRecurrent({...creneauRecurrent, min_participants: parseInt(e.target.value)})}
                          />
                        </div>
                        <div>
                          <Label>Max participants</Label>
                          <Input
                            type="number"
                            min="1"
                            value={creneauRecurrent.max_participants}
                            onChange={(e) => setCreneauRecurrent({...creneauRecurrent, max_participants: parseInt(e.target.value)})}
                          />
                        </div>
                      </div>

                      <div>
                        <Label>Notes (optionnel)</Label>
                        <Input
                          value={creneauRecurrent.notes}
                          onChange={(e) => setCreneauRecurrent({...creneauRecurrent, notes: e.target.value})}
                          placeholder="Notes pour ces créneaux"
                        />
                      </div>

                      <Button 
                        onClick={createCreneauxRecurrents} 
                        className="w-full"
                        disabled={!creneauRecurrent.date_fin}
                      >
                        Créer les créneaux
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Dialog d'édition de créneau */}
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Modifier le créneau</DialogTitle>
                  </DialogHeader>
                  {editingCreneau && (
                    <div className="space-y-4">
                      <div>
                        <Label>Date</Label>
                        <Input
                          type="date"
                          value={editingCreneau.date_creneau}
                          onChange={(e) => setEditingCreneau({...editingCreneau, date_creneau: e.target.value})}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Heure début</Label>
                          <Input
                            type="time"
                            value={editingCreneau.heure_debut}
                            onChange={(e) => setEditingCreneau({...editingCreneau, heure_debut: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label>Heure fin</Label>
                          <Input
                            type="time"
                            value={editingCreneau.heure_fin}
                            onChange={(e) => setEditingCreneau({...editingCreneau, heure_fin: e.target.value})}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Min participants</Label>
                          <Input
                            type="number"
                            min="1"
                            value={editingCreneau.min_participants}
                            onChange={(e) => setEditingCreneau({...editingCreneau, min_participants: parseInt(e.target.value)})}
                          />
                        </div>
                        <div>
                          <Label>Max participants</Label>
                          <Input
                            type="number"
                            min="1"
                            value={editingCreneau.max_participants}
                            onChange={(e) => setEditingCreneau({...editingCreneau, max_participants: parseInt(e.target.value)})}
                          />
                        </div>
                      </div>

                      <div>
                        <Label>Notes (optionnel)</Label>
                        <Input
                          value={editingCreneau.notes || ""}
                          onChange={(e) => setEditingCreneau({...editingCreneau, notes: e.target.value})}
                          placeholder="Notes pour ce créneau"
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="flex-1">
                          Annuler
                        </Button>
                        <Button onClick={updateCreneau} className="flex-1">
                          Sauvegarder
                        </Button>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>

              {/* Liste des créneaux */}
              <div className="grid gap-4">
                {creneaux.map((creneau) => (
                  <Card key={creneau.id}>
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">
                            {formatDateSafe(creneau.date_creneau)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {creneau.heure_debut} - {creneau.heure_fin}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {creneau.min_participants} - {creneau.max_participants} participants
                          </div>
                          {creneau.notes && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {creneau.notes}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEditDialog(creneau)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Supprimer le créneau</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Êtes-vous sûr de vouloir supprimer ce créneau ? Cette action ne peut pas être annulée.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteCreneau(creneau.id)}>
                                  Supprimer
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {creneaux.length === 0 && (
                  <Card>
                    <CardContent className="pt-6 text-center text-muted-foreground">
                      Aucun créneau planifié pour ce type d'activité.
                      <br />
                      Utilisez le bouton "Créer des créneaux récurrents" pour commencer.
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </Layout>
  );
};

export default Parametrage;