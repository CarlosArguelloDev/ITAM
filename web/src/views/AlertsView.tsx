import React, { useState, useEffect } from 'react';
import {
  Bell,
  Clock,
  ShieldAlert,
  FileCheck,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
} from 'lucide-react';
import { AlertItem, AlertSeverity } from '../types';
import { api } from '../api';

export const AlertsView: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const data = await api.getAlerts();
      setAlerts(data);
    } catch (err) {
      console.error('Error cargando alertas:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    if (severityFilter !== 'ALL' && a.severity !== severityFilter) return false;
    if (typeFilter !== 'ALL' && a.type !== typeFilter) return false;
    return true;
  });

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'ACTIVE_DISCREPANCY':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'PENDING_RESPONSIVA':
        return <FileCheck className="w-5 h-5 text-amber-600" />;
      case 'UNAUDITED_90_DAYS':
        return <Clock className="w-5 h-5 text-indigo-600" />;
      case 'EXPIRING_WARRANTY':
        return <ShieldAlert className="w-5 h-5 text-sky-600" />;
      default:
        return <Bell className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header y Filtros */}
      <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Centro de Alertas de Hardware</h2>
          <p className="text-xs text-slate-500">
            Detección preventiva de garantías por vencer, custodias desfasadas y falta de auditoría física
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-700 rounded-xl px-3 py-2"
          >
            <option value="ALL">Todas las Severidades</option>
            <option value="HIGH">Severidad Alta (HIGH)</option>
            <option value="MEDIUM">Severidad Media (MEDIUM)</option>
            <option value="INFO">Informativas (INFO)</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-700 rounded-xl px-3 py-2"
          >
            <option value="ALL">Todos los Tipos</option>
            <option value="ACTIVE_DISCREPANCY">Discrepancias Físicas</option>
            <option value="PENDING_RESPONSIVA">Responsivas Pendientes</option>
            <option value="UNAUDITED_90_DAYS">Sin Auditar &gt; 90 Días</option>
            <option value="EXPIRING_WARRANTY">Garantías por Vencer</option>
          </select>

          <button
            onClick={loadAlerts}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl border border-slate-200"
            title="Recargar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Lista de Alertas */}
      <div className="grid grid-cols-1 gap-3.5">
        {filteredAlerts.map((alt) => (
          <div
            key={alt.id}
            className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm hover:shadow-md transition flex items-start justify-between gap-4"
          >
            <div className="flex items-start gap-4">
              <div
                className={`p-3 rounded-xl shrink-0 ${
                  alt.severity === 'HIGH'
                    ? 'bg-red-50'
                    : alt.severity === 'MEDIUM'
                    ? 'bg-amber-50'
                    : 'bg-blue-50'
                }`}
              >
                {getAlertIcon(alt.type)}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      alt.severity === 'HIGH'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : alt.severity === 'MEDIUM'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}
                  >
                    {alt.severity}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    Tipo: {alt.type}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900">{alt.title}</h3>
                <p className="text-xs text-slate-600">{alt.description}</p>
                {alt.user_name && (
                  <p className="text-[11px] text-slate-400">
                    Usuario Relacionado: <strong className="text-slate-700">{alt.user_name}</strong>
                  </p>
                )}
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-xs text-slate-400 block font-mono">
                {new Date(alt.date).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}

        {filteredAlerts.length === 0 && !loading && (
          <div className="bg-white p-12 rounded-2xl border border-[#E2E8F0] text-center text-slate-400 text-xs">
            No se encontraron alertas para los filtros seleccionados.
          </div>
        )}
      </div>
    </div>
  );
};
