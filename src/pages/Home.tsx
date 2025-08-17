import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import StatsCard from '@/components/StatsCard';
import PlanningMensuel from '@/components/PlanningMensuel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Tables } from '@/integrations/supabase/types';
import { formatTime } from '@/lib/timeUtils';

type InscriptionConfirmee = Tables<'inscriptions'> & {
  creneaux: Tables<'creneaux'> & {
    type_activite: Tables<'type_activite'>;
  };
};

type Proclamateur = Tables<'proclamateurs'>;

const MesInscriptionsConfirmees = () => {
  const { user } = useAuth();
  const [inscriptionsConfirmees, setInscriptionsConfirmees] = useState<InscriptionConfirmee[]>([]);
  const [loading, setLoading] = useState(true);
  const [proclamateurData, setProclamateurData] = useState<Proclamateur | null>(null);

  useEffect(() => {
    if (user) {
      loadProclamateurData();
    }
  }, [user]);

  useEffect(() => {
    if (proclamateurData) {
      loadInscriptionsConfirmees();
    }
  }, [proclamateurData]);

  const loadProclamateurData = async () => {
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (profiles) {
        const { data: proclamateurs } = await supabase
          .from('proclamateurs')
          .select('*')
          .eq('profile_id', profiles.id)
          .single();

        setProclamateurData(proclamateurs);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données proclamateur:', error);
    }
  };

  const loadInscriptionsConfirmees = async () => {
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
          )
        `)
        .eq('proclamateur_id', proclamateurData.id)
        .eq('confirme', true)
        .order('date_inscription', { ascending: false });

      if (error) throw error;
      
      // Filtrer les inscriptions pour les créneaux futurs côté client
      const today = new Date().toISOString().split('T')[0];
      const inscriptionsFutures = (data || []).filter(inscription => 
        inscription.creneaux && inscription.creneaux.date_creneau >= today
      );
      
      setInscriptionsConfirmees(inscriptionsFutures);
    } catch (error) {
      console.error('Erreur lors du chargement des inscriptions confirmées:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-4"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (inscriptionsConfirmees.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <p>Aucune inscription confirmée à venir</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {inscriptionsConfirmees.map((inscription) => (
        <div
          key={inscription.id}
          className="p-3 border rounded-lg bg-green-50 border-green-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-foreground">
                {inscription.creneaux?.type_activite?.nom}
              </div>
              <div className="text-sm text-muted-foreground">
                {format(new Date(inscription.creneaux?.date_creneau), 'EEEE d MMMM yyyy', { locale: fr })}
                {' • '}
                {formatTime(inscription.creneaux?.heure_debut)} - {formatTime(inscription.creneaux?.heure_fin)}
              </div>
              {inscription.notes && (
                <div className="text-sm text-muted-foreground mt-1">
                  Notes: {inscription.notes}
                </div>
              )}
            </div>
            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
              Confirmée
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
};

const MesInscriptionsEnAttente = () => {
  const { user } = useAuth();
  const [inscriptionsEnAttente, setInscriptionsEnAttente] = useState<InscriptionConfirmee[]>([]);
  const [loading, setLoading] = useState(true);
  const [proclamateurData, setProclamateurData] = useState<Proclamateur | null>(null);

  useEffect(() => {
    if (user) {
      loadProclamateurData();
    }
  }, [user]);

  useEffect(() => {
    if (proclamateurData) {
      loadInscriptionsEnAttente();
    }
  }, [proclamateurData]);

  const loadProclamateurData = async () => {
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (profiles) {
        const { data: proclamateurs } = await supabase
          .from('proclamateurs')
          .select('*')
          .eq('profile_id', profiles.id)
          .single();

        setProclamateurData(proclamateurs);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données proclamateur:', error);
    }
  };

  const loadInscriptionsEnAttente = async () => {
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
          )
        `)
        .eq('proclamateur_id', proclamateurData.id)
        .eq('confirme', false)
        .order('date_inscription', { ascending: false });

      if (error) throw error;
      setInscriptionsEnAttente(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des inscriptions en attente:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-4"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (inscriptionsEnAttente.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <p>Aucune inscription en attente</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {inscriptionsEnAttente.map((inscription) => (
        <div
          key={inscription.id}
          className="p-3 border rounded-lg bg-yellow-50 border-yellow-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-foreground">
                {inscription.creneaux?.type_activite?.nom}
              </div>
              <div className="text-sm text-muted-foreground">
                {format(new Date(inscription.creneaux?.date_creneau), 'EEEE d MMMM yyyy', { locale: fr })}
                {' • '}
                {formatTime(inscription.creneaux?.heure_debut)} - {formatTime(inscription.creneaux?.heure_fin)}
              </div>
              {inscription.notes && (
                <div className="text-sm text-muted-foreground mt-1">
                  Notes: {inscription.notes}
                </div>
              )}
            </div>
            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
              En attente
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
};

