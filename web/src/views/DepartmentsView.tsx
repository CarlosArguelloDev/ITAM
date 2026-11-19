import React, { useState, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  Node,
  Edge,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Building2,
  Warehouse,
  Search,
  RefreshCw,
  Plus,
  PlusCircle,
  Eye,
  ArrowLeft,
  Laptop,
  Monitor,
  Smartphone,
  Box,
  Users,
  List,
  CircleDot,
  Printer,
  Edit3,
  Trash2,
  X,
  Check,
  AlertCircle,
  Wifi,
  Server,
  Headphones,
  Barcode,
  Cpu,
} from 'lucide-react';
import { api } from '../api';
import {
  Asset,
  DepartmentDiagramResponse,
  DepartmentSummary,
  LocationType,
} from '../types';
import { AssetFormModal } from '../components/AssetFormModal';

const getCategoryBubbleStyle = (category: string) => {
  switch (category) {
    case 'LAPTOP':
    case 'WORKSTATION':
      return {
        bg: 'bg-sky-500/15 hover:bg-sky-500/25 border-sky-400 text-sky-900',
        dot: 'bg-sky-600 text-white',
      };
    case 'MONITOR':
      return {
        bg: 'bg-indigo-500/15 hover:bg-indigo-500/25 border-indigo-400 text-indigo-900',
        dot: 'bg-indigo-600 text-white',
      };
    case 'TELEFONO':
    case 'IPAD':
    case 'SIM-CARD':
      return {
        bg: 'bg-violet-500/15 hover:bg-violet-500/25 border-violet-400 text-violet-900',
        dot: 'bg-violet-600 text-white',
      };
    case 'IMPRESORA':
    case 'SCANNER':
      return {
        bg: 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-400 text-amber-900',
        dot: 'bg-amber-600 text-white',
      };
    case 'SWITCH':
    case 'SWITCH INDUSTRIAL':
    case 'ACCESS POINT':
    case 'FIREWALL':
    case 'ROUTER':
    case 'SERVER':
      return {
        bg: 'bg-cyan-500/15 hover:bg-cyan-500/25 border-cyan-400 text-cyan-900',
        dot: 'bg-cyan-600 text-white',
      };
    default:
      return {
        bg: 'bg-slate-500/10 hover:bg-slate-500/20 border-slate-300 text-slate-800',
        dot: 'bg-slate-600 text-white',
      };
  }
};

const renderSmallCatIcon = (category: string, className = 'w-4 h-4') => {
  const c = category.toUpperCase();
  if (c === 'LAPTOP') return <Laptop className={className} />;
  if (c === 'WORKSTATION' || c === 'DOCKING') return <Cpu className={className} />;
  if (c === 'MONITOR') return <Monitor className={className} />;
  if (c === 'TELEFONO' || c === 'IPAD' || c === 'TELEFONO FIJO') return <Smartphone className={className} />;
  if (c === 'IMPRESORA') return <Printer className={className} />;
  if (c === 'SCANNER') return <Barcode className={className} />;
  if (c === 'AUDIFONOS') return <Headphones className={className} />;
  if (c === 'ACCESS POINT' || c === 'ROUTER') return <Wifi className={className} />;
  if (c.includes('SWITCH') || c === 'FIREWALL' || c === 'SERVER' || c === 'NVR' || c === 'DVR') {
    return <Server className={className} />;
  }
  return <Box className={className} />;
};

const DeptBubbleRootNode = ({ data }: any) => (
  <div className="px-5 py-3.5 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-sky-400 shadow-lg text-white flex items-center gap-3 min-w-[200px]">
    <Handle type="source" position={Position.Bottom} className="!bg-sky-400" />
    <div className="w-10 h-10 rounded-full bg-sky-500/25 border border-sky-400/50 flex items-center justify-center shrink-0">
      {data.is_site ? <Warehouse className="w-5 h-5 text-sky-300" /> : <Building2 className="w-5 h-5 text-sky-300" />}
    </div>
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-sky-300">
        {data.is_site ? 'Site / Bodega' : 'Departamento'}
      </div>
      <div className="text-sm font-bold leading-tight">{data.name}</div>
      <div className="text-[11px] text-slate-300">{data.total} equipo(s) directos</div>
    </div>
  </div>
);

