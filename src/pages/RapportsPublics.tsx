import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PublicReport {
  id: string;
  mois: number;
  annee: number;
  heures_predication: number;
  placements: number;
  videos: number;
  etudes_bibliques: number;
  notes: string;
  date_approbation: string;
  proclamateurs: {
    profiles: {
      nom: string;
      prenom: string;
    } | null;
  } | null;
}

const RapportsPublics = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<PublicReport[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPublicReports();
  }, [selectedMonth, selectedYear]);

  const loadPublicReports = async () => {
    try {
      let query = supabase
        .from('rapports')
        .select(`
          *,
          proclamateurs(
            profiles(nom, prenom)
          )
        `)
        .eq('visible_publiquement', true)
        .eq('approuve', true)
        .order('annee', { ascending: false })
        .order('mois', { ascending: false });

      if (selectedYear) {
        query = query.eq('annee', parseInt(selectedYear));
      }

      if (selectedMonth) {
        query = query.eq('mois', parseInt(selectedMonth));
      }

      const { data, error } = await query;

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des rapports publics:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear; i >= currentYear - 3; i--) {
      years.push(i.toString());
    }
    return years;
  };

  const getMonthName = (month: number) => {
    const date = new Date(2024, month - 1, 1);
    return date.toLocaleDateString('fr-FR', { month: 'long' });
  };

  const calculateTotals = () => {
    return {
      totalHeures: reports.reduce((sum, r) => sum + (r.heures_predication || 0), 0),
      totalPlacements: reports.reduce((sum, r) => sum + (r.placements || 0), 0),
      totalVideos: reports.reduce((sum, r) => sum + (r.videos || 0), 0),
      totalEtudes: reports.reduce((sum, r) => sum + (r.etudes_bibliques || 0), 0),
    };
  };

  const totals = calculateTotals();

  return (
    <Layout title="Rapports publics">
      <div className="space-y-6">
        {/* Filtres */}
        <Card className="gradient-card shadow-soft border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-xl">🔍</span>
              Filtres
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Année</label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger>
                    <SelectValue placeholder="Toutes les années" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Toutes les années</SelectItem>
                    {generateYearOptions().map(year => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Mois</label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les mois" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tous les mois</SelectItem>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                      <SelectItem key={month} value={month.toString()}>
                        {getMonthName(month)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistiques globales */}
        {reports.length > 0 && (
          <Card className="gradient-card shadow-soft border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-xl">📊</span>
                Totaux {selectedMonth && selectedYear ? `pour ${getMonthName(parseInt(selectedMonth))} ${selectedYear}` : 
                        selectedYear ? `pour ${selectedYear}` : 'globaux'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-primary/10 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{totals.totalHeures}</div>
                  <div className="text-sm text-muted-foreground">Heures</div>
                </div>
                <div className="text-center p-3 bg-secondary/10 rounded-lg">
                  <div className="text-2xl font-bold text-secondary">{totals.totalPlacements}</div>
                  <div className="text-sm text-muted-foreground">Placements</div>
                </div>
                <div className="text-center p-3 bg-accent/10 rounded-lg">
                  <div className="text-2xl font-bold text-accent">{totals.totalVideos}</div>
                  <div className="text-sm text-muted-foreground">Vidéos</div>
                </div>
                <div className="text-center p-3 bg-success/10 rounded-lg">
                  <div className="text-2xl font-bold text-success">{totals.totalEtudes}</div>
                  <div className="text-sm text-muted-foreground">Études</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Liste des rapports */}
        <Card className="gradient-card shadow-soft border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-xl">📋</span>
              Rapports d'activité publics ({reports.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : reports.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Aucun rapport public disponible pour cette période
              </p>
            ) : (
              <div className="space-y-4">
                {reports.map((report) => (
                  <div key={report.id} className="border border-border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {report.proclamateurs?.profiles?.prenom} {report.proclamateurs?.profiles?.nom}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {getMonthName(report.mois)} {report.annee}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Approuvé le {format(new Date(report.date_approbation), 'dd/MM/yyyy', { locale: fr })}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-success border-success">
                        Publié
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="text-center p-2 bg-muted/10 rounded">
                        <div className="font-semibold text-primary">{report.heures_predication || 0}</div>
                        <div className="text-muted-foreground">Heures</div>
                      </div>
                      <div className="text-center p-2 bg-muted/10 rounded">
                        <div className="font-semibold text-secondary">{report.placements || 0}</div>
                        <div className="text-muted-foreground">Placements</div>
                      </div>
                      <div className="text-center p-2 bg-muted/10 rounded">
                        <div className="font-semibold text-accent">{report.videos || 0}</div>
                        <div className="text-muted-foreground">Vidéos</div>
                      </div>
                      <div className="text-center p-2 bg-muted/10 rounded">
                        <div className="font-semibold text-success">{report.etudes_bibliques || 0}</div>
                        <div className="text-muted-foreground">Études</div>
                      </div>
                    </div>
                    
                    {report.notes && (
                      <div className="pt-2 border-t border-border/50">
                        <h4 className="text-sm font-medium text-foreground mb-1">Notes:</h4>
                        <p className="text-sm text-muted-foreground">{report.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default RapportsPublics;