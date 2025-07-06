import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface LayoutProps {
  children: ReactNode;
  title?: string;
}

const Layout = ({ children, title }: LayoutProps) => {
  const location = useLocation();

  const navigationItems = [
    { path: '/', label: 'Accueil', icon: '🏠' },
    { path: '/rapport', label: 'Rapport', icon: '📝' },
    { path: '/inscription', label: 'Inscription', icon: '📅' },
    { path: '/admin', label: 'Admin', icon: '👨‍💼' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-primary-light/20">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b border-border shadow-soft sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">📚</span>
              </div>
              <div>
                <h1 className="font-bold text-xl text-foreground">Diffusion Publications</h1>
                <p className="text-sm text-muted-foreground">Gestion marché local</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {title && (
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground mb-2">{title}</h2>
          </div>
        )}
        {children}
      </main>

      {/* Navigation mobile */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border shadow-strong z-50">
        <div className="flex justify-around items-center py-2">
          {navigationItems.map((item) => (
            <Link key={item.path} to={item.path}>
              <Button
                variant={location.pathname === item.path ? "default" : "ghost"}
                size="sm"
                className="flex-col h-auto py-2 px-3 gap-1"
              >
                <span className="text-lg">{item.icon}</span>
                <span className="text-xs">{item.label}</span>
              </Button>
            </Link>
          ))}
        </div>
      </nav>

      {/* Padding pour la navigation mobile */}
      <div className="h-20"></div>
    </div>
  );
};

export default Layout;