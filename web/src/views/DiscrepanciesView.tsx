import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Search,
  Filter,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  Laptop,
  Monitor,
  Cpu,
  Headphones,
  Box,
  Wrench,
  Check,
  UserCheck,
} from 'lucide-react';
import { AuditScan, DiscrepancyType } from '../types';
import { api } from '../api';

export const DiscrepanciesView: React.FC<{ onDiscrepancyResolved?: () => void }> = ({
  onDiscrepancyResolved,
}) => {
  const [discrepancies, setDiscrepancies] = useState<AuditScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'ALL'>('PENDING');
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadDiscrepancies();
  }, [statusFilter]);

  const loadDiscrepancies = async () => {
    try {
      setLoading(true);
      const isResolvedParam = statusFilter === 'PENDING' ? false : undefined;
      const data = await api.getAllDiscrepancies(isResolvedParam);
      setDiscrepancies(data);
    } catch (err) {
      console.error('Error cargando discrepancias:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (
    scanId: string,
    action: 'ACCEPT_PHYSICAL' | 'MARK_LOST' | 'MAINTENANCE' | 'KEEP_LOGICAL',
    assetTag: string
  ) => {
    try {
      setResolvingId(scanId);
      setSuccessMessage(null);

      let actionLabel = 'resuelta';
      if (action === 'ACCEPT_PHYSICAL') actionLabel = 'reasignada al usuario/ubicación física encontrada';
      if (action === 'MARK_LOST') actionLabel = 'marcada como extraviada (LOST)';
      if (action === 'MAINTENANCE') actionLabel = 'enviada a mantenimiento';
      if (action === 'KEEP_LOGICAL') actionLabel = 'mantenida lógicamente y cerrada';

      await api.resolveDiscrepancy(scanId, {
        action,
        notes: `Resuelto en Centro de Discrepancias: Acción ${action}`,
      });

      setSuccessMessage(`Activo ${assetTag}: discrepancia ${actionLabel} exitosamente.`);
      await loadDiscrepancies();

      if (onDiscrepancyResolved) {
        onDiscrepancyResolved();
      }
    } catch (err: any) {
      alert(err.message || 'Error al resolver la discrepancia');
    } finally {
      setResolvingId(null);
    }
  };

  // Filtrado
  const filteredDiscrepancies = discrepancies.filter((d) => {
    const matchSearch =
      !searchQuery.trim() ||
      d.asset_tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.asset_model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.expected_user_name && d.expected_user_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (d.found_with_user_name && d.found_with_user_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      d.expected_location.toLowerCase().includes(searchQuery.toLowerCase());

    const matchType = typeFilter === 'ALL' || d.discrepancy_type === typeFilter;
    return matchSearch && matchType;
  });

  // Métricas
  const pendingCount = discrepancies.filter((d) => !d.resolved).length;
  const missingCount = discrepancies.filter((d) => !d.resolved && d.discrepancy_type === 'MISSING').length;
  const wrongUserCount = discrepancies.filter((d) => !d.resolved && d.discrepancy_type === 'WRONG_USER').length;
  const wrongLocationCount = discrepancies.filter((d) => !d.resolved && d.discrepancy_type === 'WRONG_LOCATION').length;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'LAPTOP':
        return <Laptop className="w-4 h-4 text-sky-600" />;
      case 'DOCKING':
        return <Cpu className="w-4 h-4 text-teal-600" />;
      case 'MONITOR':
        return <Monitor className="w-4 h-4 text-indigo-600" />;
      case 'PERIPHERAL':
        return <Headphones className="w-4 h-4 text-amber-600" />;
      default:
        return <Box className="w-4 h-4 text-slate-500" />;
    }
  };

  const getDiscrepancyBadge = (type: string) => {
    switch (type) {
      case 'MISSING':
        return {
          label: 'FALTANTE / NO LOCALIZADO',
          className: 'bg-red-100 text-red-800 border-red-200',
          icon: <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />,
        };
      case 'WRONG_USER':
        return {
          label: 'CUSTODIA INCORRECTA',
          className: 'bg-amber-100 text-amber-800 border-amber-200',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />,
        };
      case 'WRONG_LOCATION':
        return {
          label: 'UBICACIÓN INCORRECTA',
          className: 'bg-purple-100 text-purple-800 border-purple-200',
          icon: <HelpCircle className="w-3.5 h-3.5 text-purple-600 shrink-0" />,
        };
      case 'UNASSIGNED':
      case 'UNASSIGNED_LOCATION':
        return {
          label: 'ACTIVO SIN ASIGNAR EN USO',
          className: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-blue-600 shrink-0" />,
        };
      default:
        return {
          label: type,
          className: 'bg-slate-100 text-slate-800 border-slate-200',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-slate-600 shrink-0" />,
        };
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Cabecera Principal */}
      <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Centro de Resolución de Discrepancias
          </h2>
          <p className="text-xs text-slate-500">
            Conciliación en 1 clic de diferencias entre el inventario físico y lógico detectadas en auditorías
          </p>
        </div>

        <button
          onClick={loadDiscrepancies}
          className="p-2.5 text-slate-500 hover:bg-slate-100 rounded-xl border border-slate-200 self-end sm:self-auto"
          title="Recargar discrepancias"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Métricas Superiores */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20">
          <span className="text-[11px] font-semibold text-amber-700 uppercase">Pendientes Activas</span>
          <p className="text-2xl font-bold text-amber-700 mt-0.5">{pendingCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-red-200 bg-red-50/20">
          <span className="text-[11px] font-semibold text-red-700 uppercase">Equipos Faltantes (Missing)</span>
          <p className="text-2xl font-bold text-red-700 mt-0.5">{missingCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-orange-200 bg-orange-50/20">
          <span className="text-[11px] font-semibold text-orange-700 uppercase">Custodia Errónea</span>
          <p className="text-2xl font-bold text-orange-700 mt-0.5">{wrongUserCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-purple-200 bg-purple-50/20">
          <span className="text-[11px] font-semibold text-purple-700 uppercase">Sede Errónea</span>
          <p className="text-2xl font-bold text-purple-700 mt-0.5">{wrongLocationCount}</p>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-slate-400 hover:text-slate-600">
            ×
          </button>
        </div>
      )}

      {/* Barra de Búsqueda y Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por Asset Tag, número de serie, colaborador o ubicación..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="ALL">Todos los Tipos</option>
            <option value="MISSING">Faltantes (Missing)</option>
            <option value="WRONG_USER">Custodia Errónea</option>
            <option value="WRONG_LOCATION">Ubicación Errónea</option>
            <option value="UNASSIGNED">En Stock Sin Asignar</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="PENDING">Solo Pendientes</option>
            <option value="ALL">Todas (Incluye Resueltas)</option>
          </select>
        </div>
      </div>

      {/* Lista de Discrepancias con Acciones de Resolución en 1 Clic */}
      <div className="space-y-4">
        {filteredDiscrepancies.map((d) => {
          const badge = getDiscrepancyBadge(d.discrepancy_type);
          const isResolving = resolvingId === d.id;

          return (
            <div
              key={d.id}
              className={`bg-white rounded-2xl border p-5 shadow-sm transition space-y-4 ${
                d.resolved ? 'border-slate-200 bg-slate-50/40 opacity-75' : 'border-amber-200 hover:border-amber-300'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Info Activo */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                    {getCategoryIcon(d.asset_category)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-slate-900">
                        {d.asset_tag}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {d.asset_category}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${badge.className}`}>
                        {badge.icon}
                        <span>{badge.label}</span>
                      </span>
                      {d.resolved && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <Check className="w-3 h-3" /> RESUELTA
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-slate-800 mt-0.5">
                      {d.asset_brand} {d.asset_model}
                    </p>
                  </div>
                </div>

                {/* Fecha / Folio Campaña */}
                <div className="text-right text-[11px] text-slate-500">
                  <span className="font-mono block">Auditoría: {d.campaign_id}</span>
                  <span>{new Date(d.scanned_at).toLocaleString()}</span>
                </div>
              </div>

              {/* Comparativa Lógica vs Física */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/60">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">
                    Inventario Lógico (Lo que el sistema esperaba)
                  </span>
                  <p className="font-semibold text-slate-800">
                    {d.expected_user_name ? `Custodio: ${d.expected_user_name}` : 'Sin Asignar (Stock)'}
                  </p>
                  <p className="text-[11px] text-slate-500">Ubicación: {d.expected_location || 'No especificada'}</p>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">
                    Realidad Física Encontrada
                  </span>
                  <p className="font-semibold text-slate-900">
                    {d.discrepancy_type === 'MISSING' ? (
                      <span className="text-red-700 font-bold">NO FUE PRESENTADO / NO LOCALIZADO</span>
                    ) : d.found_with_user_name ? (
                      `En posesión de: ${d.found_with_user_name}`
                    ) : (
                      `En sede: ${d.found_location}`
                    )}
                  </p>
                  {d.notes && <p className="text-[11px] text-slate-600 italic mt-0.5">{d.notes}</p>}
                </div>
              </div>

              {/* Botones de Solución en 1 Clic */}
              {!d.resolved ? (
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2">
                  <span className="text-xs text-slate-500 font-semibold mr-auto">
                    Solucionar en 1 clic:
                  </span>

                  {d.discrepancy_type !== 'MISSING' && (
                    <button
                      onClick={() => handleResolve(d.id, 'ACCEPT_PHYSICAL', d.asset_tag)}
                      disabled={isResolving}
                      className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-xs transition disabled:opacity-50"
                      title="Sincroniza el inventario lógico transfiriendo la custodia a donde fue encontrado físicamente"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Aceptar Físico (Reasignar)</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleResolve(d.id, 'MARK_LOST', d.asset_tag)}
                    disabled={isResolving}
                    className="inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-xs transition disabled:opacity-50"
                    title="Marca el activo como extraviado (LOST) y remueve la custodia"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Marcar como LOST</span>
                  </button>

                  <button
                    onClick={() => handleResolve(d.id, 'MAINTENANCE', d.asset_tag)}
                    disabled={isResolving}
                    className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-xs transition disabled:opacity-50"
                    title="Envía el equipo a taller o mantenimiento"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Mantenimiento</span>
                  </button>

                  <button
                    onClick={() => handleResolve(d.id, 'KEEP_LOGICAL', d.asset_tag)}
                    disabled={isResolving}
                    className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-3 py-1.5 rounded-xl border border-slate-300 transition disabled:opacity-50"
                    title="Cierra la discrepancia manteniendo la asignación lógica original"
                  >
                    <span>Mantener Lógico</span>
                  </button>
                </div>
              ) : (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Discrepancia conciliada y resuelta en base de datos
                  </span>
                </div>
              )}
            </div>
          );
        })}

        {filteredDiscrepancies.length === 0 && (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-12 text-center text-xs text-slate-400 shadow-sm space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <p className="font-semibold text-slate-700">No hay discrepancias pendientes en el sistema.</p>
            <p>Todo el inventario físico verificado coincide con el inventario lógico.</p>
          </div>
        )}
      </div>
    </div>
  );
};
