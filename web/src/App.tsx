import React, { useState, useEffect } from 'react';
import { Sidebar, NavView } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './views/DashboardView';
import { AssetsView } from './views/AssetsView';
import { UsersDiagramView } from './views/UsersDiagramView';
import { DiscrepanciesView } from './views/DiscrepanciesView';
import { AlertsView } from './views/AlertsView';
import { DocumentsView } from './views/DocumentsView';
import { ScannerModal } from './components/ScannerModal';
import { api } from './api';
import { AuditCampaign, User } from './types';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<NavView>('dashboard');
  const [scannerOpen, setScannerOpen] = useState(false);

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
          title: 'Dashboard de Activos',
          subtitle: 'Visión general de infraestructura de TI y métricas operativas',
        };
      case 'assets':
        return {
          title: 'Inventario de Activos (Hardware)',
          subtitle: 'Altas, bajas, especificaciones técnicas y rotulación QR',
        };
      case 'users':
        return {
          title: 'Users & Diagrams (Custodia de Hardware)',
          subtitle: 'Árbol interactivo de asignación de equipos por colaborador',
        };
      case 'discrepancies':
        return {
          title: 'Conciliación de Inventario Físico vs. Lógico',
          subtitle: 'Campañas de barrido físico y resolución de discrepancias en 1 clic',
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
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-800">
      {/* Barra Lateral Izquierda Fija */}
      <Sidebar
        currentView={currentView}
        onNavigate={(v) => setCurrentView(v)}
        discrepanciesCount={discrepanciesCount}
        alertsCount={alertsCount}
        pendingResponsivasCount={pendingResponsivasCount}
      />

      {/* Contenedor Principal (con margen izquierdo para respetar el sidebar fijo) */}
      <div className="flex-1 ml-64 flex flex-col min-w-0">
        {/* Barra Superior Fija */}
        <Header
          title={headerInfo.title}
          subtitle={headerInfo.subtitle}
          onOpenScanner={() => setScannerOpen(true)}
        />

        {/* Vista Actual */}
        <main className="flex-1 overflow-y-auto">
          {currentView === 'dashboard' && (
            <DashboardView
              onNavigate={(v) => setCurrentView(v)}
              onOpenScanner={() => setScannerOpen(true)}
            />
          )}
          {currentView === 'assets' && <AssetsView />}
          {currentView === 'users' && <UsersDiagramView />}
          {currentView === 'discrepancies' && (
            <DiscrepanciesView onOpenScanner={() => setScannerOpen(true)} />
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
