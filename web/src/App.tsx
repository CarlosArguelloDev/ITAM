import React, { useState, useEffect } from 'react';
import { Sidebar, NavView } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './views/DashboardView';
import { AssetsView } from './views/AssetsView';
import { UsersDiagramView } from './views/UsersDiagramView';
import { DepartmentsView } from './views/DepartmentsView';
import { AuditsView } from './views/AuditsView';
import { DiscrepanciesView } from './views/DiscrepanciesView';
import { AlertsView } from './views/AlertsView';
import { DocumentsView } from './views/DocumentsView';
import { ScannerModal } from './components/ScannerModal';
import { api } from './api';
import { AuditCampaign, User } from './types';

const VIEW_TO_PATH: Record<NavView, string> = {
  dashboard: '/',
  assets: '/inventario',
  users: '/colaboradores',
  departments: '/departamentos',
  audits: '/auditorias',
  discrepancies: '/discrepancias',
  alerts: '/alertas',
  documents: '/responsivas',
};

const PATH_TO_VIEW: Record<string, NavView> = {
  '/': 'dashboard',
  '/inventario': 'assets',
  '/colaboradores': 'users',
  '/departamentos': 'departments',
  '/auditorias': 'audits',
  '/discrepancias': 'discrepancies',
  '/alertas': 'alerts',
  '/responsivas': 'documents',
};

const getViewFromPath = (pathname: string): NavView => {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  if (PATH_TO_VIEW[normalized]) return PATH_TO_VIEW[normalized];
  const firstSegment = '/' + normalized.split('/').filter(Boolean)[0];
  return PATH_TO_VIEW[firstSegment] ?? 'dashboard';
};

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<NavView>(() =>
    getViewFromPath(window.location.pathname)
  );
  const [scannerOpen, setScannerOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const navigateTo = (view: NavView) => {
    setCurrentView(view);
    const targetPath = VIEW_TO_PATH[view] || '/';
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ view }, '', targetPath);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentView(getViewFromPath(window.location.pathname));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Datos globales compartidos
  const [campaigns, setCampaigns] = useState<AuditCampaign[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [discrepanciesCount, setDiscrepanciesCount] = useState(0);
  const [alertsCount, setAlertsCount] = useState(0);
  const [pendingResponsivasCount, setPendingResponsivasCount] = useState(0);

  useEffect(() => {
    loadGlobalBadges();
  }, [currentView]);

  const loadGlobalBadges = async () => {
    try {
      const [stats, alerts, allCampaigns, allUsers] = await Promise.all([
        api.getStats().catch(() => null),
        api.getAlerts().catch(() => []),
        api.getCampaigns().catch(() => []),
        api.getUsers({ active: true }).catch(() => []),
      ]);

      if (stats) {
        setDiscrepanciesCount(stats.active_discrepancies);
        setPendingResponsivasCount(stats.pending_responsivas);
      }
      setAlertsCount(alerts.length);
      setCampaigns(allCampaigns);
      setUsers(allUsers);
    } catch (err) {
      console.error('Error cargando datos globales:', err);
    }
  };

  const getHeaderInfo = () => {
    switch (currentView) {
      case 'dashboard':
        return {
          title: 'Panel de Control',
          subtitle: 'Resumen de inventario, sedes en San Juan del Río y movimientos recientes',
        };
      case 'assets':
        return {
          title: 'Inventario de Hardware',
          subtitle: 'Altas, edición, etiquetas Brother y trazabilidad por número de serie',
        };
      case 'users':
        return {
          title: 'Colaboradores y Custodia',
          subtitle: 'Equipos asignados, diagramas jerárquicos y cartas responsivas',
        };
      case 'departments':
        return {
          title: 'Departamentos, Bodegas y Sites',
          subtitle: 'Asignación de infraestructura por área/bodega y diagramas separados por colaborador',
        };
      case 'audits':
        return {
          title: 'Campañas e Historial de Auditorías',
          subtitle: 'Registro formal de auditorías físicas por colaborador y por sede',
        };
      case 'discrepancies':
        return {
          title: 'Centro de Resolución de Discrepancias',
          subtitle: 'Conciliación en 1 clic de diferencias entre el inventario físico y lógico',
        };
      case 'alerts':
        return {
          title: 'Centro de Alertas Preventivas',
          subtitle: 'Garantías por vencer, custodias pendientes y falta de auditoría',
        };
      case 'documents':
        return {
          title: 'Gestor Documental de Responsivas',
          subtitle: 'Control de firmas y actas de entrega-recepción de hardware',
        };
    }
  };

  const activeCampaign = campaigns.find((c) => c.status === 'OPEN');
  const headerInfo = getHeaderInfo();

  return (
    <div className="min-h-screen bg-[#F6F7FB] flex text-slate-800">
      {/* Barra Lateral Izquierda Fija */}
      <Sidebar
        currentView={currentView}
        onNavigate={navigateTo}
        discrepanciesCount={discrepanciesCount}
        alertsCount={alertsCount}
        pendingResponsivasCount={pendingResponsivasCount}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      {/* Contenedor Principal (con margen izquierdo en desktop para respetar el sidebar fijo) */}
      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
        {/* Barra Superior Fija */}
        <Header
          title={headerInfo.title}
          subtitle={headerInfo.subtitle}
          onOpenScanner={() => setScannerOpen(true)}
          onOpenMobileMenu={() => setMobileNavOpen(true)}
        />

        {/* Vista Actual */}
        <main className="flex-1 overflow-y-auto">
          {currentView === 'dashboard' && (
            <DashboardView
              onNavigate={navigateTo}
              onOpenScanner={() => setScannerOpen(true)}
            />
          )}
          {currentView === 'assets' && <AssetsView />}
          {currentView === 'users' && <UsersDiagramView />}
          {currentView === 'departments' && <DepartmentsView />}
          {currentView === 'audits' && <AuditsView />}
          {currentView === 'discrepancies' && (
            <DiscrepanciesView onDiscrepancyResolved={loadGlobalBadges} />
          )}
          {currentView === 'alerts' && <AlertsView />}
          {currentView === 'documents' && <DocumentsView />}
        </main>
      </div>

      {/* Modal de Escáner Global QR / Cámara */}
      {scannerOpen && (
        <ScannerModal
          campaigns={campaigns}
          users={users}
          onClose={() => setScannerOpen(false)}
          onScanCompleted={() => {
            loadGlobalBadges();
          }}
        />
      )}
    </div>
  );
};
export default App;
