import Layout from '@/components/Layout';
import StatsCard from '@/components/StatsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const Home = () => {
  // Données simulées pour les statistiques
  const stats = {
    totalRapports: 24,
    conversationsTotal: 156,
    videosTotal: 89,
    publicationsTotal: 234,
    inscriptionsEnAttente: 3
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

      {/* Statistiques générales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard
          title="Rapports ce mois"
          value={stats.totalRapports}
          icon={<span className="text-lg">📊</span>}
          color="primary"
          trend="Ce mois"
        />
        <StatsCard
          title="Conversations"
          value={stats.conversationsTotal}
          icon={<span className="text-lg">💬</span>}
          color="secondary"
          trend="Total"
        />
        <StatsCard
          title="Vidéos montrées"
          value={stats.videosTotal}
          icon={<span className="text-lg">🎥</span>}
          color="accent"
          trend="Total"
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