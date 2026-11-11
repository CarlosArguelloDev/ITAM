import React, { useEffect, useState } from 'react';
import {
  Laptop,
  AlertTriangle,
  FileCheck,
  ShieldAlert,
  Users,
  MapPin,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Clock,
  Barcode,
} from 'lucide-react';
import { DashboardStats, AlertItem } from '../types';
import { api } from '../api';
import { NavView } from '../components/Sidebar';

interface DashboardViewProps {
  onNavigate: (view: NavView) => void;
  onOpenScanner: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, onOpenScanner }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [s, a] = await Promise.all([api.getStats(), api.getAlerts()]);
      setStats(s);
      setAlerts(a);
    } catch (err) {
      console.error('Error cargando stats:', err);
    } finally {
      setLoading(false);
    }
  };

  // Colores para las categorías en el gráfico
  const categoryColors: Record<string, string> = {
    LAPTOP: '#0284C7', // sky-600
    MONITOR: '#6366F1', // indigo-500
    DOCKING: '#0D9488', // teal-600
    PERIPHERAL: '#F59E0B', // amber-500
    OTHER: '#94A3B8', // slate-400
  };

  const totalAssets = stats?.total_assets || 0;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Banner Superior de Bienvenida y Acciones Rápidas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-2xl text-white shadow-sm">
        <div>
          <h2 className="text-xl font-bold">Control de Custodia e Inventario de TI</h2>
          <p className="text-xs text-slate-300 mt-1">
            Conciliación de inventario, trazabilidad de equipos y gestión de responsivas.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
            title="Recargar métricas"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onOpenScanner}
            className="flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl shadow transition"
          >
            <Barcode className="w-4 h-4" />
            <span>Escanear Código de Barras</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 4 KPIs Superiores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1: Total Activos */}
        <div
          onClick={() => onNavigate('assets')}
          className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm hover:shadow-md transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Activos
            </span>
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Laptop className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{stats?.total_assets ?? '-'}</p>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
            <span className="font-semibold text-emerald-600">
              {stats?.status_counts['ASSIGNED'] || 0}
            </span>
            <span>asignados en custodia</span>
          </div>
        </div>

        {/* KPI 2: Discrepancias Activas */}
        <div
          onClick={() => onNavigate('discrepancies')}
          className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm hover:shadow-md transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Discrepancias
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {stats?.active_discrepancies ?? 0}
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-700">
            <span>Requieren conciliación física</span>
          </div>
        </div>

        {/* KPI 3: Responsivas Pendientes */}
        <div
          onClick={() => onNavigate('documents')}
          className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm hover:shadow-md transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Responsivas Pendientes
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {stats?.pending_responsivas ?? 0}
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
            <span>Pendientes de carga de firma</span>
          </div>
        </div>

        {/* KPI 4: Sin Auditar > 90 Días */}
        <div
          onClick={() => onNavigate('alerts')}
          className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm hover:shadow-md transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Sin Auditar &gt; 90 Días
            </span>
            <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {stats?.unaudited_assets_over_90_days ?? 0}
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-red-700">
            <span>Alerta de pérdida de rastro</span>
          </div>
        </div>
      </div>

      {/* Gráficos de Distribución (Gráfico de Dona Puro SVG + Barras por Ubicación) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Dona: Activos por Categoría */}
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Activos por Categoría</h3>
              <p className="text-xs text-slate-400">Distribución de hardware en el inventario</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600">
              {totalAssets} Equipos
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 py-2">
            {/* SVG Donut Chart */}
            <div className="relative w-40 h-40 shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90 transform">
                {(() => {
                  let accumulatedPercent = 0;
                  const categories = stats?.category_counts ? Object.entries(stats.category_counts) : [];
                  if (categories.length === 0 || totalAssets === 0) {
                    return (
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        fill="transparent"
                        stroke="#E2E8F0"
                        strokeWidth="14"
                      />
                    );
                  }

                  return categories.map(([cat, count]) => {
                    const percent = (count / totalAssets) * 100;
                    const strokeDasharray = `${percent * 2.387} 238.7`;
                    const strokeDashoffset = `-${accumulatedPercent * 2.387}`;
                    accumulatedPercent += percent;
                    const color = categoryColors[cat] || '#94A3B8';

                    return (
                      <circle
                        key={cat}
                        cx="50"
                        cy="50"
                        r="38"
                        fill="transparent"
                        stroke={color}
                        strokeWidth="15"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        className="transition-all duration-500 hover:opacity-80"
                      />
                    );
                  });
                })()}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-2xl font-bold text-slate-900 leading-none">{totalAssets}</span>
                <span className="text-[10px] uppercase font-semibold text-slate-400 mt-1">Activos</span>
              </div>
            </div>

            {/* Leyenda Detallada */}
            <div className="space-y-2 w-full max-w-xs">
              {stats?.category_counts &&
                Object.entries(stats.category_counts).map(([cat, count]) => {
                  const pct = totalAssets > 0 ? Math.round((count / totalAssets) * 100) : 0;
                  const color = categoryColors[cat] || '#94A3B8';
                  return (
                    <div key={cat} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span className="font-medium text-slate-700">{cat}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{count}</span>
                        <span className="text-[10px] text-slate-400 w-8 text-right font-mono">
                          {pct}%
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Barras de Progreso: Activos por Ubicación */}
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Activos por Ubicación</h3>
                <p className="text-xs text-slate-400">Distribución física por sede y bodega</p>
              </div>
              <MapPin className="w-4 h-4 text-slate-400" />
            </div>

            <div className="space-y-3.5 mt-2">
              {stats?.location_counts &&
                Object.entries(stats.location_counts).map(([loc, count]) => {
                  const pct = totalAssets > 0 ? Math.round((count / totalAssets) * 100) : 0;
                  return (
                    <div key={loc} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-slate-700">{loc}</span>
                        <span className="text-slate-500 font-mono">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-sky-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Total de sedes activas registradas:</span>
            <span className="font-semibold text-slate-800">
              {stats?.location_counts ? Object.keys(stats.location_counts).length : 0}
            </span>
          </div>
        </div>
      </div>

      {/* Lista de Alertas Recientes */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Centro de Alertas Prioritarias</h3>
            <p className="text-xs text-slate-400">
              Notificaciones automáticas del motor de auditoría y vencimientos
            </p>
          </div>
          <button
            onClick={() => onNavigate('alerts')}
            className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1"
          >
            <span>Ver todas las alertas ({alerts.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {alerts.slice(0, 5).map((alt) => (
            <div
              key={alt.id}
              className="px-6 py-3.5 flex items-center justify-between hover:bg-slate-50 transition"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    alt.severity === 'HIGH'
                      ? 'bg-red-500'
                      : alt.severity === 'MEDIUM'
                      ? 'bg-amber-500'
                      : 'bg-blue-500'
                  }`}
                />
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{alt.title}</h4>
                  <p className="text-[11px] text-slate-500">{alt.description}</p>
                </div>
              </div>
              <div className="text-right shrink-0 ml-4">
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
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {new Date(alt.date).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}

          {alerts.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-400">
              No hay alertas activas en el sistema. Todo el inventario está al día.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