const UserBubbleRootNode = ({ data }: any) => (
  <div className="px-4 py-2.5 rounded-full bg-white border-2 border-emerald-500 shadow-md flex items-center gap-2.5 min-w-[190px]">
    <Handle type="source" position={Position.Bottom} className="!bg-emerald-500" />
    <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
      {String(data.full_name || 'U').charAt(0)}
    </div>
    <div className="min-w-0">
      <div className="text-xs font-bold text-slate-900 truncate max-w-[160px]">{data.full_name}</div>
      <div className="text-[10px] font-mono text-slate-500">
        {data.employee_code} • {data.total} eq.
      </div>
    </div>
  </div>
);

const CategoryBubbleNode = ({ data }: any) => {
  const st = getCategoryBubbleStyle(data.category);
  return (
    <div
      className={`px-3.5 py-2.5 rounded-full border-2 shadow-sm cursor-pointer transition flex items-center gap-2.5 bg-white ${st.bg}`}
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-400" />
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${st.dot}`}>
        {renderSmallCatIcon(data.category, 'w-4 h-4')}
      </div>
      <div className="pr-1">
        <div className="text-[11px] font-bold leading-tight whitespace-nowrap">{data.category}</div>
        <div className="text-xs font-extrabold leading-tight">× {data.count}</div>
      </div>
    </div>
  );
};

export const DepartmentsView: React.FC = () => {
  const [summaries, setSummaries] = useState<DepartmentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'SITES' | 'SPACES' | 'DEPTS'>('ALL');

  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [diagramData, setDiagramData] = useState<DepartmentDiagramResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'LIST' | 'DIAGRAM'>('LIST');
  const [selectedCategoryGroup, setSelectedCategoryGroup] = useState<{
    title: string;
    category: string;
    assets: Asset[];
  } | null>(null);

  const bubbleNodeTypes = useMemo(
    () => ({
      deptBubbleRoot: DeptBubbleRootNode,
      userBubbleRoot: UserBubbleRootNode,
      categoryBubble: CategoryBubbleNode,
    }),
    []
  );

  const { bubbleNodes, bubbleEdges } = useMemo(() => {
    if (!diagramData) return { bubbleNodes: [] as Node[], bubbleEdges: [] as Edge[] };

    const bNodes: Node[] = [];
    const bEdges: Edge[] = [];

    const groupByCategory = (assets: Asset[]) => {
      const map = new Map<string, Asset[]>();
      for (const a of assets) {
        const key = a.category || 'OTRO';
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(a);
      }
      return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
    };

    // 1. Conjunto Principal: Departamento / Site -> burbujas por tipo de activo y cantidad
    const directCats = groupByCategory(diagramData.direct_assets);
    const deptRootId = 'bubble-dept-root';
    const isSite =
      diagramData.department.toUpperCase().includes('SITE') ||
      diagramData.department.toUpperCase().includes('BODEGA');

    const deptCols = Math.min(Math.max(directCats.length, 1), 4);
    const deptCenterX = Math.max(120, (deptCols * 195) / 2 - 90);

    bNodes.push({
      id: deptRootId,
      type: 'deptBubbleRoot',
      position: { x: deptCenterX, y: 20 },
      data: {
        name: diagramData.department,
        is_site: isSite,
        total: diagramData.direct_assets.length,
      },
    });

    directCats.forEach(([cat, catAssets], idx) => {
      const col = idx % 4;
      const row = Math.floor(idx / 4);
      const nodeId = `bubble-dept-cat-${cat}`;
      bNodes.push({
        id: nodeId,
        type: 'categoryBubble',
        position: { x: 20 + col * 195, y: 155 + row * 105 },
        data: {
          title: diagramData.department,
          category: cat,
          count: catAssets.length,
          assets: catAssets,
        },
      });
      bEdges.push({
        id: `edge-${deptRootId}-${nodeId}`,
        source: deptRootId,
        target: nodeId,
        style: { stroke: '#0284c7', strokeWidth: 2 },
      });
    });

    // 2. Conjuntos separados en el mismo tablero: cada persona -> burbujas por tipo de activo y cantidad
    const laneX = 840;
    let curY = 20;

    diagramData.user_groups.forEach((grp) => {
      const uCats = groupByCategory(grp.assets);
      const uRootId = `bubble-usr-${grp.user.id}`;
      const uCols = Math.min(Math.max(uCats.length, 1), 3);
      const uCenterX = laneX + Math.max(40, (uCols * 185) / 2 - 95);

      bNodes.push({
        id: uRootId,
        type: 'userBubbleRoot',
        position: { x: uCenterX, y: curY },
        data: {
          full_name: grp.user.full_name,
          employee_code: grp.user.employee_code,
          total: grp.assets.length,
        },
      });

      uCats.forEach(([cat, catAssets], idx) => {
        const col = idx % 3;
        const row = Math.floor(idx / 3);
        const nodeId = `bubble-usr-${grp.user.id}-cat-${cat}`;
        bNodes.push({
          id: nodeId,
          type: 'categoryBubble',
          position: { x: laneX + col * 185, y: curY + 125 + row * 95 },
          data: {
            title: grp.user.full_name,
            category: cat,
            count: catAssets.length,
            assets: catAssets,
          },
        });
        bEdges.push({
          id: `edge-${uRootId}-${nodeId}`,
          source: uRootId,
          target: nodeId,
          style: { stroke: '#10b981', strokeWidth: 2 },
        });
      });

      const rows = Math.max(1, Math.ceil(uCats.length / 3));
      curY += 160 + rows * 95;
    });

    return { bubbleNodes: bNodes, bubbleEdges: bEdges };
  }, [diagramData]);

  // Modales
  const [newDeptModalOpen, setNewDeptModalOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [creatingDept, setCreatingDept] = useState(false);
  const [deptError, setDeptError] = useState<string | null>(null);

  const [assignDeptTarget, setAssignDeptTarget] = useState<string | null>(null);
  const [allAssets, setAllAssets] = useState<Asset[]>([]);
  const [assignSearch, setAssignSearch] = useState('');
  const [assignOnlyUnassigned, setAssignOnlyUnassigned] = useState(true);
  const [assignStatus, setAssignStatus] = useState<'ASSIGNED' | 'AVAILABLE'>('ASSIGNED');
  const [assignLocation, setAssignLocation] = useState<LocationType>('OPM');
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignFeedback, setAssignFeedback] = useState<string | null>(null);

  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [printFeedback, setPrintFeedback] = useState<{ id: string; ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    loadSummaries();
  }, []);

  useEffect(() => {
    if (selectedDept) {
      loadDepartmentDiagram(selectedDept);
    }
  }, [selectedDept]);

  const loadSummaries = async () => {
    try {
      setLoading(true);
      const data = await api.getDepartmentSummaries();
      setSummaries(data);
    } catch (err) {
      console.error('Error cargando departamentos:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDepartmentDiagram = async (deptName: string) => {
    try {
      const res = await api.getDepartmentDiagram(deptName);
      setDiagramData(res);
      setSelectedCategoryGroup(null);
    } catch (err) {
      console.error('Error cargando diagrama de departamento:', err);
    }
  };

  const openAssignModal = async (deptName: string) => {
    setAssignDeptTarget(deptName);
    setAssignFeedback(null);
    setAssignSearch('');
    const isSite =
      deptName.toUpperCase().includes('SITE') ||
      deptName.toUpperCase().includes('BODEGA') ||
      deptName.toUpperCase() === 'IT';
    setAssignStatus(isSite ? 'AVAILABLE' : 'ASSIGNED');
    try {
      const assets = await api.getAssets();
      setAllAssets(assets.filter((a) => a.status !== 'RETIRED'));
    } catch (err) {
      console.error('Error cargando activos:', err);
    }
  };

  const handleAssignToDept = async (asset: Asset) => {
    if (!assignDeptTarget) return;
    try {
      setAssigningId(asset.id);
      await api.assignAssetToDepartment({
        asset_id: asset.id,
        department: assignDeptTarget,
        location: assignLocation,
        status: assignStatus,
      });
      setAssignFeedback(`Equipo ${asset.asset_tag} asignado a ${assignDeptTarget}`);
      const refreshed = await api.getAssets();
      setAllAssets(refreshed.filter((a) => a.status !== 'RETIRED'));
      loadSummaries();
      if (selectedDept === assignDeptTarget) {
        loadDepartmentDiagram(assignDeptTarget);
      }
    } catch (err: any) {
      setAssignFeedback(`Error: ${err.message || 'No se pudo asignar'}`);
    } finally {
      setAssigningId(null);
    }
  };

  const handleUnassignDirectAsset = async (asset: Asset) => {
    if (!confirm(`¿Regresar ${asset.asset_tag} (${asset.model}) a stock general de IT?`)) return;
    try {
      await api.assignAssetToDepartment({
        asset_id: asset.id,
        department: 'IT',
        location: asset.location,
        status: 'AVAILABLE',
        notes: 'Retornado a stock IT desde departamento/site',
      });
      if (selectedDept) loadDepartmentDiagram(selectedDept);
      loadSummaries();
    } catch (err: any) {
      alert(err.message || 'Error al mover a stock IT');
    }
  };

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    try {
      setCreatingDept(true);
      setDeptError(null);
      const created = await api.createDepartment(newDeptName.trim().toUpperCase());
      setNewDeptModalOpen(false);
      setNewDeptName('');
      await loadSummaries();
      setSelectedDept(created.name);
    } catch (err: any) {
      setDeptError(err.message || 'No se pudo crear el departamento/site');
    } finally {
      setCreatingDept(false);
    }
  };

  const handlePrintBrother = async (assetId: string, tag: string) => {
    try {
      setPrintingId(assetId);
      setPrintFeedback(null);
      await api.printBrotherLabel(assetId);
      setPrintFeedback({ id: assetId, ok: true, msg: `Etiqueta ${tag} enviada` });
      setTimeout(() => setPrintFeedback(null), 3000);
    } catch (err: any) {
      setPrintFeedback({ id: assetId, ok: false, msg: err.message || 'Error al imprimir' });
    } finally {
      setPrintingId(null);
    }
  };

  const handleDeleteDept = async (deptName: string) => {
    if (
      !confirm(
        `¿Eliminar "${deptName}"?\nSus equipos sin persona asignada quedarán libres (AVAILABLE) para reasignarlos a otro departamento o lugar.`
      )
    ) {
      return;
    }
    try {
      await api.deleteDepartment(deptName);
      await loadSummaries();
    } catch (err: any) {
      alert(err.message || 'No se pudo eliminar el departamento/lugar');
    }
  };

  const getAreaBadge = (d: DepartmentSummary) => {
    const t = d.area_type || (d.is_site ? 'SITE' : 'DEPARTMENT');
    switch (t) {
      case 'SITE':
        return {
          label: 'Site / Bodega',
          badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
          iconWrap: 'bg-amber-100 text-amber-700',
          isSiteIcon: true,
        };
      case 'MEETING_ROOM':
        return {
          label: 'Sala de Juntas',
          badgeClass: 'bg-violet-50 text-violet-800 border-violet-200',
          iconWrap: 'bg-violet-100 text-violet-700',
          isSiteIcon: false,
        };
      case 'SHARED_SPACE':
        return {
          label: 'Espacio Compartido',
          badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
          iconWrap: 'bg-teal-100 text-teal-700',
          isSiteIcon: false,
        };
      default:
        return {
          label: 'Departamento',
          badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
          iconWrap: 'bg-sky-100 text-sky-700',
          isSiteIcon: false,
        };
    }
  };

  const filteredSummaries = summaries.filter((d) => {
    const t = d.area_type || (d.is_site ? 'SITE' : 'DEPARTMENT');
    if (typeFilter === 'SITES' && t !== 'SITE') return false;
    if (typeFilter === 'SPACES' && t !== 'MEETING_ROOM' && t !== 'SHARED_SPACE') return false;
    if (typeFilter === 'DEPTS' && t !== 'DEPARTMENT') return false;
    if (searchQuery.trim()) {
      return d.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const filteredAssignAssets = allAssets.filter((a) => {
    if (a.department === assignDeptTarget && !a.assigned_to_user_id) return false;
    if (assignOnlyUnassigned && a.assigned_to_user_id) return false;
    if (assignSearch.trim()) {
      const q = assignSearch.toLowerCase();
      return (
        a.asset_tag.toLowerCase().includes(q) ||
        a.serial_number.toLowerCase().includes(q) ||
        a.model.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        (a.department || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  // =========================================================================
  // VISTA 1: LISTADO DE DEPARTAMENTOS Y BODEGAS / SITES
  // =========================================================================
  if (!selectedDept) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Departamentos, Bodegas y Sites
            </h2>
            <p className="text-xs text-slate-500">
              Administra equipos asignados directamente a un área o site (Site 1, Site 2, Producción, etc.) y consulta los diagramas por colaborador
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setDeptError(null);
                setNewDeptModalOpen(true);
              }}
              className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Depto / Site</span>
            </button>
            <button
              onClick={loadSummaries}
              className="p-2.5 text-slate-500 hover:bg-slate-100 rounded-xl border border-slate-200"
              title="Recargar"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Barra de Filtros */}
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar departamento o site (ej. SITE 1, PRODUCTION)..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                typeFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Todos ({summaries.length})
            </button>
            <button
              onClick={() => setTypeFilter('SITES')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                typeFilter === 'SITES' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Sites / Bodegas
            </button>
            <button
              onClick={() => setTypeFilter('SPACES')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                typeFilter === 'SPACES' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Salas / Espacios
            </button>
            <button
              onClick={() => setTypeFilter('DEPTS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                typeFilter === 'DEPTS' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Departamentos
            </button>
          </div>
        </div>

        {/* Tabla de Departamentos y Sites */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50/80">
                  <th className="py-3.5 px-6">Departamento / Site</th>
                  <th className="py-3.5 px-4">Tipo</th>
                  <th className="py-3.5 px-4 text-center">Directos en Área</th>
                  <th className="py-3.5 px-4 text-center">En Personas</th>
                  <th className="py-3.5 px-4 text-center">Colaboradores</th>
                  <th className="py-3.5 px-4 text-center">Total Equipos</th>
                  <th className="py-3.5 px-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredSummaries.map((d) => {
                  const badge = getAreaBadge(d);
                  return (
                  <tr
                    key={d.name}
                    onClick={() => setSelectedDept(d.name)}
                    className="hover:bg-sky-50/40 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${badge.iconWrap}`}
                        >
                          {badge.isSiteIcon ? (
                            <Warehouse className="w-4 h-4" />
                          ) : (
                            <Building2 className="w-4 h-4" />
                          )}
                        </div>
                        <span className="font-bold text-slate-900 group-hover:text-sky-700">
                          {d.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${badge.badgeClass}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-sky-700">
                      {d.direct_assets}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-emerald-700">
                      {d.user_assets}
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold text-slate-700">
                      {d.users_count}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-bold text-slate-900 px-2.5 py-1 bg-slate-100 rounded-lg">
                        {d.total_assets}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDept(d.name);
                          }}
                          className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs px-2.5 py-1.5 rounded-lg shadow-xs transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openAssignModal(d.name);
                          }}
                          className="inline-flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs px-2.5 py-1.5 rounded-lg shadow-xs transition"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>Asignar</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDept(d.name);
                          }}
                          className="inline-flex items-center justify-center p-1.5 text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition"
                          title="Eliminar y liberar equipos"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Crear Departamento / Site */}
        {newDeptModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <h3 className="text-sm font-bold text-slate-900">Nuevo Departamento o Site / Bodega</h3>
                <button
                  onClick={() => setNewDeptModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreateDept} className="p-6 space-y-4 text-xs">
                {deptError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{deptError}</span>
                  </div>
                )}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Nombre (ej. SITE 3, BODEGA TI, ENGINEERING)
                  </label>
                  <input
                    type="text"
                    required
                    value={newDeptName}
                    onChange={(e) => setNewDeptName(e.target.value)}
                    placeholder="ej. BODEGA SITE 1"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-semibold uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setNewDeptModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-600 rounded-xl font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creatingDept}
                    className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl"
                  >
                    {creatingDept ? 'Creando...' : 'Crear'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Asignar Equipos al Depto / Site */}
        {assignDeptTarget && renderAssignModal()}
      </div>
    );
  }

  function renderAssignModal() {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Asignar Equipos a: <span className="text-sky-700">{assignDeptTarget}</span>
              </h3>
              <p className="text-xs text-slate-500">
                Busca por código de barras, serie, hostname o modelo para asignarlo directamente a este departamento o bodega
              </p>
            </div>
            <button
              onClick={() => setAssignDeptTarget(null)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 border-b border-slate-200 space-y-3 bg-white text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-6 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  autoFocus
                  value={assignSearch}
                  onChange={(e) => setAssignSearch(e.target.value)}
                  placeholder="Escanear serie / tag o buscar modelo..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div className="sm:col-span-3">
                <select
                  value={assignStatus}
                  onChange={(e) => setAssignStatus(e.target.value as 'ASSIGNED' | 'AVAILABLE')}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-semibold"
                >
                  <option value="ASSIGNED">En Uso (ASSIGNED)</option>
                  <option value="AVAILABLE">En Stock / Bodega (AVAILABLE)</option>
                </select>
              </div>
              <div className="sm:col-span-3">
                <select
                  value={assignLocation}
                  onChange={(e) => setAssignLocation(e.target.value as LocationType)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-semibold"
                >
                  <option value="OPM">Sede: OPM</option>
                  <option value="OMEX">Sede: OMEX</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 font-medium">
                <input
                  type="checkbox"
                  checked={assignOnlyUnassigned}
                  onChange={(e) => setAssignOnlyUnassigned(e.target.checked)}
                  className="rounded border-slate-300 text-sky-600"
                />
                <span>Mostrar solo equipos sin persona asignada</span>
              </label>

              {assignFeedback && (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  {assignFeedback}
                </span>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredAssignAssets.slice(0, 80).map((a) => (
              <div
                key={a.id}
                className="px-6 py-3 flex items-center justify-between gap-4 hover:bg-slate-50 text-xs"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">{a.asset_tag}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {a.category}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-sky-50 text-sky-700">
                      Depto actual: {a.department || 'Sin asignar'}
                    </span>
                  </div>
                  <div className="text-slate-600 mt-0.5 truncate">
                    {a.brand} {a.model} • S/N: <span className="font-mono">{a.serial_number}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleAssignToDept(a)}
                  disabled={assigningId === a.id}
                  className="shrink-0 bg-sky-600 hover:bg-sky-700 text-white font-bold px-3.5 py-1.5 rounded-lg transition disabled:opacity-50"
                >
                  {assigningId === a.id ? 'Asignando...' : 'Asignar aquí'}
                </button>
              </div>
            ))}
            {filteredAssignAssets.length === 0 && (
              <div className="py-12 text-center text-slate-400 text-xs italic">
                No se encontraron equipos disponibles con ese filtro.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VISTA 2: DETALLE DE DEPARTAMENTO / SITE (LISTA + DIAGRAMA)
  // =========================================================================
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5 flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Barra superior */}
      <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setSelectedDept(null);
              setDiagramData(null);
            }}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Todos</span>
          </button>

          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            {summaries.map((d) => (
              <option key={d.name} value={d.name}>
                {d.name} ({d.total_assets})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => openAssignModal(selectedDept)}
            className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Asignar Equipos a {selectedDept}</span>
          </button>
          <button
            onClick={() => loadDepartmentDiagram(selectedDept)}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl border border-slate-200"
            title="Recargar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Ficha Resumen + Selector de Pestañas */}
      {diagramData && (
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-800 to-sky-600 text-white flex items-center justify-center shadow-sm">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{diagramData.department}</h3>
              <p className="text-xs text-slate-500">
                Activos directos del área/bodega + diagramas separados por colaborador asignado
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="text-center px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Total</span>
              <span className="text-sm font-bold text-slate-900">{diagramData.summary.total}</span>
            </div>
            <div className="text-center px-3 py-1.5 bg-sky-50 rounded-xl border border-sky-200 text-sky-800">
              <span className="text-[10px] text-sky-600 block uppercase font-bold">En Área/Site</span>
              <span className="text-sm font-bold">{diagramData.summary.direct}</span>
            </div>
            <div className="text-center px-3 py-1.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800">
              <span className="text-[10px] text-emerald-600 block uppercase font-bold">En Personas</span>
              <span className="text-sm font-bold">{diagramData.summary.assigned_to_users}</span>
            </div>
            <div className="text-center px-3 py-1.5 bg-indigo-50 rounded-xl border border-indigo-200 text-indigo-800">
              <span className="text-[10px] text-indigo-600 block uppercase font-bold">Personas</span>
              <span className="text-sm font-bold">{diagramData.summary.users_count}</span>
            </div>
          </div>
        </div>
      )}

      {/* Pestañas Lista vs Diagrama */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => setActiveTab('LIST')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'LIST'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <List className="w-4 h-4" />
          <span>Lista y Gestión ({diagramData?.summary.total || 0})</span>
        </button>
        <button
          onClick={() => setActiveTab('DIAGRAM')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'DIAGRAM'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <CircleDot className="w-4 h-4" />
          <span>Conjuntos de Equipos</span>
        </button>
      </div>

      {/* Contenido de Pestañas */}
      {activeTab === 'LIST' && diagramData && (
        <div className="space-y-6">
          {/* Bloque A: Equipos directos en el departamento / bodega */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Warehouse className="w-4 h-4 text-sky-600" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Equipos asignados directamente a {diagramData.department} ({diagramData.direct_assets.length})
                </h4>
              </div>
              {printFeedback && (
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
                    printFeedback.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                  }`}
                >
                  {printFeedback.msg}
                </span>
              )}
            </div>

            {diagramData.direct_assets.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 italic">
                No hay equipos asignados directamente sin persona en {diagramData.department}.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500 bg-slate-50/50">
                      <th className="py-3 px-5">Tag</th>
                      <th className="py-3 px-4">Categoría</th>
                      <th className="py-3 px-4">Marca / Modelo</th>
                      <th className="py-3 px-4">Serial</th>
                      <th className="py-3 px-4">Estado</th>
                      <th className="py-3 px-5 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {diagramData.direct_assets.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50">
                        <td className="py-3 px-5 font-mono font-bold text-slate-900">{a.asset_tag}</td>
                        <td className="py-3 px-4 font-semibold text-slate-700">{a.category}</td>
                        <td className="py-3 px-4 text-slate-800">
                          {a.brand} {a.model}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">{a.serial_number}</td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            {a.status}
                          </span>
                        </td>
                        <td className="py-3 px-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handlePrintBrother(a.id, a.asset_tag)}
                              disabled={printingId === a.id}
                              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200"
                              title="Imprimir etiqueta Brother"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingAsset(a)}
                              className="p-1.5 text-amber-700 hover:bg-amber-50 rounded-lg border border-amber-200"
                              title="Editar equipo"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleUnassignDirectAsset(a)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg border border-red-200"
                              title="Regresar a stock IT"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Bloque B: Colaboradores del departamento y sus equipos */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wide">
              <Users className="w-4 h-4 text-emerald-600" />
              <span>Equipos asignados a colaboradores en {diagramData.department} ({diagramData.user_groups.length})</span>
            </div>

            {diagramData.user_groups.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-[#E2E8F0] text-center text-xs text-slate-400 italic">
                No hay colaboradores con equipos asignados en este departamento.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {diagramData.user_groups.map((grp) => (
                  <div
                    key={grp.user.id}
                    className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden"
                  >
                    <div className="px-5 py-3.5 bg-emerald-50/70 border-b border-emerald-100 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-900">{grp.user.full_name}</div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {grp.user.employee_code} {grp.user.position ? `• ${grp.user.position}` : ''}
                        </div>
                      </div>
                      <span className="text-xs font-bold bg-white text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                        {grp.assets.length} equipo(s)
                      </span>
                    </div>
                    <div className="divide-y divide-slate-100 text-xs">
                      {grp.assets.map((a) => (
                        <div key={a.id} className="px-5 py-2.5 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span className="font-mono font-bold text-slate-800">{a.asset_tag}</span>
                            <span className="text-slate-400 mx-1.5">•</span>
                            <span className="font-semibold text-slate-700">{a.category}</span>
                            <div className="text-[11px] text-slate-500 truncate">
                              {a.brand} {a.model} — S/N: {a.serial_number}
                            </div>
                          </div>
                          <button
                            onClick={() => setEditingAsset(a)}
                            className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg"
                            title="Editar equipo"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pestaña 2: Diagrama de Burbujas Conectadas por Categoría */}
      {activeTab === 'DIAGRAM' && diagramData && (
        <div className="space-y-4">
          <div
            className="w-full h-[640px] min-h-[600px] bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden"
            style={{ width: '100%', height: '640px' }}
          >
            <ReactFlow
              key={`${selectedDept}-${bubbleNodes.length}`}
              nodes={bubbleNodes}
              edges={bubbleEdges}
              nodeTypes={bubbleNodeTypes}
              onNodeClick={(_, node: any) => {
                if (node.type === 'categoryBubble' && node.data?.assets) {
                  setSelectedCategoryGroup({
                    title: node.data.title,
                    category: node.data.category,
                    assets: node.data.assets,
                  });
                }
              }}
              fitView
              fitViewOptions={{ padding: 0.2 }}
            >
              <Background color="#cbd5e1" gap={20} />
              <Controls />
            </ReactFlow>
          </div>

          {/* Desglose al hacer clic en cualquier burbuja de categoría */}
          {selectedCategoryGroup && (
            <div className="bg-white rounded-2xl border-2 border-sky-300 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 bg-sky-50/70 border-b border-sky-200 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  {renderSmallCatIcon(selectedCategoryGroup.category)}
                  <span>
                    {selectedCategoryGroup.title} — {selectedCategoryGroup.category} (
                    {selectedCategoryGroup.assets.length})
                  </span>
                </div>
                <button
                  onClick={() => setSelectedCategoryGroup(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="divide-y divide-slate-100 text-xs max-h-64 overflow-y-auto">
                {selectedCategoryGroup.assets.map((a) => (
                  <div key={a.id} className="px-5 py-2.5 flex items-center justify-between gap-3">
                    <div>
                      <span className="font-mono font-bold text-slate-900">{a.asset_tag}</span>
                      <span className="text-slate-400 mx-2">•</span>
                      <span className="text-slate-700">
                        {a.brand} {a.model}
                      </span>
                      <span className="text-slate-400 mx-2">•</span>
                      <span className="font-mono text-slate-500">S/N: {a.serial_number}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handlePrintBrother(a.id, a.asset_tag)}
                        className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200"
                        title="Imprimir etiqueta Brother"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingAsset(a)}
                        className="p-1.5 text-amber-700 hover:bg-amber-50 rounded-lg border border-amber-200"
                        title="Editar equipo"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {assignDeptTarget && renderAssignModal()}

      {editingAsset && (
        <AssetFormModal
          assetToEdit={editingAsset}
          users={[]}
          availableLaptops={[]}
          onClose={() => setEditingAsset(null)}
          onSuccess={() => {
            setEditingAsset(null);
            if (selectedDept) loadDepartmentDiagram(selectedDept);
            loadSummaries();
          }}
        />
      )}
    </div>
  );
};
