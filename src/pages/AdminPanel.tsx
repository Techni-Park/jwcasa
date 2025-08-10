import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import StatsCard from '@/components/StatsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PendingInscription {
  id: string;
  creneau_id: string;
  proclamateur_id: string;
  date_inscription: string;
  confirme: boolean;
  notes: string | null;
  creneaux: {
    date_creneau: string;
    heure_debut: string;
    heure_fin: string;
    type_activite: {
      nom: string;
    } | null;
  } | null;
  proclamateurs: {
    profiles: {
      nom: string;
      prenom: string;
    } | null;
  } | null;
}

interface Rapport {
  id: number;
  date: string;
  creneau: string;
  representant: string;
  conversations: string;
  videos: string;
  revues: string;
  brochures: string;
  tracts: string;
  temoignages: string;
  commentaires: string;
  createdAt: string;
}

const AdminPanel = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [pendingInscriptions, setPendingInscriptions] = useState<PendingInscription[]>([]);
  const [rapports, setRapports] = useState<Rapport[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      checkUserRole();
    }
  }, [user]);

  useEffect(() => {
    if (userRole === 'admin') {
      loadPendingInscriptions();
      loadReports();
    }
  }, [userRole]);

  const checkUserRole = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user?.id)
        .single();

      if (profile) {
        setUserRole(profile.role);
      }
    } catch (error) {
      console.error('Erreur lors de la vérification du rôle:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPendingInscriptions = async () => {
    try {
      const { data, error } = await supabase
        .from('inscriptions')
        .select(`
          *,
          creneaux(
            date_creneau,
            heure_debut,
            heure_fin,
            type_activite(nom)
          ),
          proclamateurs(
            profiles(nom, prenom)
          )
        `)
        .eq('confirme', false)
        .order('date_inscription', { ascending: false });

      if (error) throw error;
      setPendingInscriptions(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des inscriptions:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les inscriptions en attente",
        variant: "destructive"
      });
    }
  };

  const loadReports = async () => {
    // Keep existing localStorage logic for now
    const savedRapports = JSON.parse(localStorage.getItem('rapports') || '[]');
    setRapports(savedRapports);
  };

  const approveInscription = async (inscriptionId: string) => {
    try {
      const { error } = await supabase
        .from('inscriptions')
        .update({ confirme: true })
        .eq('id', inscriptionId);

      if (error) throw error;

      // Refresh the list
      loadPendingInscriptions();
      
      toast({
        title: "Succès",
        description: "Inscription approuvée avec succès",
      });
    } catch (error) {
      console.error('Erreur lors de l\'approbation:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'approuver l'inscription",
        variant: "destructive"
      });
    }
  };

  const rejectInscription = async (inscriptionId: string) => {
    try {
      const { error } = await supabase
        .from('inscriptions')
        .delete()
        .eq('id', inscriptionId);

      if (error) throw error;

      // Refresh the list
      loadPendingInscriptions();
      
      toast({
        title: "Succès",
        description: "Inscription refusée",
      });
    } catch (error) {
      console.error('Erreur lors du refus:', error);
      toast({
        title: "Erreur",
        description: "Impossible de refuser l'inscription",
        variant: "destructive"
      });
    }
  };

  // Calcul des statistiques
  const stats = {
    inscriptionsEnAttente: pendingInscriptions.length,
    inscriptionsValidees: 0, // TODO: Calculate confirmed inscriptions
    rapportsMois: rapports.filter(r => {
      const rapportDate = new Date(r.date);
      const now = new Date();
      return rapportDate.getMonth() === now.getMonth() && 
             rapportDate.getFullYear() === now.getFullYear();
    }).length,
    totalConversations: rapports.reduce((sum, r) => sum + parseInt(r.conversations || '0'), 0),
    totalVideos: rapports.reduce((sum, r) => sum + parseInt(r.videos || '0'), 0),
    totalPublications: rapports.reduce((sum, r) => 
      sum + parseInt(r.revues || '0') + parseInt(r.brochures || '0') + parseInt(r.tracts || '0'), 0
    )
  };

  if (loading) {
    return (
      <Layout title="Administration">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Chargement...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!user || userRole !== 'admin') {
    return (
      <Layout title="Administration">
        <div className="max-w-md mx-auto">
          <Card className="gradient-card shadow-soft border-border/50">
            <CardHeader>
              <CardTitle className="text-center">🔐 Accès non autorisé</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground">
                Vous devez être administrateur pour accéder à cette page.
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Administration">
      {/* Statistiques */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard
          title="En attente"
          value={stats.inscriptionsEnAttente}
          icon={<span className="text-lg">⏳</span>}
          color="warning"
        />
        <StatsCard
          title="Validées"
          value={stats.inscriptionsValidees}
          icon={<span className="text-lg">✅</span>}
          color="success"
        />
        <StatsCard
          title="Rapports mois"
          value={stats.rapportsMois}
          icon={<span className="text-lg">📊</span>}
          color="primary"
        />
        <StatsCard
          title="Total conversations"
          value={stats.totalConversations}
          icon={<span className="text-lg">💬</span>}
          color="secondary"
        />
      </div>

      <Tabs defaultValue="inscriptions" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="inscriptions">Inscriptions</TabsTrigger>
          <TabsTrigger value="rapports">Rapports</TabsTrigger>
        </TabsList>

        {/* Gestion des inscriptions */}
        <TabsContent value="inscriptions">
          <Card className="gradient-card shadow-soft border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-xl">📝</span>
                Gestion des inscriptions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingInscriptions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Aucune inscription en attente</p>
                ) : (
                  pendingInscriptions.map((inscription) => (
                    <div key={inscription.id} className="border border-border rounded-lg p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-foreground">
                            {inscription.proclamateurs?.profiles?.prenom} {inscription.proclamateurs?.profiles?.nom}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Type: {inscription.creneaux?.type_activite?.nom || 'Non spécifié'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Date: {inscription.creneaux?.date_creneau ? 
                              format(new Date(inscription.creneaux.date_creneau), 'dd/MM/yyyy', { locale: fr }) : 
                              'Non spécifiée'
                            }
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Heure: {inscription.creneaux?.heure_debut || 'Non spécifiée'} - {inscription.creneaux?.heure_fin || 'Non spécifiée'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Inscription le: {format(new Date(inscription.date_inscription), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                          </p>
                          {inscription.notes && (
                            <p className="text-sm text-muted-foreground mt-2">
                              <strong>Notes:</strong> {inscription.notes}
                            </p>
                          )}
                        </div>
                        <Badge variant="secondary">
                          En attente
                        </Badge>
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          onClick={() => approveInscription(inscription.id)}
                        >
                          Approuver
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => rejectInscription(inscription.id)}
                        >
                          Refuser
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Consultation des rapports */}
        <TabsContent value="rapports">
          <Card className="gradient-card shadow-soft border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-xl">📊</span>
                Rapports d'activité
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {rapports.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Aucun rapport</p>
                ) : (
                  rapports.map((rapport) => (
                    <div key={rapport.id} className="border border-border rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-foreground">{rapport.representant}</h3>
                          <p className="text-sm text-muted-foreground">
                            {new Date(rapport.date).toLocaleDateString('fr-FR')} • {rapport.creneau}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {new Date(rapport.date).toLocaleDateString('fr-FR')}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                        <div className="text-center">
                          <div className="font-semibold text-primary">{rapport.conversations || 0}</div>
                          <div className="text-muted-foreground">Conversations</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-secondary">{rapport.videos || 0}</div>
                          <div className="text-muted-foreground">Vidéos</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-accent">{rapport.revues || 0}</div>
                          <div className="text-muted-foreground">Revues</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-success">{rapport.brochures || 0}</div>
                          <div className="text-muted-foreground">Brochures</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-warning">{rapport.tracts || 0}</div>
                          <div className="text-muted-foreground">Tracts</div>
                        </div>
                      </div>
                      
                      {(rapport.temoignages || rapport.commentaires) && (
                        <div className="pt-2 border-t border-border/50">
                          {rapport.temoignages && (
                            <div className="mb-2">
                              <h4 className="text-sm font-medium text-foreground">Témoignages:</h4>
                              <p className="text-sm text-muted-foreground">{rapport.temoignages}</p>
                            </div>
                          )}
                          {rapport.commentaires && (
                            <div>
                              <h4 className="text-sm font-medium text-foreground">Commentaires:</h4>
                              <p className="text-sm text-muted-foreground">{rapport.commentaires}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Navigation */}
      <div className="pt-6">
        <Button 
          variant="outline" 
          onClick={() => window.location.href = '/'}
          className="w-full"
        >
          Retour à l'accueil
        </Button>
      </div>
    </Layout>
  );
};

export default AdminPanel;