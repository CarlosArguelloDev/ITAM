import React, { useEffect, useState, useMemo } from 'react';
import {
  Laptop,
  WarningCircle,
  ArrowsClockwise,
  CaretRight,
  CheckCircle,
  Wrench,
  Clock,
  Barcode,
} from '@phosphor-icons/react';
import { DashboardStats, AlertItem, Asset, DepartmentSummary } from '../types';
import { api } from '../api';
import { NavView } from '../components/Sidebar';
import { SanJuanMap } from '../components/SanJuanMap';
import { HardwareIcon, BrandTag } from '../components/HardwareIcon';
import { CopyButton } from '../components/CopyButton';

interface DashboardViewProps {
  onNavigate: (view: NavView) => void;
  onOpenScanner: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, onOpenScanner }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [recentAssigned, setRecentAssigned] = useState<Asset[]>([]);
  const [deptSummaries, setDeptSummaries] = useState<DepartmentSummary[]>([]);
  const [selectedSite, setSelectedSite] = useState<'ALL' | 'OPM' | 'OMEX'>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [s, a, assetsList, depts] = await Promise.all([
        api.getStats(),
        api.getAlerts().catch(() => []),
        api.getAssets().catch(() => []),
        api.getDepartmentSummaries().catch(() => []),
      ]);
      setStats(s);
      setAlerts(a);
      setDeptSummaries(depts);

      const assigned = assetsList
        .filter((item) => item.assigned_to_user_id && item.assigned_to_name)
        .slice(0, 6);
      setRecentAssigned(assigned);
    } catch (err) {
      console.error('Error cargando stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalAssets = stats?.total_assets || 0;
  const availableCount = stats?.status_counts?.['AVAILABLE'] || 0;
  const assignedCount = stats?.status_counts?.['ASSIGNED'] || 0;
  const maintenanceCount = stats?.status_counts?.['MAINTENANCE'] || 0;
  const attentionCount = (stats?.active_discrepancies || 0) + (stats?.pending_responsivas || 0);

  const opmCount = stats?.location_counts?.['OPM'] || 0;
  const omexCount = stats?.location_counts?.['OMEX'] || 0;

  // Categorías agrupando < 5% en OTROS (< 5%)
  const categoryList = useMemo(() => {
    if (!stats?.category_counts || totalAssets === 0) return [];
    const entries = Object.entries(stats.category_counts).sort((a, b) => b[1] - a[1]);
    const main: { name: string; count: number; pct: number }[] = [];
    let others = 0;

    entries.forEach(([name, count]) => {
      const pct = (count / totalAssets) * 100;
      if (pct >= 5) {
        main.push({ name, count, pct });
      } else {
        others += count;
      }
    });

    if (others > 0) {
      main.push({ name: 'OTROS (< 5%)', count: others, pct: (others / totalAssets) * 100 });
    }
    return main;
  }, [stats?.category_counts, totalAssets]);

  const topAreas = useMemo(() => {
    return [...deptSummaries]
      .sort((a, b) => b.total_assets - a.total_assets)
      .slice(0, 6);
  }, [deptSummaries]);

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Saludo y acción rápida */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Bienvenido, Carlos
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Control de infraestructura de TI, ubicaciones en San Juan del Río y resguardo de equipos.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadData}
            aria-label="Actualizar métricas"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-[#E6E8F0] text-xs font-semibold text-slate-700 hover:bg-slate-50 transition active:scale-[0.98]"
          >
            <ArrowsClockwise className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
          <button
            type="button"
            onClick={onOpenScanner}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#5B4FE9] hover:bg-[#4B3FD8] text-white text-xs font-semibold shadow-xs transition active:scale-[0.98]"
          >
            <Barcode weight="duotone" className="w-3.5 h-3.5" />
            <span>Escanear</span>
          </button>
        </div>
      </div>

      {/* BENTO FILA 1: Hero + 4 estados a la izquierda | Mapa San Juan del Río a la derecha */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Columna Izquierda (5/12) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Hero Total Assets Card */}
          <div className="relative overflow-hidden rounded-2xl border border-[#E4E2F8] bg-gradient-to-br from-[#F3F2FF] via-[#F7F6FF] to-white p-6 flex items-center justify-between gap-4">
            <div className="space-y-3 z-10">
              <p className="text-xs sm:text-sm font-semibold text-slate-700 leading-snug max-w-[230px]">
                Aquí está el conteo total de tus activos de TI. Entra para explorar y gestionar.
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 tabular-nums tracking-tight">
                  {totalAssets}
                </span>
                <span className="text-xs font-semibold text-slate-500">Activos Totales</span>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('assets')}
                className="inline-flex items-center gap-1.5 bg-[#5B4FE9] hover:bg-[#4B3FD8] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition active:scale-[0.98]"
              >
                <span>Explorar Todos</span>
                <CaretRight weight="bold" className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Ilustración limpia de dispositivos */}
            <svg
              viewBox="0 0 120 100"
              className="w-28 h-24 shrink-0 hidden sm:block"
              aria-hidden="true"
            >
              <rect x="34" y="14" width="72" height="50" rx="5" fill="#FFFFFF" stroke="#64748B" strokeWidth="2.2" />
              <line x1="58" y1="64" x2="54" y2="76" stroke="#64748B" strokeWidth="2.2" />
              <line x1="82" y1="64" x2="86" y2="76" stroke="#64748B" strokeWidth="2.2" />
              <line x1="46" y1="76" x2="94" y2="76" stroke="#64748B" strokeWidth="2.2" strokeLinecap="round" />
              <rect x="20" y="42" width="32" height="42" rx="4" fill="#F3F2FF" stroke="#5B4FE9" strokeWidth="2" />
              <rect x="8" y="56" width="18" height="30" rx="3" fill="#FFFFFF" stroke="#5B4FE9" strokeWidth="2" />
              <circle cx="17" cy="81" r="1.5" fill="#5B4FE9" />
            </svg>
          </div>

          {/* Grid 2x2 de Estados */}
          <div className="grid grid-cols-2 gap-4 flex-1">
            <button
              type="button"
              onClick={() => onNavigate('assets')}
              className="text-left bg-white p-4 rounded-2xl border border-[#E6E8F0] hover:border-sky-300 hover:-translate-y-0.5 transition-all flex items-center justify-between gap-3 active:scale-[0.99]"
            >
              <div>
                <p className="text-2xl font-extrabold text-slate-900 tabular-nums">
                  {availableCount}
                </p>
                <p className="text-xs font-medium text-slate-500 mt-0.5">Disponibles</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                <CheckCircle weight="duotone" className="w-5 h-5" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('users')}
              className="text-left bg-white p-4 rounded-2xl border border-[#E6E8F0] hover:border-emerald-300 hover:-translate-y-0.5 transition-all flex items-center justify-between gap-3 active:scale-[0.99]"
            >
              <div>
                <p className="text-2xl font-extrabold text-slate-900 tabular-nums">
                  {assignedCount}
                </p>
                <p className="text-xs font-medium text-slate-500 mt-0.5">En Uso</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Laptop weight="duotone" className="w-5 h-5" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('assets')}
              className="text-left bg-white p-4 rounded-2xl border border-[#E6E8F0] hover:border-amber-300 hover:-translate-y-0.5 transition-all flex items-center justify-between gap-3 active:scale-[0.99]"
            >
              <div>
                <p className="text-2xl font-extrabold text-slate-900 tabular-nums">
                  {maintenanceCount}
                </p>
                <p className="text-xs font-medium text-slate-500 mt-0.5">Mantenimiento</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Wrench weight="duotone" className="w-5 h-5" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('discrepancies')}
              className="text-left bg-white p-4 rounded-2xl border border-[#E6E8F0] hover:border-rose-300 hover:-translate-y-0.5 transition-all flex items-center justify-between gap-3 active:scale-[0.99]"
            >
              <div>
                <p className="text-2xl font-extrabold text-slate-900 tabular-nums">
                  {attentionCount}
                </p>
                <p className="text-xs font-medium text-slate-500 mt-0.5">Pendientes</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <WarningCircle weight="duotone" className="w-5 h-5" />
              </div>
            </button>
          </div>
        </div>

        {/* Columna Derecha (7/12): Mapa Minimalista de San Juan del Río (OPM y OMEX) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-[#E6E8F0] flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Ubicación de Activos — San Juan del Río
              </h3>
              <p className="text-xs text-slate-500">
                Plantas OPM y OMEX y principales áreas operativas
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('departments')}
              className="text-xs font-semibold text-[#5B4FE9] hover:text-[#4B3FD8] transition"
            >
              Ver todos
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
            <div className="md:col-span-7">
              <SanJuanMap
                opmCount={opmCount}
                omexCount={omexCount}
                selectedSite={selectedSite}
                onSelectSite={setSelectedSite}
              />
            </div>

            <div className="md:col-span-5 space-y-2">
              <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedSite(selectedSite === 'OPM' ? 'ALL' : 'OPM')}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    selectedSite === 'OPM'
                      ? 'border-sky-500 bg-sky-50/60'
                      : 'border-[#E6E8F0] hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-sky-600" />
                    <span className="text-[11px] font-bold text-slate-700">OPM</span>
                  </div>
                  <div className="text-lg font-extrabold text-slate-900 tabular-nums mt-0.5">
                    {opmCount}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedSite(selectedSite === 'OMEX' ? 'ALL' : 'OMEX')}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    selectedSite === 'OMEX'
                      ? 'border-[#5B4FE9] bg-[#F3F2FF]'
                      : 'border-[#E6E8F0] hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#5B4FE9]" />
                    <span className="text-[11px] font-bold text-slate-700">OMEX</span>
                  </div>
                  <div className="text-lg font-extrabold text-slate-900 tabular-nums mt-0.5">
                    {omexCount}
                  </div>
                </button>
              </div>

              <div className="space-y-1.5 pt-1">
                {topAreas.map((area) => (
                  <button
                    key={area.name}
                    type="button"
                    onClick={() => onNavigate('departments')}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-50 transition"
                  >
                    <span className="font-medium text-slate-700 truncate">{area.name}</span>
                    <span className="font-bold text-slate-900 tabular-nums">{area.total_assets}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BENTO FILA 2: Categorías de Activos | Asignados Recientemente */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Categorías de Activos (5/12) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-[#E6E8F0]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Categorías de Activos</h3>
              <p className="text-xs text-slate-400">Categorías &lt; 5% agrupadas en Otros</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('assets')}
              className="text-xs font-semibold text-[#5B4FE9] hover:text-[#4B3FD8]"
            >
              Ver inventario
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {categoryList.map((cat) => (
              <button
                key={cat.name}
                type="button"
                onClick={() => onNavigate('assets')}
                className="w-full py-3 flex items-center justify-between gap-3 hover:bg-slate-50/70 px-2 rounded-lg transition text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#F6F7FB] border border-[#E6E8F0] flex items-center justify-center shrink-0">
                    <HardwareIcon category={cat.name} className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-800 truncate">{cat.name}</div>
                    <div className="text-[11px] text-slate-400 tabular-nums">
                      {cat.pct.toFixed(1)}% del inventario
                    </div>
                  </div>
                </div>
                <span className="text-sm font-bold text-slate-900 tabular-nums">{cat.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Asignados Recientemente (7/12) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-[#E6E8F0] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Asignados Recientemente</h3>
                <p className="text-xs text-slate-400">Equipos actualmente en resguardo de colaboradores</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('users')}
                className="text-xs font-semibold text-[#5B4FE9] hover:text-[#4B3FD8]"
              >
                Ver todos
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400">
                    <th className="py-2.5 pr-4">Equipo</th>
                    <th className="py-2.5 px-4">Número de Serie</th>
                    <th className="py-2.5 pl-4 text-right">Asignado a</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentAssigned.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => onNavigate('users')}
                      className="hover:bg-slate-50/70 cursor-pointer transition"
                    >
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#F6F7FB] border border-[#E6E8F0] flex items-center justify-center shrink-0">
                            <HardwareIcon category={item.category} className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <BrandTag brand={item.brand} />
                              <span className="font-semibold text-slate-800 truncate max-w-[160px]">
                                {item.model || item.category}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                              <span>{item.asset_tag} • {item.category}</span>
                              <CopyButton value={item.asset_tag} label="tag" />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 tabular-nums">
                        <div className="inline-flex items-center gap-1">
                          <span>{item.serial_number}</span>
                          <CopyButton value={item.serial_number} label="número de serie" />
                        </div>
                      </td>
                      <td className="py-3 pl-4 text-right font-semibold text-slate-800">
                        {item.assigned_to_name}
                      </td>
                    </tr>
                  ))}
                  {recentAssigned.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-slate-400 italic">
                        Sin asignaciones recientes registradas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {alerts.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-amber-700 font-medium">
                <Clock weight="duotone" className="w-4 h-4 shrink-0" />
                <span>
                  Hay <strong className="tabular-nums">{alerts.length}</strong> alerta(s) preventivas activas.
                </span>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('alerts')}
                className="font-bold text-amber-700 hover:text-amber-900 underline"
              >
                Revisar alertas
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
