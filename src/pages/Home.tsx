import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import StatsCard from '@/components/StatsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ConfirmedInscription {
  id: string;
  creneaux: {
    date_creneau: string;
    heure_debut: string;
    heure_fin: string;
    type_activite: {
      nom: string;
    } | null;
  } | null;
}

const Home = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [confirmedInscriptions, setConfirmedInscriptions] = useState<ConfirmedInscription[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [pendingInscriptions, setPendingInscriptions] = useState<any[]>([]);
  const [userReports, setUserReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadUserData();
      loadConfirmedInscriptions();
      loadNotifications();
    }
  }, [user]);

  const loadUserData = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      setUserProfile(profile);

      if (profile) {
        const { data: proclamateur } = await supabase
          .from('proclamateurs')
          .select('id')
          .eq('profile_id', profile.id)
          .single();

        if (proclamateur) {
          // Load pending inscriptions
          const { data: pending } = await supabase
            .from('inscriptions')
            .select('*')
            .eq('proclamateur_id', proclamateur.id)
            .in('statut', ['en_attente', 'provisoire']);

          setPendingInscriptions(pending || []);

          // Load user reports (from localStorage for now)
          const savedReports = JSON.parse(localStorage.getItem('rapports') || '[]');
          setUserReports(savedReports);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données utilisateur:', error);
    }
    setLoading(false);
  };

  const loadConfirmedInscriptions = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) return;

      const { data: proclamateur } = await supabase
        .from('proclamateurs')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      if (!proclamateur) return;

      const { data, error } = await supabase
        .from('inscriptions')
        .select(`
          id,
          creneaux(
            date_creneau,
            heure_debut,
            heure_fin,
            type_activite(nom)
          )
        `)
        .eq('proclamateur_id', proclamateur.id)
        .eq('statut', 'confirme')
        .gte('creneaux.date_creneau', new Date().toISOString().split('T')[0])
        .order('creneaux.date_creneau', { ascending: true })
        .limit(5);

      if (error) throw error;
      setConfirmedInscriptions(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des inscriptions confirmées:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user?.id)
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des notifications:', error);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);
      
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Erreur lors du marquage de la notification:', error);
    }
  };

  if (loading) {
    return (
      <Layout title="Accueil">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Chargement...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Accueil">
      <div className="space-y-6">
        {/* Notifications */}
        {notifications.length > 0 && (
          <Card className="gradient-card shadow-soft border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-xl">🔔</span>
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {notifications.map((notification) => (
                  <div key={notification.id} className="flex items-start justify-between p-3 bg-muted/20 rounded-lg">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-foreground">{notification.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(notification.created_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => markNotificationAsRead(notification.id)}
                      className="text-xs"
                    >
                      Marquer comme lu
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tuile Inscription */}
          <Card 
            className="gradient-card shadow-soft border-border/50 cursor-pointer hover:shadow-lg transition-all duration-300 aspect-square flex items-center justify-center"
            onClick={() => navigate('/inscription')}
          >
            <CardContent className="p-6 text-center">
              <div className="text-4xl mb-4">📝</div>
              <Button size="lg" className="w-full">
                S'inscrire à un créneau
              </Button>
            </CardContent>
          </Card>

          {/* Tuile Rapport */}
          <Card 
            className="gradient-card shadow-soft border-border/50 cursor-pointer hover:shadow-lg transition-all duration-300 aspect-square flex items-center justify-center"
            onClick={() => navigate('/rapport')}
          >
            <CardContent className="p-6 text-center">
              <div className="text-4xl mb-4">📊</div>
              <Button size="lg" className="w-full">
                Nouveau rapport
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Mes inscriptions confirmées */}
        {confirmedInscriptions.length > 0 && (
          <Card className="gradient-card shadow-soft border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-xl">✅</span>
                Mes inscriptions confirmées
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {confirmedInscriptions.map((inscription) => (
                  <div key={inscription.id} className="flex items-center justify-between p-3 bg-success/10 border border-success/20 rounded-lg">
                    <div>
                      <h4 className="font-medium text-foreground">
                        {inscription.creneaux?.type_activite?.nom || 'Activité inconnue'}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {inscription.creneaux?.date_creneau ? 
                          format(new Date(inscription.creneaux.date_creneau), 'EEEE dd MMMM yyyy', { locale: fr }) : 
                          'Date inconnue'
                        }
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {inscription.creneaux?.heure_debut} - {inscription.creneaux?.heure_fin}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-success border-success">
                      Confirmée
                    </Badge>
                  </div>
                ))}
              </div>
              <Button 
                variant="outline" 
                className="w-full mt-4"
                onClick={() => navigate('/inscription')}
              >
                Voir toutes mes inscriptions
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Statistiques */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="En attente"
            value={pendingInscriptions.length}
            icon={<span className="text-lg">⏳</span>}
            color="warning"
          />
          <StatsCard
            title="Confirmées"
            value={confirmedInscriptions.length}
            icon={<span className="text-lg">✅</span>}
            color="success"
          />
          <StatsCard
            title="Rapports"
            value={userReports.length}
            icon={<span className="text-lg">📊</span>}
            color="primary"
          />
          <StatsCard
            title="Notifications"
            value={notifications.length}
            icon={<span className="text-lg">🔔</span>}
            color="secondary"
          />
        </div>

        {/* Liens rapides */}
        <Card className="gradient-card shadow-soft border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-xl">🔗</span>
              Liens rapides
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button 
                variant="outline" 
                onClick={() => navigate('/planning')}
                className="h-auto p-4 flex flex-col items-center gap-2"
              >
                <span className="text-2xl">📅</span>
                <span>Planning mensuel</span>
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate('/rapports-publics')}
                className="h-auto p-4 flex flex-col items-center gap-2"
              >
                <span className="text-2xl">📊</span>
                <span>Rapports publics</span>
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate('/profil')}
                className="h-auto p-4 flex flex-col items-center gap-2"
              >
                <span className="text-2xl">👤</span>
                <span>Mon profil</span>
              </Button>
              {userProfile?.role === 'admin' && (
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/admin')}
                  className="h-auto p-4 flex flex-col items-center gap-2"
                >
                  <span className="text-2xl">⚙️</span>
                  <span>Administration</span>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Home;