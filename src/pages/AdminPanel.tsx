import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import StatsCard from '@/components/StatsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

interface Inscription {
  id: number;
  nom: string;
  sexe: string;
  date: string;
  creneau: string;
  type: string;
  statut: 'en_attente' | 'valide' | 'refuse';
  createdAt: string;
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
  const [inscriptions, setInscriptions] = useState<Inscription[]>([]);
  const [rapports, setRapports] = useState<Rapport[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');

  // Authentification simple (mot de passe: admin123)
  const handleAuth = () => {
    if (password === 'admin123') {
      setIsAuthenticated(true);
      loadData();
    } else {
      toast({
        title: "Erreur",
        description: "Mot de passe incorrect",
        variant: "destructive"
      });
    }
  };

  const loadData = () => {
    const savedInscriptions = JSON.parse(localStorage.getItem('inscriptions') || '[]');
    const savedRapports = JSON.parse(localStorage.getItem('rapports') || '[]');
    setInscriptions(savedInscriptions);
    setRapports(savedRapports);
  };

  const updateInscriptionStatus = (id: number, statut: 'valide' | 'refuse') => {
    const updatedInscriptions = inscriptions.map(ins => 
      ins.id === id ? { ...ins, statut } : ins
    );
    setInscriptions(updatedInscriptions);
    localStorage.setItem('inscriptions', JSON.stringify(updatedInscriptions));
    
    toast({
      title: "Succès",
      description: `Inscription ${statut === 'valide' ? 'validée' : 'refusée'}`,
    });
  };

  // Calcul des statistiques
  const stats = {
    inscriptionsEnAttente: inscriptions.filter(i => i.statut === 'en_attente').length,
    inscriptionsValidees: inscriptions.filter(i => i.statut === 'valide').length,
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

  if (!isAuthenticated) {
    return (
      <Layout title="Administration">
        <div className="max-w-md mx-auto">
          <Card className="gradient-card shadow-soft border-border/50">
            <CardHeader>
              <CardTitle className="text-center">🔐 Accès Administration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Mot de passe</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Entrez le mot de passe"
                  onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
                />
              </div>
              <Button onClick={handleAuth} className="w-full">
                Se connecter
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Mot de passe de démonstration: admin123
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
                {inscriptions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Aucune inscription</p>
                ) : (
                  inscriptions.map((inscription) => (
                    <div key={inscription.id} className="border border-border rounded-lg p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-foreground">{inscription.nom}</h3>
                          <p className="text-sm text-muted-foreground">
                            {inscription.sexe} • {inscription.type}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(inscription.date).toLocaleDateString('fr-FR')} • {inscription.creneau}
                          </p>
                        </div>
                        <Badge variant={
                          inscription.statut === 'valide' ? 'default' :
                          inscription.statut === 'refuse' ? 'destructive' : 'secondary'
                        }>
                          {inscription.statut === 'en_attente' ? 'En attente' :
                           inscription.statut === 'valide' ? 'Validée' : 'Refusée'}
                        </Badge>
                      </div>
                      
                      {inscription.statut === 'en_attente' && (
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            onClick={() => updateInscriptionStatus(inscription.id, 'valide')}
                          >
                            Valider
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => updateInscriptionStatus(inscription.id, 'refuse')}
                          >
                            Refuser
                          </Button>
                        </div>
                      )}
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

      {/* Bouton de déconnexion */}
      <div className="pt-6">
        <Button 
          variant="outline" 
          onClick={() => setIsAuthenticated(false)}
          className="w-full"
        >
          Se déconnecter
        </Button>
      </div>
    </Layout>
  );
};

export default AdminPanel;