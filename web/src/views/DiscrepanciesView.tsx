import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Plus,
  QrCode,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  FolderLock,
  CheckCheck,
  HelpCircle,
  XCircle,
} from 'lucide-react';
import { AuditCampaign, AuditScan, DiscrepancyType } from '../types';
import { api } from '../api';

interface DiscrepanciesViewProps {
  onOpenScanner: () => void;
}

export const DiscrepanciesView: React.FC<DiscrepanciesViewProps> = ({ onOpenScanner }) => {
  const [campaigns, setCampaigns] = useState<AuditCampaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [discrepancies, setDiscrepancies] = useState<AuditScan[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal nueva campaña
  const [newCampaignModalOpen, setNewCampaignModalOpen] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [newCampaignLocation, setNewCampaignLocation] = useState('CDMX Central');

  useEffect(() => {
    loadCampaigns();
  }, []);

  useEffect(() => {
    if (selectedCampaignId) {
      loadDiscrepancies(selectedCampaignId);
    }
  }, [selectedCampaignId]);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const data = await api.getCampaigns();
      setCampaigns(data);
      if (data.length > 0 && !selectedCampaignId) {
        // Seleccionar la primera campaña abierta o la primera en lista
        const openCamp = data.find((c) => c.status === 'OPEN');
        setSelectedCampaignId(openCamp ? openCamp.id : data[0].id);
      }
    } catch (err) {
      console.error('Error cargando campañas:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDiscrepancies = async (campaignId: string) => {
    try {
      setLoading(true);
      const data = await api.getDiscrepancies(campaignId);
      setDiscrepancies(data);
    } catch (err) {
      console.error('Error cargando discrepancias:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaignName.trim() || !newCampaignLocation.trim()) return;

    try {
      const created = await api.createCampaign({
        name: newCampaignName.trim(),
        target_location: newCampaignLocation.trim(),
      });
      setNewCampaignModalOpen(false);
      setNewCampaignName('');
      await loadCampaigns();
      setSelectedCampaignId(created.id);
    } catch (err: any) {
      alert(err.message || 'Error al crear campaña de auditoría');
    }
  };

  const handleCloseCampaign = async () => {
    if (!selectedCampaignId) return;
    if (!window.confirm('¿Seguro que deseas cerrar formalmente esta campaña de auditoría?')) {
      return;
    }

    try {
      await api.closeCampaign(selectedCampaignId);
      loadCampaigns();
    } catch (err: any) {
      alert(err.message || 'Error al cerrar campaña');
    }
  };

  // Resolución en 1 Clic
  const handleResolve = async (scanId: string, action: 'ACCEPT_PHYSICAL' | 'MARK_LOST') => {
    try {
      await api.resolveDiscrepancy(scanId, {
        action,
        notes: action === 'ACCEPT_PHYSICAL' ? 'Conciliación en 1 clic aceptando realidad física' : 'Marcado como LOST en 1 clic',
      });
      loadDiscrepancies(selectedCampaignId);
      loadCampaigns();
    } catch (err: any) {
      alert(err.message || 'Error al conciliar discrepancia');
    }
  };

  const currentCampaign = campaigns.find((c) => c.id === selectedCampaignId);

  const getDiscrepancyBadge = (type: DiscrepancyType) => {
    switch (type) {
      case 'WRONG_USER':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
            Custodia Incorrecta (Wrong Owner)
          </span>
        );
      case 'WRONG_LOCATION':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
            Ubicación Incorrecta (Wrong Location)
          </span>
        );
      case 'MISSING':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
            Faltante (Missing)
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Selector de Campaña y Barra de Control */}
      <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Motor de Conciliación Físico vs. Lógico
          </span>
          <div className="flex items-center gap-3">
            <select
              value={selectedCampaignId}
              onChange={(e) => setSelectedCampaignId(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — [{c.target_location}] ({c.status})
                </option>
              ))}
            </select>

            {currentCampaign && (
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                  currentCampaign.status === 'OPEN'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {currentCampaign.status === 'OPEN' ? 'Campaña Abierta' : 'Campaña Cerrada'}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setNewCampaignModalOpen(true)}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-3.5 py-2 rounded-xl transition"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Campaña</span>
          </button>

          {currentCampaign?.status === 'OPEN' && (
            <>
              <button
                onClick={onOpenScanner}
                className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm transition"
              >
                <QrCode className="w-4 h-4" />
                <span>Escanear Tags en Sede</span>
              </button>

              <button
                onClick={handleCloseCampaign}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition"
              >
                <FolderLock className="w-4 h-4" />
                <span>Cerrar Campaña</span>
              </button>
            </>
          )}

          <button
            onClick={() => loadDiscrepancies(selectedCampaignId)}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl"
            title="Recargar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Métricas de la Campaña Actual */}
      {currentCampaign && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <span className="text-[11px] text-slate-400 font-medium uppercase">
              Total de Escaneos Realizados
            </span>
            <p className="text-xl font-bold text-slate-900 mt-1">
              {currentCampaign.total_scans}
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <span className="text-[11px] text-amber-600 font-medium uppercase">
              Discrepancias Detectadas
            </span>
            <p className="text-xl font-bold text-amber-700 mt-1">
              {discrepancies.filter((d) => !d.resolved).length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <span className="text-[11px] text-emerald-600 font-medium uppercase">
              Discrepancias Conciliadas / Resueltas
            </span>
            <p className="text-xl font-bold text-emerald-700 mt-1">
              {currentCampaign.resolved_count}
            </p>
          </div>
        </div>
      )}

      {/* Matriz de Discrepancias Físico vs. Lógico */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Discrepancias Pendientes de Resolución ({discrepancies.length})
            </h3>
            <p className="text-xs text-slate-500">
              Usa los botones de 1-Clic para aceptar la realidad física o marcar activos como extraviados
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-6">Activo & Tag</th>
                <th className="py-3 px-4">Tipo de Discrepancia</th>
                <th className="py-3 px-4">Inventario Lógico (Sistema)</th>
                <th className="py-3 px-4">Realidad Física (Escaneo)</th>
                <th className="py-3 px-4">Estatus</th>
                <th className="py-3 px-6 text-right">Conciliación en 1 Clic</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {discrepancies.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50/70 transition">
                  {/* Activo */}
                  <td className="py-3.5 px-6">
                    <span className="font-mono font-bold text-slate-900 block">{d.asset_tag}</span>
                    <span className="text-[11px] text-slate-500">
                      {d.asset_brand} {d.asset_model} ({d.asset_category})
                    </span>
                  </td>

                  {/* Discrepancia */}
                  <td className="py-3.5 px-4">{getDiscrepancyBadge(d.discrepancy_type)}</td>

                  {/* Lógico */}
                  <td className="py-3.5 px-4">
                    <p className="font-medium text-slate-800">
                      Custodia: {d.expected_user_name || 'Sin Asignar (Stock)'}
                    </p>
                    <p className="text-[11px] text-slate-400">Ubicación: {d.expected_location}</p>
                  </td>

                  {/* Físico */}
                  <td className="py-3.5 px-4">
                    <p className="font-semibold text-sky-800">
                      Hallado con: {d.found_with_user_name || 'Sin Asignar'}
                    </p>
                    <p className="text-[11px] text-slate-500">Ubicación real: {d.found_location}</p>
                  </td>

                  {/* Estatus */}
                  <td className="py-3.5 px-4">
                    {d.resolved ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <CheckCheck className="w-3.5 h-3.5" /> Resuelta
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        Pendiente
                      </span>
                    )}
                  </td>

                  {/* Acciones 1-Clic */}
                  <td className="py-3.5 px-6 text-right">
                    {!d.resolved ? (
                      <div className="flex items-center justify-end gap-2">
                        {d.discrepancy_type !== 'MISSING' && (
                          <button
                            onClick={() => handleResolve(d.id, 'ACCEPT_PHYSICAL')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1"
                            title="Actualiza usuario y ubicación en base a lo escaneado"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Aceptar Realidad</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleResolve(d.id, 'MARK_LOST')}
                          className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-semibold text-[11px] px-3 py-1.5 rounded-lg flex items-center gap-1"
                          title="Marca el activo como extraviado"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Marcar LOST</span>
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-[11px] italic">Conciliado</span>
                    )}
                  </td>
                </tr>
              ))}

              {discrepancies.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                    ¡Excelente! No hay discrepancias activas en esta campaña. El inventario físico coincide 100% con el lógico.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nueva Campaña */}
      {newCampaignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Crear Campaña de Auditoría</h3>
            <p className="text-xs text-slate-500">
              Inicia una campaña para auditar físicamente los equipos de una sede y detectar faltantes o custodias incorrectas.
            </p>

            <form onSubmit={handleCreateCampaign} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nombre de la Campaña:</label>
                <input
                  type="text"
                  value={newCampaignName}
                  onChange={(e) => setNewCampaignName(e.target.value)}
                  placeholder="Ej. Auditoría Trimestral Q1 2026 - Central"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Sede / Ubicación Objetivo:</label>
                <input
                  type="text"
                  value={newCampaignLocation}
                  onChange={(e) => setNewCampaignLocation(e.target.value)}
                  placeholder="Ej. CDMX Central"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewCampaignModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!newCampaignName.trim()}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg"
                >
                  Crear y Abrir Campaña
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
