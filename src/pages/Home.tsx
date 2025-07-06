import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import StatsCard from '@/components/StatsCard';
import PlanningMensuel from '@/components/PlanningMensuel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link } from 'react-router-dom';

const Home = () => {
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

  const calculateStats = () => {
    const rapports = JSON.parse(localStorage.getItem('rapports') || '[]');
    const inscriptions = JSON.parse(localStorage.getItem('inscriptions') || '[]');
    
    // Filtrer par mois sélectionné
    const [year, month] = selectedMonth.split('-').map(Number);
    
    const rapportsMois = rapports.filter((r: any) => {
      const rapportDate = new Date(r.date);
      return rapportDate.getFullYear() === year && rapportDate.getMonth() === month - 1;
    });
    
    const inscriptionsEnAttente = inscriptions.filter((i: any) => i.statut === 'en_attente').length;
    
    setStats({
      totalRapports: rapportsMois.length,
      conversationsTotal: rapportsMois.reduce((sum: number, r: any) => sum + parseInt(r.conversations || '0'), 0),
      videosTotal: rapportsMois.reduce((sum: number, r: any) => sum + parseInt(r.videos || '0'), 0),
      publicationsTotal: rapportsMois.reduce((sum: number, r: any) => 
        sum + parseInt(r.revues || '0') + parseInt(r.brochures || '0') + parseInt(r.tracts || '0'), 0
      ),
      inscriptionsEnAttente
    });
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

      {/* Sélecteur de mois */}
      <Card className="gradient-card shadow-soft border-border/50 mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
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
        </CardContent>
      </Card>

      {/* Statistiques mensuelles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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

      {/* Actions rapides */}
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <Card className="gradient-card shadow-soft border-border/50 hover:shadow-medium transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <span className="text-xl">📝</span>
              Nouveau rapport
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Saisissez un nouveau rapport d'activité de diffusion
            </p>
            <Link to="/rapport">
              <Button className="w-full">
                Créer un rapport
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="gradient-card shadow-soft border-border/50 hover:shadow-medium transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <span className="text-xl">📅</span>
              Inscription créneaux
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Inscrivez-vous aux créneaux de diffusion disponibles
            </p>
            <Link to="/inscription">
              <Button variant="secondary" className="w-full">
                S'inscrire
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Planning mensuel */}
      <div className="mb-6">
        <PlanningMensuel selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />
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