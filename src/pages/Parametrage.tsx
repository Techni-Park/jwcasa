import { useState, useEffect } from "react";
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
import { Settings, Clock, UserCheck, CalendarDays } from "lucide-react";
import CreneauxGestion from "@/components/CreneauxGestion";
import { useCallback } from "react";

interface TypeActivite {
  id: string;
  nom: string;
  description: string | null;
  valideur_id: string | null;
  recurrence_enabled: boolean;
  recurrence_days: number[];
  recurrence_weeks: number[];
  default_heure_debut: string | null;
  default_heure_fin: string | null;
  auto_create_slots: boolean;
  valideur?: {
    nom: string;
    prenom: string;
  };
}

interface Profile {
  id: string;
  nom: string;
  prenom: string;
  role: string;
}

const JOURS_SEMAINE = [
  { value: 0, label: "Dimanche" },
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" }
];

const SEMAINES_MOIS = [
  { value: 1, label: "1ère semaine" },
  { value: 2, label: "2ème semaine" },
  { value: 3, label: "3ème semaine" },
  { value: 4, label: "4ème semaine" }
];

const Parametrage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [typesActivite, setTypesActivite] = useState<TypeActivite[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<TypeActivite | null>(null);

 

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
        .order('nom');

      if (typesError) throw typesError;

      // Charger les profils pour la sélection des valideurs
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, nom, prenom, role')
        .in('role', ['admin', 'responsable'])
        .order('nom');

      if (profilesError) throw profilesError;

      setTypesActivite(typesData || []);
      setProfiles(profilesData || []);
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
  }, [toast, setLoading]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const saveTypeActivite = async (typeActivite: TypeActivite) => {
    try {
      const { error } = await supabase
        .from('type_activite')
        .update({
          valideur_id: typeActivite.valideur_id,
          recurrence_enabled: typeActivite.recurrence_enabled,
          recurrence_days: typeActivite.recurrence_days,
          recurrence_weeks: typeActivite.recurrence_weeks,
          default_heure_debut: typeActivite.default_heure_debut,
          default_heure_fin: typeActivite.default_heure_fin,
          auto_create_slots: typeActivite.auto_create_slots
        })
        .eq('id', typeActivite.id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Paramétrage sauvegardé avec succès",
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

  const handleRecurrenceDayChange = (day: number, checked: boolean) => {
    if (!selectedType) return;

    const newDays = checked
      ? [...selectedType.recurrence_days, day].sort()
      : selectedType.recurrence_days.filter(d => d !== day);

    setSelectedType({
      ...selectedType,
      recurrence_days: newDays
    });
  };

  const handleRecurrenceWeekChange = (week: number, checked: boolean) => {
    if (!selectedType) return;

    const newWeeks = checked
      ? [...selectedType.recurrence_weeks, week].sort()
      : selectedType.recurrence_weeks.filter(w => w !== week);

    setSelectedType({
      ...selectedType,
      recurrence_weeks: newWeeks
    });
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

        <Tabs defaultValue="valideurs" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="valideurs" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Valideurs
            </TabsTrigger>
            <TabsTrigger value="recurrence" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Créneaux récurrents
            </TabsTrigger>
            <TabsTrigger value="creneaux" className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Gestion créneaux
            </TabsTrigger>
          </TabsList>

          <TabsContent value="valideurs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Configuration des valideurs d'inscriptions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {typesActivite.map((type) => (
                  <div key={type.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">{type.nom}</h3>
                      {type.description && (
                        <p className="text-sm text-muted-foreground">{type.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      {type.valideur && (
                        <Badge variant="secondary">
                          {type.valideur.prenom} {type.valideur.nom}
                        </Badge>
                      )}
                      <Select
                        value={type.valideur_id || "none"}
                        onValueChange={(value) => {
                          const updatedType = { ...type, valideur_id: value === "none" ? null : value };
                          saveTypeActivite(updatedType);
                        }}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Sélectionner un valideur" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Aucun valideur</SelectItem>
                          {profiles.map((profile) => (
                            <SelectItem key={profile.id} value={profile.id || `profile-${profile.nom}`}>
                              {profile.prenom} {profile.nom} ({profile.role})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recurrence" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Types d'activité</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {typesActivite.map((type) => (
                      <div
                        key={type.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedType?.id === type.id
                            ? 'border-primary bg-primary/5'
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => setSelectedType(type)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{type.nom}</span>
                          {type.recurrence_enabled && (
                            <Badge variant="outline">Récurrence activée</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {selectedType && (
                <Card>
                  <CardHeader>
                    <CardTitle>Configuration - {selectedType.nom}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="recurrence"
                        checked={selectedType.recurrence_enabled}
                        onCheckedChange={(checked) =>
                          setSelectedType({
                            ...selectedType,
                            recurrence_enabled: checked as boolean
                          })
                        }
                      />
                      <Label htmlFor="recurrence">Activer la récurrence</Label>
                    </div>

                    {selectedType.recurrence_enabled && (
                      <>
                        <div>
                          <Label className="text-sm font-medium">Jours de la semaine</Label>
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            {JOURS_SEMAINE.map((jour) => (
                              <div key={jour.value} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`jour-${jour.value}`}
                                  checked={selectedType.recurrence_days.includes(jour.value)}
                                  onCheckedChange={(checked) =>
                                    handleRecurrenceDayChange(jour.value, checked as boolean)
                                  }
                                />
                                <Label htmlFor={`jour-${jour.value}`} className="text-sm">
                                  {jour.label}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <Label className="text-sm font-medium">Semaines du mois</Label>
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            {SEMAINES_MOIS.map((semaine) => (
                              <div key={semaine.value} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`semaine-${semaine.value}`}
                                  checked={selectedType.recurrence_weeks.includes(semaine.value)}
                                  onCheckedChange={(checked) =>
                                    handleRecurrenceWeekChange(semaine.value, checked as boolean)
                                  }
                                />
                                <Label htmlFor={`semaine-${semaine.value}`} className="text-sm">
                                  {semaine.label}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="heure-debut">Heure de début</Label>
                            <Input
                              id="heure-debut"
                              type="time"
                              value={selectedType.default_heure_debut || ""}
                              onChange={(e) =>
                                setSelectedType({
                                  ...selectedType,
                                  default_heure_debut: e.target.value
                                })
                              }
                            />
                          </div>
                          <div>
                            <Label htmlFor="heure-fin">Heure de fin</Label>
                            <Input
                              id="heure-fin"
                              type="time"
                              value={selectedType.default_heure_fin || ""}
                              onChange={(e) =>
                                setSelectedType({
                                  ...selectedType,
                                  default_heure_fin: e.target.value
                                })
                              }
                            />
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="auto-create"
                            checked={selectedType.auto_create_slots}
                            onCheckedChange={(checked) =>
                              setSelectedType({
                                ...selectedType,
                                auto_create_slots: checked as boolean
                              })
                            }
                          />
                          <Label htmlFor="auto-create">Créer automatiquement les créneaux</Label>
                        </div>
                      </>
                    )}

                    <Button
                      onClick={() => saveTypeActivite(selectedType)}
                      className="w-full"
                    >
                      Sauvegarder
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="creneaux" className="space-y-4">
            <CreneauxGestion />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Parametrage;