const Home = () => {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [stats, setStats] = useState({
    totalRapports: 0,
    conversationsTotal: 0,
    videosTotal: 0,
    publicationsTotal: 0,
    inscriptionsEnAttente: 0
  });

  useEffect(() => {
    calculateStats();
  }, [selectedMonth]);

  const calculateStats = async () => {
    try {
      // Filtrer par mois sélectionné
      const [year, month] = selectedMonth.split('-').map(Number);
      
      // Charger les rapports depuis Supabase
      const { data: rapports } = await supabase
        .from('rapports')
        .select('*')
        .eq('annee', year)
        .eq('mois', month);
      
      // Charger les inscriptions en attente depuis Supabase
      const { data: inscriptions } = await supabase
        .from('inscriptions')
        .select('*')
        .eq('confirme', false);
      
      const rapportsMois = rapports || [];
      const inscriptionsEnAttente = inscriptions?.length || 0;
    
      setStats({
        totalRapports: rapportsMois.length,
        conversationsTotal: rapportsMois.reduce((sum: number, r: Tables<'rapports'>) => sum + (r.etudes_bibliques || 0), 0),
        videosTotal: rapportsMois.reduce((sum: number, r: Tables<'rapports'>) => sum + (r.videos || 0), 0),
        publicationsTotal: rapportsMois.reduce((sum: number, r: Tables<'rapports'>) => 
          sum + (r.placements || 0), 0
        ),
        inscriptionsEnAttente
      });
    } catch (error) {
      console.error('Erreur lors du calcul des statistiques:', error);
      setStats({
        totalRapports: 0,
        conversationsTotal: 0,
        videosTotal: 0,
        publicationsTotal: 0,
        inscriptionsEnAttente: 0
      });
    }
  };

  const generateMonthOptions = () => {
    const options = [];
    const currentDate = new Date();
    
    for (let i = -6; i <= 6; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      options.push({ value, label });
    }
    
    return options;
  };

  return (
    <Layout title="Tableau de bord">
      {/* Section de bienvenue */}
      <div className="mb-6">
        <Card className="gradient-card shadow-soft border-border/50">
          <CardContent className="p-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Bienvenue dans l'application de gestion
              </h2>
              <p className="text-muted-foreground">
                Gérez efficacement vos activités de diffusion sur le marché local
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section Statistiques et Actions rapides */}
      <div className="mb-6 space-y-4">
        {/* Actions rapides */}
        <Card className="gradient-card shadow-soft border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <span className="text-xl">🚀</span>
              Actions rapides
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Link to="/inscription">
              <Button variant="secondary" className="flex items-center gap-2">
                <span className="text-lg">📅</span>
                Inscription créneaux
              </Button>
            </Link>
            <Link to="/rapport">
              <Button className="flex items-center gap-2">
                <span className="text-lg">📝</span>
                Nouveau rapport
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Accordéon Statistiques */}
        <Accordion type="single" collapsible>
          <AccordionItem value="stats" className="border rounded-lg gradient-card shadow-soft border-border/50">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex items-center gap-3">
                <span className="text-lg">📊</span>
                <span className="font-medium">Voir les chiffres du mois</span>
              </div>
            </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="flex items-center gap-4 mb-4">
              <span className="text-sm font-medium">Statistiques pour:</span>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {generateMonthOptions().map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard
                title="Rapports ce mois"
                value={stats.totalRapports}
                icon={<span className="text-lg">📊</span>}
                color="primary"
                trend={`${new Date(selectedMonth + '-01').toLocaleDateString('fr-FR', { month: 'long' })}`}
              />
              <StatsCard
                title="Conversations"
                value={stats.conversationsTotal}
                icon={<span className="text-lg">💬</span>}
                color="secondary"
                trend={`${new Date(selectedMonth + '-01').toLocaleDateString('fr-FR', { month: 'long' })}`}
              />
              <StatsCard
                title="Vidéos montrées"
                value={stats.videosTotal}
                icon={<span className="text-lg">🎥</span>}
                color="accent"
                trend={`${new Date(selectedMonth + '-01').toLocaleDateString('fr-FR', { month: 'long' })}`}
              />
              <StatsCard
                title="Publications"
                value={stats.publicationsTotal}
                icon={<span className="text-lg">📚</span>}
                color="success"
                trend="Distribuées"
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      </div>

      {/* Layout principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Planning mensuel - 2 colonnes */}
        <div className="lg:col-span-2">
          <PlanningMensuel selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />
        </div>

        {/* Colonne droite - Inscriptions et actions rapides */}
        <div className="space-y-4">
          {/* Mes inscriptions confirmées */}
          {user && (
            <Card className="gradient-card shadow-soft border-border/50 border-l-4 border-l-success">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <span className="text-xl">✅</span>
                  Mes inscriptions confirmées
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MesInscriptionsConfirmees />
              </CardContent>
            </Card>
          )}

          {/* Mes inscriptions en attente */}
          {user && (
            <Card className="gradient-card shadow-soft border-border/50 border-l-4 border-l-warning">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <span className="text-xl">⏳</span>
                  Mes inscriptions en attente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MesInscriptionsEnAttente />
              </CardContent>
            </Card>
          )}

        </div>
      </div>

      {/* Alertes et notifications */}
      {stats.inscriptionsEnAttente > 0 && (
        <Card className="gradient-card shadow-soft border-border/50 border-l-4 border-l-warning">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="font-semibold text-foreground">
                  Inscriptions en attente
                </h3>
                <p className="text-muted-foreground">
                  {stats.inscriptionsEnAttente} inscription(s) en attente de validation
                </p>
              </div>
              <Link to="/admin" className="ml-auto">
                <Button size="sm" variant="outline">
                  Voir
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </Layout>
  );
};

export default Home;