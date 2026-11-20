import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  Node,
  Edge,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import {
  User as UserIcon,
  Laptop,
  Monitor,
  Cpu,
  Headphones,
  FileText,
  ArrowsLeftRight as ArrowLeftRight,
  PlusCircle,
  Warning as AlertTriangle,
  ClockCounterClockwise as History,
  ShieldCheck as Shield,
  Clock,
  CheckCircle,
  ArrowSquareOut as ExternalLink,
  MagnifyingGlass as Search,
  ArrowLeft,
  UserPlus,
  ArrowsClockwise as RefreshCw,
  Package as Box,
  ShareNetwork as Share2,
  Eye,
  Barcode,
  DeviceMobile as Smartphone,
  Radio,
  Printer,
  PencilSimple as Edit3,
  Trash as Trash2,
  ListBullets as List,
  Graph as Network,
  Check,
  Tag,
  Rows,
  CaretDown,
  CaretRight,
  CaretLeft,
  X,
  ArrowsDownUp,
} from '@phosphor-icons/react';
import { HardwareIcon, BrandTag } from '../components/HardwareIcon';

import { User, Asset, UserDiagramResponse, AssetHistory, AlertItem } from '../types';
import { api } from '../api';
import { ResponsivaModal } from '../components/ResponsivaModal';
import { SwapModal } from '../components/SwapModal';
import { UserFormModal } from '../components/UserFormModal';
import { CopyButton } from '../components/CopyButton';
import { QuickUserAuditModal } from '../components/QuickUserAuditModal';
import { QuickUserAssignModal } from '../components/QuickUserAssignModal';
import { AssetFormModal } from '../components/AssetFormModal';

// --- NODOS PERSONALIZADOS PARA REACT FLOW ---
const CustomUserNode = ({ data }: { data: any }) => (
  <div className="bg-white rounded-xl border-2 border-sky-600 p-3.5 shadow-md min-w-[220px] text-xs">
    <Handle type="source" position={Position.Bottom} className="!bg-sky-600" />
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
        <UserIcon className="w-5 h-5" />
      </div>
      <div>
        <h4 className="font-bold text-slate-900 leading-tight">{data.full_name}</h4>
        <p className="text-[11px] text-slate-500 font-mono">{data.employee_code}</p>
      </div>
    </div>
    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
      <span>{data.department}</span>
      <span className="font-semibold text-sky-700">{data.location}</span>
    </div>
  </div>
);

const CustomLaptopNode = ({ data }: { data: any }) => (
  <div className="bg-white rounded-xl border-2 border-slate-800 p-3.5 shadow-md min-w-[240px] text-xs">
    <Handle type="target" position={Position.Top} className="!bg-slate-800" />
    <Handle type="source" position={Position.Bottom} className="!bg-slate-800" />
    <div className="flex items-center justify-between mb-1.5">
      <div className="flex items-center gap-1.5 text-sky-700 font-bold text-[10px] uppercase tracking-wider">
        <Laptop className="w-3.5 h-3.5" />
        <span>Laptop Primaria</span>
      </div>
      <span className="font-mono text-[10px] font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
        {data.asset_tag}
      </span>
    </div>
    <p className="font-bold text-slate-900 text-xs">
      {data.brand} {data.model}
    </p>
    <p className="text-[11px] font-mono text-slate-500 mt-0.5">S/N: {data.serial_number}</p>
    <div className="mt-2 pt-1.5 border-t border-slate-100 text-[10px] text-slate-400 truncate">
      {data.specs?.ram || data.specs?.cpu ? `${data.specs.ram || ''} • ${data.specs.cpu || ''}` : data.location}
    </div>
  </div>
);

const CustomDockingNode = ({ data }: { data: any }) => (
  <div className="bg-white rounded-xl border border-teal-500 p-3 shadow-sm min-w-[210px] text-xs">
    <Handle type="target" position={Position.Top} className="!bg-teal-600" />
    <div className="flex items-center justify-between mb-1">
      <div className="flex items-center gap-1.5 text-teal-700 font-bold text-[10px] uppercase">
        <Cpu className="w-3.5 h-3.5" />
        <span>Docking Station</span>
      </div>
      <span className="font-mono text-[10px] font-bold text-slate-700">{data.asset_tag}</span>
    </div>
    <p className="font-semibold text-slate-900">{data.model}</p>
    <p className="text-[11px] font-mono text-slate-500">S/N: {data.serial_number}</p>
    <div className="mt-1 text-[10px] text-teal-700 font-medium">
      {data.specs?.power_watts ? `Potencia: ${data.specs.power_watts}W` : 'Conectado a Laptop'}
    </div>
  </div>
);

const CustomMonitorNode = ({ data }: { data: any }) => (
  <div className="bg-white rounded-xl border border-indigo-400 p-3 shadow-sm min-w-[210px] text-xs">
    <Handle type="target" position={Position.Top} className="!bg-indigo-600" />
    <div className="flex items-center justify-between mb-1">
      <div className="flex items-center gap-1.5 text-indigo-700 font-bold text-[10px] uppercase">
        <Monitor className="w-3.5 h-3.5" />
        <span>Monitor</span>
      </div>
      <span className="font-mono text-[10px] font-bold text-slate-700">{data.asset_tag}</span>
    </div>
    <p className="font-semibold text-slate-900">{data.model}</p>
    <p className="text-[11px] font-mono text-slate-500">S/N: {data.serial_number}</p>
    <div className="mt-1 text-[10px] text-indigo-600">
      {data.specs?.inches ? `${data.specs.inches}" Pulgadas` : 'Pantalla externa'}
    </div>
  </div>
);

const CustomPhoneNode = ({ data }: { data: any }) => (
  <div className="bg-white rounded-xl border-2 border-emerald-600 p-3.5 shadow-md min-w-[230px] text-xs">
    <Handle type="target" position={Position.Top} className="!bg-emerald-600" />
    <Handle type="source" position={Position.Bottom} className="!bg-emerald-600" />
    <div className="flex items-center justify-between mb-1.5">
      <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-[10px] uppercase tracking-wider">
        <Smartphone className="w-3.5 h-3.5" />
        <span>{data.category === 'IPAD' ? 'iPad / Tablet' : 'Línea Móvil'}</span>
      </div>
      <span className="font-mono text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
        {data.asset_tag}
      </span>
    </div>
    <p className="font-bold text-slate-900 text-xs">
      {data.brand} {data.model}
    </p>
    <p className="text-[11px] font-mono text-slate-500 mt-0.5">S/N: {data.serial_number}</p>
    <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
      <span className="font-mono truncate max-w-[140px]">
        {data.specs?.imei ? `IMEI: ${data.specs.imei}` : data.specs?.description || 'Dispositivo Móvil'}
      </span>
      <span className="font-semibold text-emerald-700">{data.location}</span>
    </div>
  </div>
);

const CustomPeripheralNode = ({ data }: { data: any }) => {
  const isAudio = data.category === 'AUDIFONOS';
  const isSim = data.category === 'SIM-CARD';
  const isScanner = data.category === 'SCANNER';

  return (
    <div className="bg-white rounded-xl border border-slate-300 p-2.5 shadow-xs min-w-[190px] text-xs">
      <Handle type="target" position={Position.Top} className="!bg-slate-400" />
      <Handle type="source" position={Position.Bottom} className="!bg-slate-400" />
      <div className="flex items-center justify-between mb-0.5">
        <div className="flex items-center gap-1 text-slate-600 font-bold text-[9px] uppercase">
          {isAudio && <Headphones className="w-3 h-3 text-amber-600" />}
          {isSim && <Radio className="w-3 h-3 text-purple-600" />}
          {isScanner && <Barcode className="w-3 h-3 text-indigo-600" />}
          {!isAudio && !isSim && !isScanner && <Box className="w-3 h-3 text-slate-500" />}
          <span>{data.category}</span>
        </div>
        <span className="font-mono text-[9px] text-slate-500">{data.asset_tag}</span>
      </div>
      <p className="font-medium text-slate-800 truncate">{data.brand} {data.model}</p>
      <p className="text-[10px] font-mono text-slate-400">S/N: {data.serial_number}</p>
      {data.specs?.puk && <p className="text-[9px] text-purple-600 font-mono">PUK: {data.specs.puk}</p>}
    </div>
  );
};

export const UsersDiagramView: React.FC = () => {
  // Estado para alternar entre Tabla de Usuarios y Vista de Diagrama
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Lista general de usuarios y filtros
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedLocation, setSelectedLocation] = useState<string>('ALL');
  const [custodyFilter, setCustodyFilter] = useState<'ALL' | 'WITH_ASSETS' | 'WITHOUT_ASSETS'>('ALL');
  const [userGroupBy, setUserGroupBy] = useState<'none' | 'department' | 'location'>('none');
  const [collapsedUserGroups, setCollapsedUserGroups] = useState<Record<string, boolean>>({});
  const [userSortBy, setUserSortBy] = useState<'name_asc' | 'name_desc' | 'assets_desc' | 'dept_asc'>('name_asc');
  const [userPageSize, setUserPageSize] = useState(25);
  const [userPage, setUserPage] = useState(1);
  const [assetSearchQuery, setAssetSearchQuery] = useState('');

  // Modal para crear / editar usuario
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Modal para auditoría rápida dirigida al usuario
  const [auditTargetUser, setAuditTargetUser] = useState<User | null>(null);

  // Datos para el diagrama cuando un usuario está seleccionado
  const [diagramData, setDiagramData] = useState<UserDiagramResponse | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [userHistory, setUserHistory] = useState<AssetHistory[]>([]);
  const [userAlerts, setUserAlerts] = useState<AlertItem[]>([]);

  // Modales secundarios de la vista de detalle
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [responsivaModalOpen, setResponsivaModalOpen] = useState(false);
  const [assignTargetUser, setAssignTargetUser] = useState<User | null>(null);
  const [availableStockAssets, setAvailableStockAssets] = useState<Asset[]>([]);

  // Pestaña en vista de detalle: LIST (Lista y gestión) vs DIAGRAM (Diagrama de red)
  const [activeDetailTab, setActiveDetailTab] = useState<'LIST' | 'DIAGRAM'>('LIST');

  // Estado para editar un activo directamente desde el listado del colaborador
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

  // Estados para impresión Brother PT-D410
  const [printingAssetId, setPrintingAssetId] = useState<string | null>(null);
  const [printFeedback, setPrintFeedback] = useState<{ id: string; success: boolean; msg: string } | null>(null);
  const [batchPrintProgress, setBatchPrintProgress] = useState<{ current: number; total: number; tag: string } | null>(null);

  const nodeTypes = useMemo(
    () => ({
      userNode: CustomUserNode,
      laptopNode: CustomLaptopNode,
      phoneNode: CustomPhoneNode,
      dockingNode: CustomDockingNode,
      monitorNode: CustomMonitorNode,
      peripheralNode: CustomPeripheralNode,
    }),
    []
  );

  const handleUnassign = async (asset: Asset) => {
    const confirmMsg = `¿Desasignar el equipo ${asset.asset_tag} (${asset.brand} ${asset.model}) de ${currentUser?.full_name} y devolverlo a stock DISPONIBLE?`;
    if (!window.confirm(confirmMsg)) {
      return;
    }

    try {
      await api.unassignAsset({
        asset_id: asset.id,
        notes: `Desasignado desde la administración de ${currentUser?.full_name}`,
      });
      if (selectedUserId) await loadUserDetails(selectedUserId);
      await loadUsers();
    } catch (err: any) {
      alert(`Error al desasignar: ${err.message}`);
    }
  };

  const handlePrintBrother = async (asset: Asset) => {
    try {
      setPrintingAssetId(asset.id);
      setPrintFeedback(null);
      const res = await api.printBrotherLabel(asset.id);
      setPrintFeedback({ id: asset.id, success: true, msg: `Etiqueta impresa en Brother (${res.printer || 'PT-D410'})` });
      setTimeout(() => setPrintFeedback(null), 4000);
    } catch (err: any) {
      setPrintFeedback({ id: asset.id, success: false, msg: `Error de impresión: ${err.message}` });
      setTimeout(() => setPrintFeedback(null), 5000);
    } finally {
      setPrintingAssetId(null);
    }
  };

  const handlePrintAllLabels = async () => {
    const assets = currentUser?.assigned_assets || [];
    if (assets.length === 0 || batchPrintProgress) return;

    if (!window.confirm(`¿Enviar a imprimir las ${assets.length} etiquetas de los equipos de ${currentUser?.full_name} juntas en un solo trabajo a la Brother PT-D410?`)) {
      return;
    }

    try {
      setBatchPrintProgress({ current: 1, total: assets.length, tag: 'Lote' });
      setPrintFeedback({
        id: 'batch',
        success: true,
        msg: `Enviando lote de ${assets.length} etiquetas en una sola tira continua a Brother PT-D410...`,
      });
      const res = await api.printBrotherBatch(assets.map((a) => a.id));
      setPrintFeedback({
        id: 'batch',
        success: true,
        msg: `Lote enviado: ${res.count || assets.length} etiquetas impresas juntas en ${res.printer || 'Brother PT-D410'}. Ya puedes cortar la tira al terminar.`,
      });
    } catch (err: any) {
      setPrintFeedback({
        id: 'batch',
        success: false,
        msg: `Error al imprimir lote: ${err.message}`,
      });
    } finally {
      setBatchPrintProgress(null);
      setTimeout(() => setPrintFeedback(null), 7000);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      loadUserDetails(selectedUserId);
    }
  }, [selectedUserId]);

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const data = await api.getUsers({ active: true });
      setUsers(data);
    } catch (err) {
      console.error('Error cargando colaboradores:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadUserDetails = async (userId: string) => {
    try {
      const [diag, alerts, stock] = await Promise.all([
        api.getUserDiagram(userId),
        api.getAlerts().catch(() => []),
        api.getAssets({ status: 'AVAILABLE' }).catch(() => []),
      ]);

      setDiagramData(diag);
      setAvailableStockAssets(stock);

      // Filtrar alertas para este usuario
      const userSpecificAlerts = alerts.filter(
        (a) => a.user_id === userId || (a.asset_tag && diag.user.assigned_assets?.some((ast) => ast.asset_tag === a.asset_tag))
      );
      setUserAlerts(userSpecificAlerts);

      // Cargar historial de sus activos asignados
      if (diag.user.assigned_assets && diag.user.assigned_assets.length > 0) {
        const histories = await Promise.all(
          diag.user.assigned_assets.slice(0, 4).map((a) => api.getAssetHistory(a.id))
        );
        setUserHistory(histories.flat().slice(0, 10));
      } else {
        setUserHistory([]);
      }

      // Mapear nodos para React Flow
      setNodes(diag.nodes as Node[]);
      setEdges(
        diag.edges.map((e) => ({
          ...e,
          style: { stroke: '#94A3B8', strokeWidth: 1.5 },
        })) as Edge[]
      );
    } catch (err) {
      console.error('Error cargando diagrama de usuario:', err);
    }
  };

  const onNodesChange = useCallback(
    (changes: any) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes: any) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  // Filtrado de la tabla de usuarios
  const departments = useMemo(() => {
    const set = new Set<string>();
    users.forEach((u) => {
      if (u.department) set.add(u.department);
    });
    return Array.from(set);
  }, [users]);

  const locations = useMemo(() => {
    const set = new Set<string>();
    users.forEach((u) => {
      if (u.location) set.add(u.location);
    });
    return Array.from(set);
  }, [users]);

  const filteredUsers = useMemo(() => {
    const list = users.filter((u) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        u.full_name.toLowerCase().includes(q) ||
        u.employee_code.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.position || '').toLowerCase().includes(q);

      const matchDept = selectedDept === 'ALL' || u.department === selectedDept;
      const matchLoc = selectedLocation === 'ALL' || u.location === selectedLocation;

      const assetsCount = u.assets_count || u.assigned_assets?.length || 0;
      const matchCustody =
        custodyFilter === 'ALL' ||
        (custodyFilter === 'WITH_ASSETS' && assetsCount > 0) ||
        (custodyFilter === 'WITHOUT_ASSETS' && assetsCount === 0);

      return matchSearch && matchDept && matchLoc && matchCustody;
    });

    list.sort((a, b) => {
      if (userSortBy === 'name_desc') return b.full_name.localeCompare(a.full_name);
      if (userSortBy === 'dept_asc') return a.department.localeCompare(b.department) || a.full_name.localeCompare(b.full_name);
      if (userSortBy === 'assets_desc') {
        const ca = a.assets_count || a.assigned_assets?.length || 0;
        const cb = b.assets_count || b.assigned_assets?.length || 0;
        return cb - ca || a.full_name.localeCompare(b.full_name);
      }
      return a.full_name.localeCompare(b.full_name);
    });

    return list;
  }, [users, searchQuery, selectedDept, selectedLocation, custodyFilter, userSortBy]);

  const userTotalPages = Math.max(1, Math.ceil(filteredUsers.length / userPageSize));
  const safeUserPage = Math.min(userPage, userTotalPages);
  const userStartIdx = (safeUserPage - 1) * userPageSize;
  const userEndIdx = Math.min(userStartIdx + userPageSize, filteredUsers.length);
  const pagedUsers = useMemo(
    () => filteredUsers.slice(userStartIdx, userEndIdx),
    [filteredUsers, userStartIdx, userEndIdx]
  );

  const groupedUsers = useMemo(() => {
    if (userGroupBy === 'none') return null;
    const map = new Map<string, User[]>();
    filteredUsers.forEach((u) => {
      const key = userGroupBy === 'department' ? u.department || 'Sin departamento' : u.location || 'Sin sede';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(u);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [filteredUsers, userGroupBy]);

  const currentUser = diagramData?.user;

  // RENDER 1: TABLA DE USUARIOS (VISTA PRINCIPAL)
  if (!selectedUserId) {
    return (
      <div className="p-8 space-y-6 max-w-7xl mx-auto">
        {/* Cabecera Principal */}
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Colaboradores y Custodia de Hardware
            </h2>
            <p className="text-xs text-slate-500">
              Inventario de equipos por colaborador, asignaciones activas y diagramas interactivos de red
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setUserModalOpen(true)}
              className="flex items-center gap-2 bg-[#5B4FE9] hover:bg-[#4B3FD8] text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs transition active:scale-[0.98]"
            >
              <UserPlus weight="duotone" className="w-4 h-4" />
              <span>Nuevo Colaborador</span>
            </button>
            <button
              onClick={loadUsers}
              aria-label="Recargar colaboradores"
              className="p-2.5 text-slate-500 hover:bg-slate-100 rounded-xl border border-[#E6E8F0]"
              title="Recargar colaboradores"
            >
              <RefreshCw className={`w-4 h-4 ${loadingUsers ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Barra de Filtros, Agrupación y Orden */}
        <div className="bg-white p-4 rounded-2xl border border-[#E6E8F0] shadow-2xs space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            {/* Buscador instantáneo */}
            <div className="sm:col-span-4 relative">
              <Search weight="duotone" className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setUserPage(1);
                }}
                placeholder="Buscar nombre, nómina, correo o puesto..."
                className="w-full pl-10 pr-8 py-2 bg-[#F6F7FB] border border-[#E6E8F0] rounded-xl text-xs text-slate-900 focus:bg-white transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setUserPage(1);
                  }}
                  aria-label="Limpiar búsqueda"
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700"
                >
                  <X weight="bold" className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filtro Departamento */}
            <div className="sm:col-span-3">
              <select
                value={selectedDept}
                onChange={(e) => {
                  setSelectedDept(e.target.value);
                  setUserPage(1);
                }}
                aria-label="Filtrar por departamento"
                className="w-full bg-[#F6F7FB] border border-[#E6E8F0] rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
              >
                <option value="ALL">Todos los Departamentos</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro Sede */}
            <div className="sm:col-span-2">
              <select
                value={selectedLocation}
                onChange={(e) => {
                  setSelectedLocation(e.target.value);
                  setUserPage(1);
                }}
                aria-label="Filtrar por sede"
                className="w-full bg-[#F6F7FB] border border-[#E6E8F0] rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
              >
                <option value="ALL">Todas las Sedes</option>
                {locations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro Custodia */}
            <div className="sm:col-span-3">
              <select
                value={custodyFilter}
                onChange={(e) => {
                  setCustodyFilter(e.target.value as any);
                  setUserPage(1);
                }}
                aria-label="Filtrar por custodia"
                className="w-full bg-[#F6F7FB] border border-[#E6E8F0] rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
              >
                <option value="ALL">Custodia: Todos</option>
                <option value="WITH_ASSETS">Con Equipos</option>
                <option value="WITHOUT_ASSETS">Sin Equipos</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span className="tabular-nums">
              Mostrando <strong className="text-slate-800">{filteredUsers.length}</strong> de{' '}
              <strong className="text-slate-800">{users.length}</strong> colaboradores
            </span>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 bg-[#F6F7FB] border border-[#E6E8F0] rounded-xl px-2.5 py-1">
                <Rows weight="duotone" className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={userGroupBy}
                  onChange={(e) => setUserGroupBy(e.target.value as any)}
                  aria-label="Agrupar colaboradores por"
                  className="bg-transparent font-semibold text-slate-700 text-xs focus:outline-none cursor-pointer"
                >
                  <option value="none">Sin agrupar</option>
                  <option value="department">Agrupar: Departamento</option>
                  <option value="location">Agrupar: Sede</option>
                </select>
              </div>

              <div className="inline-flex items-center gap-1.5 bg-[#F6F7FB] border border-[#E6E8F0] rounded-xl px-2.5 py-1">
                <ArrowsDownUp weight="duotone" className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={userSortBy}
                  onChange={(e) => setUserSortBy(e.target.value as any)}
                  aria-label="Ordenar colaboradores por"
                  className="bg-transparent font-semibold text-slate-700 text-xs focus:outline-none cursor-pointer"
                >
                  <option value="name_asc">Orden: Nombre A–Z</option>
                  <option value="name_desc">Orden: Nombre Z–A</option>
                  <option value="assets_desc">Orden: Más equipos</option>
                  <option value="dept_asc">Orden: Departamento</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla de Colaboradores con Primera Columna Fija */}
        <div className="bg-white rounded-2xl border border-[#E6E8F0] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E6E8F0] text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                  <th className="sticky left-0 z-10 bg-[#F8FAFC] py-3 px-6 border-r border-slate-100 shadow-[2px_0_6px_-2px_rgba(15,23,42,0.06)]">
                    Colaborador / Nómina
                  </th>
                  <th className="py-3 px-4">Área y Sede</th>
                  <th className="py-3 px-6">Equipos Asignados en Custodia</th>
                  <th className="py-3 px-3 text-center">Total</th>
                  <th className="py-3 px-4 text-center">Estatus</th>
                  <th className="py-3 px-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(() => {
                  const renderUserRow = (u: User) => {
                  const totalAssets = u.assets_count || u.assigned_assets?.length || 0;

                  return (
                    <tr
                      key={u.id}
                      onClick={() => setSelectedUserId(u.id)}
                      className="hover:bg-[#F8FAFC] cursor-pointer transition group"
                    >
                      {/* Colaborador (Pinned Left) */}
                      <td className="sticky left-0 z-10 bg-white group-hover:bg-[#F8FAFC] py-3.5 px-6 border-r border-slate-100 shadow-[2px_0_6px_-2px_rgba(15,23,42,0.06)]">
                        <div className="flex items-center gap-3 min-w-[240px]">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#5B4FE9] to-indigo-400 text-white flex items-center justify-center font-bold text-sm shadow-2xs shrink-0">
                            {u.full_name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block group-hover:text-sky-700 transition">
                              {u.full_name}
                            </span>
                            <span className="text-[11px] font-mono text-slate-500 inline-flex items-center gap-1">
                              <span>{u.employee_code}</span>
                              <CopyButton value={u.employee_code} label="código de empleado" />
                              <span>• {u.email}</span>
                              <CopyButton value={u.email} label="correo" />
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Área y Sede */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800 block">{u.department}</span>
                        {u.position && (
                          <span className="text-[11px] text-slate-600 block">{u.position}</span>
                        )}
                        <span className="text-[11px] text-slate-500">{u.location}</span>
                      </td>

                      {/* Equipos Asignados por Tipo con Icono y Cantidad */}
                      <td className="py-3.5 px-6">
                        <div className="flex flex-wrap items-center gap-2">
                          {(() => {
                            const laptops = u.laptops_count ?? (u.assigned_assets?.filter((a) => a.category === 'LAPTOP').length || 0);
                            const dockings = u.dockings_count ?? (u.assigned_assets?.filter((a) => a.category === 'DOCKING').length || 0);
                            const monitors = u.monitors_count ?? (u.assigned_assets?.filter((a) => a.category === 'MONITOR').length || 0);
                            const peripherals = u.peripherals_count ?? (u.assigned_assets?.filter((a) => a.category === 'PERIPHERAL').length || 0);
                            const others = u.assigned_assets?.filter((a) => a.category === 'OTHER').length || 0;

                            if (totalAssets === 0) {
                              return (
                                <span className="text-slate-400 text-xs italic">
                                  Sin equipos asignados
                                </span>
                              );
                            }

                            return (
                              <>
                                {laptops > 0 && (
                                  <span
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200"
                                    title={`${laptops} Laptop${laptops > 1 ? 's' : ''}`}
                                  >
                                    <Laptop className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                                    <span>{laptops}</span>
                                  </span>
                                )}

                                {dockings > 0 && (
                                  <span
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200"
                                    title={`${dockings} Docking Station${dockings > 1 ? 's' : ''}`}
                                  >
                                    <Cpu className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                                    <span>{dockings}</span>
                                  </span>
                                )}

                                {monitors > 0 && (
                                  <span
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200"
                                    title={`${monitors} Monitor${monitors > 1 ? 'es' : ''}`}
                                  >
                                    <Monitor className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                    <span>{monitors}</span>
                                  </span>
                                )}

                                {peripherals > 0 && (
                                  <span
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200"
                                    title={`${peripherals} Accesorio${peripherals > 1 ? 's' : ''}`}
                                  >
                                    <Headphones className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                    <span>{peripherals}</span>
                                  </span>
                                )}

                                {others > 0 && (
                                  <span
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200"
                                    title={`${others} Otro${others > 1 ? 's' : ''}`}
                                  >
                                    <Box className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                                    <span>{others}</span>
                                  </span>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </td>

                      {/* Contador Numérico */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="font-bold text-slate-900 text-xs px-2.5 py-1 bg-slate-100 rounded-lg">
                          {totalAssets}
                        </span>
                      </td>

                      {/* Estatus */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            u.is_active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {u.is_active ? 'ACTIVO' : 'INACTIVO'}
                        </span>
                      </td>

                      {/* Acciones: Ver Ficha/Diagrama y Auditoría Rápida */}
                      <td className="py-3.5 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedUserId(u.id);
                            }}
                            className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs px-2.5 py-1.5 rounded-lg shadow-xs transition hover:text-slate-900"
                            title="Ver diagrama de equipos y ficha del colaborador"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-600" />
                            <span>Ver</span>
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingUser(u);
                            }}
                            className="inline-flex items-center gap-1.5 bg-white hover:bg-amber-50 text-amber-700 border border-amber-300 font-bold text-xs px-2.5 py-1.5 rounded-lg shadow-xs transition"
                            title="Editar datos del colaborador"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setAssignTargetUser(u);
                            }}
                            className="inline-flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs px-2.5 py-1.5 rounded-lg shadow-xs transition"
                            title="Asignar equipos con escáner continuo y filtros de stock"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            <span>Asignar</span>
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setAuditTargetUser(u);
                            }}
                            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-xs transition hover:shadow"
                            title="Iniciar escaneo físico y auditoría rápida"
                          >
                            <Barcode className="w-3.5 h-3.5" />
                            <span>Auditoría</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                  };

                  if (groupedUsers) {
                    return groupedUsers.map(([groupName, items]) => {
                      const isCollapsed = !!collapsedUserGroups[groupName];
                      return (
                        <React.Fragment key={groupName}>
                          <tr
                            onClick={() =>
                              setCollapsedUserGroups((prev) => ({
                                ...prev,
                                [groupName]: !prev[groupName],
                              }))
                            }
                            className="bg-[#F6F7FB] hover:bg-slate-100 cursor-pointer transition"
                          >
                            <td colSpan={6} className="py-2.5 px-6 font-bold text-slate-800">
                              <div className="flex items-center gap-2">
                                {isCollapsed ? (
                                  <CaretRight weight="bold" className="w-3.5 h-3.5 text-slate-500" />
                                ) : (
                                  <CaretDown weight="bold" className="w-3.5 h-3.5 text-[#5B4FE9]" />
                                )}
                                <span>{groupName}</span>
                                <span className="text-[11px] font-semibold text-slate-500 tabular-nums">
                                  ({items.length})
                                </span>
                              </div>
                            </td>
                          </tr>
                          {!isCollapsed && items.map(renderUserRow)}
                        </React.Fragment>
                      );
                    });
                  }

                  return pagedUsers.map(renderUserRow);
                })()}

                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 text-xs italic">
                      No se encontraron colaboradores con los filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer de Paginación */}
          {userGroupBy === 'none' && filteredUsers.length > 0 && (
            <div className="px-5 py-3 border-t border-[#E6E8F0] bg-[#FAFBFD] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span>Mostrar</span>
                <select
                  value={userPageSize}
                  onChange={(e) => {
                    setUserPageSize(Number(e.target.value));
                    setUserPage(1);
                  }}
                  aria-label="Colaboradores por página"
                  className="bg-white border border-[#E6E8F0] rounded-lg px-2 py-1 font-semibold text-slate-800"
                >
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span>por página</span>
              </div>

              <div className="flex items-center gap-3">
                <span className="tabular-nums font-medium">
                  {userStartIdx + 1}–{userEndIdx} de {filteredUsers.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={safeUserPage <= 1}
                    onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                    aria-label="Página anterior"
                    className="p-1.5 rounded-lg bg-white border border-[#E6E8F0] text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <CaretLeft weight="bold" className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={safeUserPage >= userTotalPages}
                    onClick={() => setUserPage((p) => Math.min(userTotalPages, p + 1))}
                    aria-label="Página siguiente"
                    className="p-1.5 rounded-lg bg-white border border-[#E6E8F0] text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <CaretRight weight="bold" className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Alta / Edición de Colaborador */}
        {(userModalOpen || editingUser) && (
          <UserFormModal
            userToEdit={editingUser}
            onClose={() => {
              setUserModalOpen(false);
              setEditingUser(null);
            }}
            onUserSaved={(savedUser) => {
              loadUsers();
              if (!editingUser) {
                setSelectedUserId(savedUser.id);
              }
            }}
          />
        )}

        {/* Modal Auditoría Rápida de Hardware */}
        {auditTargetUser && (
          <QuickUserAuditModal
            user={auditTargetUser}
            onClose={() => setAuditTargetUser(null)}
            onAuditFinished={() => {
              loadUsers();
            }}
          />
        )}

        {/* Modal Asignación Rápida de Hardware (Escáner continuo y Filtros) */}
        {assignTargetUser && (
          <QuickUserAssignModal
            user={assignTargetUser}
            onClose={() => setAssignTargetUser(null)}
            onAssignmentsUpdated={() => {
              loadUsers();
            }}
            onOpenResponsiva={() => {
              setSelectedUserId(assignTargetUser.id);
              setResponsivaModalOpen(true);
            }}
          />
        )}
      </div>
    );
  }

  // RENDER 2: VISTA DETALLE CON EL DIAGRAMA DE NODOS (@xyflow/react)
  return (
    <div className="p-6 space-y-5 max-w-[1600px] mx-auto flex flex-col h-[calc(100vh-64px)]">
      {/* Barra Superior de Navegación y Volver */}
      <div className="bg-white px-5 py-3 rounded-2xl border border-[#E2E8F0] shadow-sm flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSelectedUserId(null)}
            className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl font-bold text-xs transition shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a Lista de Colaboradores</span>
          </button>

          <div className="h-4 w-px bg-slate-200" />

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Colaborador:</span>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name} ({u.employee_code}) — {u.department}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentUser && (
            <button
              onClick={() => setEditingUser(currentUser)}
              className="flex items-center gap-1.5 bg-white hover:bg-amber-50 text-amber-700 border border-amber-300 font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-xs transition"
              title="Editar datos del colaborador"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editar</span>
            </button>
          )}

          {currentUser && (
            <button
              onClick={() => setAuditTargetUser(currentUser)}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-xs transition"
            >
              <Barcode className="w-3.5 h-3.5" />
              <span>Auditoría Rápida</span>
            </button>
          )}

          <button
            onClick={() => setResponsivaModalOpen(true)}
            className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-xs transition"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Carta de Responsiva</span>
          </button>
        </div>
      </div>

      {currentUser && (
        <div className="flex-1 flex flex-col gap-5 overflow-hidden min-h-0">
          {/* BLOQUE 1: FICHA SUPERIOR DEL USUARIO */}
          <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm shrink-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-600 to-sky-400 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  {currentUser.full_name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 leading-tight">
                      {currentUser.full_name}
                    </h3>
                    <span className="font-mono text-xs font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 inline-flex items-center gap-1">
                      <span>{currentUser.employee_code}</span>
                      <CopyButton value={currentUser.employee_code} label="código de empleado" />
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      ACTIVO
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-1">
                    <span>{currentUser.email}</span>
                    <CopyButton value={currentUser.email} label="correo" />
                    <span>
                      {currentUser.position ? `• ${currentUser.position}` : ''} • {currentUser.department} • Sede:{' '}
                      <strong>{currentUser.location}</strong>
                    </span>
                  </p>
                </div>
              </div>

              {/* Resumen numérico del kit */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="text-center px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Total</span>
                  <span className="text-sm font-bold text-slate-900">
                    {diagramData?.summary.total || 0}
                  </span>
                </div>
                <div className="text-center px-3 py-1.5 bg-sky-50 rounded-xl border border-sky-200 text-sky-800">
                  <span className="text-[10px] text-sky-600 block uppercase font-bold">Laptops</span>
                  <span className="text-sm font-bold">{diagramData?.summary.laptops || 0}</span>
                </div>
                <div className="text-center px-3 py-1.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800">
                  <span className="text-[10px] text-emerald-600 block uppercase font-bold">Celulares</span>
                  <span className="text-sm font-bold">{diagramData?.summary.phones || 0}</span>
                </div>
                <div className="text-center px-3 py-1.5 bg-indigo-50 rounded-xl border border-indigo-200 text-indigo-800">
                  <span className="text-[10px] text-indigo-600 block uppercase font-bold">Monitores</span>
                  <span className="text-sm font-bold">{diagramData?.summary.monitors || 0}</span>
                </div>
                <div className="text-center px-3 py-1.5 bg-teal-50 rounded-xl border border-teal-200 text-teal-800">
                  <span className="text-[10px] text-teal-600 block uppercase font-bold">Docks</span>
                  <span className="text-sm font-bold">{diagramData?.summary.dockings || 0}</span>
                </div>
                <div className="text-center px-3 py-1.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-800">
                  <span className="text-[10px] text-amber-600 block uppercase font-bold">Accesorios</span>
                  <span className="text-sm font-bold">{diagramData?.summary.peripherals || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Barra de Pestañas y Acciones Principales */}
          <div className="bg-white px-5 py-3 rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
            {/* Selector de Pestañas */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setActiveDetailTab('LIST')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition ${
                  activeDetailTab === 'LIST'
                    ? 'bg-white text-sky-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="w-4 h-4" />
                <span>Lista y Gestión de Equipos ({currentUser.assigned_assets?.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveDetailTab('DIAGRAM')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition ${
                  activeDetailTab === 'DIAGRAM'
                    ? 'bg-white text-sky-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Network className="w-4 h-4" />
                <span>Diagrama de Red y Custodia</span>
              </button>
            </div>

            {/* Acciones de Custodia Rápidas */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAssignTargetUser(currentUser)}
                className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs transition"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Asignar Equipo</span>
              </button>

              <button
                onClick={() => setSwapModalOpen(true)}
                className="flex items-center gap-1.5 bg-white hover:bg-amber-50 text-amber-700 border border-amber-300 font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs transition"
              >
                <ArrowLeftRight className="w-4 h-4" />
                <span>Cambio (Swap)</span>
              </button>

              <button
                onClick={() => setResponsivaModalOpen(true)}
                className="flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs transition"
              >
                <FileText className="w-4 h-4" />
                <span>Carta Responsiva</span>
              </button>
            </div>
          </div>

          {/* Feedback de impresión Brother si aplica */}
          {printFeedback && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between border ${
                printFeedback.success
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4" />
                <span>{printFeedback.msg}</span>
              </div>
              <button
                onClick={() => setPrintFeedback(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {/* VISTA 1: LISTADO Y GESTIÓN DE EQUIPOS DEL COLABORADOR */}
          {activeDetailTab === 'LIST' && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm flex-1 flex flex-col overflow-hidden min-h-0">
              <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70 shrink-0">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Equipos en Custodia de {currentUser.full_name}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Administra, edita detalles, imprime etiquetas Brother o desasigna activos directamente
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="relative">
                    <Search weight="duotone" className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={assetSearchQuery}
                      onChange={(e) => setAssetSearchQuery(e.target.value)}
                      placeholder="Filtrar equipos..."
                      aria-label="Filtrar equipos del colaborador"
                      className="pl-8 pr-7 py-1.5 bg-white border border-[#E6E8F0] rounded-xl text-xs text-slate-800 w-44 sm:w-56"
                    />
                    {assetSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setAssetSearchQuery('')}
                        aria-label="Limpiar filtro de equipos"
                        className="absolute right-2 top-2 text-slate-400 hover:text-slate-700"
                      >
                        <X weight="bold" className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {(currentUser.assigned_assets?.length || 0) > 0 && (
                    <button
                      onClick={handlePrintAllLabels}
                      disabled={Boolean(batchPrintProgress) || printingAssetId !== null}
                      className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-xs transition disabled:opacity-50"
                      title="Encolar e imprimir secuencialmente las etiquetas de todos los equipos de este usuario en la Brother PT-D410"
                    >
                      <Printer weight="duotone" className={`w-3.5 h-3.5 ${batchPrintProgress ? 'animate-spin' : ''}`} />
                      <span>
                        {batchPrintProgress
                          ? `Imprimiendo ${batchPrintProgress.current}/${batchPrintProgress.total}...`
                          : `Imprimir Todas (${currentUser.assigned_assets?.length || 0})`}
                      </span>
                    </button>
                  )}
                  <span className="text-xs font-mono font-bold text-slate-600 bg-white px-2.5 py-1.5 rounded-xl border border-[#E6E8F0] tabular-nums">
                    {currentUser.assigned_assets?.length || 0} activos
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#F8FAFC] text-slate-500 font-semibold text-[11px] uppercase tracking-wider sticky top-0 z-20 border-b border-[#E6E8F0]">
                    <tr>
                      <th className="sticky left-0 z-10 bg-[#F8FAFC] py-3 px-5 border-r border-slate-100 shadow-[2px_0_6px_-2px_rgba(15,23,42,0.06)]">
                        Categoría / Tag
                      </th>
                      <th className="py-3 px-4">Dispositivo y Serie</th>
                      <th className="py-3 px-4">Jerarquía / Vínculo</th>
                      <th className="py-3 px-4">Especificaciones</th>
                      <th className="py-3 px-3">Sede</th>
                      <th className="py-3 px-5 text-right">Acciones de Gestión</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(currentUser.assigned_assets || [])
                      .filter((ast) => {
                        const q = assetSearchQuery.trim().toLowerCase();
                        if (!q) return true;
                        return (
                          ast.asset_tag.toLowerCase().includes(q) ||
                          (ast.serial_number || '').toLowerCase().includes(q) ||
                          (ast.brand || '').toLowerCase().includes(q) ||
                          (ast.model || '').toLowerCase().includes(q) ||
                          (ast.category || '').toLowerCase().includes(q)
                        );
                      })
                      .map((ast) => {
                      return (
                        <tr key={ast.id} className="group hover:bg-[#F8FAFC] transition">
                          {/* Categoría y Tag (Pinned Left) */}
                          <td className="sticky left-0 z-10 bg-white group-hover:bg-[#F8FAFC] py-3 px-5 border-r border-slate-100 shadow-[2px_0_6px_-2px_rgba(15,23,42,0.06)]">
                            <div className="flex items-center gap-2.5 min-w-[180px]">
                              <div className="w-8 h-8 rounded-xl bg-[#F6F7FB] border border-[#E6E8F0] flex items-center justify-center shrink-0">
                                <HardwareIcon category={ast.category} className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="flex items-center gap-1">
                                  <span className="font-mono font-bold text-slate-900 text-xs">
                                    {ast.asset_tag}
                                  </span>
                                  <CopyButton value={ast.asset_tag} label="tag" />
                                </div>
                                <span className="text-[10px] text-slate-500 font-semibold uppercase">
                                  {ast.category}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Dispositivo y Serie */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <BrandTag brand={ast.brand} />
                              <span className="font-bold text-slate-800 text-xs">
                                {ast.model || ast.category}
                              </span>
                            </div>
                            <span className="text-[11px] font-mono text-slate-500 inline-flex items-center gap-1 mt-0.5">
                              <span>S/N: {ast.serial_number}</span>
                              <CopyButton value={ast.serial_number} label="número de serie" />
                            </span>
                          </td>

                          {/* Jerarquía / Vínculo */}
                          <td className="py-3 px-4">
                            {ast.parent_asset_tag ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200">
                                <span>🔗 Hijo de</span>
                                <span className="font-mono font-bold">{ast.parent_asset_tag}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span>Directo al Colaborador</span>
                              </span>
                            )}
                          </td>

                          {/* Especificaciones */}
                          <td className="py-3 px-4 text-slate-600 text-[11px]">
                            {ast.specs?.imei && (
                              <span className="font-mono text-[10px] text-emerald-700 flex items-center gap-1">
                                <span>IMEI: {ast.specs.imei}</span>
                                <CopyButton value={ast.specs.imei} label="IMEI" />
                              </span>
                            )}
                            {ast.specs?.puk && (
                              <span className="font-mono text-[10px] text-purple-700 flex items-center gap-1">
                                <span>PUK: {ast.specs.puk}</span>
                                <CopyButton value={ast.specs.puk} label="PUK" />
                              </span>
                            )}
                            {ast.specs?.ram || ast.specs?.cpu ? (
                              <span>
                                {ast.specs.ram} • {ast.specs.cpu}
                              </span>
                            ) : ast.specs?.inches ? (
                              <span>{ast.specs.inches}" Pulgadas</span>
                            ) : ast.specs?.power_watts ? (
                              <span>{ast.specs.power_watts}</span>
                            ) : (
                              <span className="text-slate-400 italic">
                                {ast.specs?.description || 'Sin datos extra'}
                              </span>
                            )}
                          </td>

                          {/* Sede */}
                          <td className="py-3 px-3">
                            <span className="font-semibold text-slate-700 text-xs">
                              {ast.location}
                            </span>
                          </td>

                          {/* Acciones */}
                          <td className="py-3 px-5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Editar activo */}
                              <button
                                onClick={() => setEditingAsset(ast)}
                                className="inline-flex items-center gap-1 bg-white hover:bg-sky-50 text-sky-700 border border-sky-200 font-bold text-xs px-2.5 py-1.5 rounded-lg shadow-xs transition"
                                title="Editar características, modelo, serie o equipo padre"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Editar</span>
                              </button>

                              {/* Imprimir en Brother PT-D410 */}
                              <button
                                onClick={() => handlePrintBrother(ast)}
                                disabled={printingAssetId === ast.id}
                                className="inline-flex items-center gap-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs px-2.5 py-1.5 rounded-lg shadow-xs transition disabled:opacity-50"
                                title="Imprimir etiqueta en Brother PT-D410"
                              >
                                <Printer
                                  className={`w-3.5 h-3.5 ${
                                    printingAssetId === ast.id ? 'animate-spin' : ''
                                  }`}
                                />
                                <span>Etiqueta</span>
                              </button>

                              {/* Desasignar */}
                              <button
                                onClick={() => handleUnassign(ast)}
                                className="inline-flex items-center gap-1 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 font-bold text-xs px-2.5 py-1.5 rounded-lg shadow-xs transition hover:text-rose-700"
                                title="Desasignar y regresar a stock disponible"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Desasignar</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {(!currentUser.assigned_assets || currentUser.assigned_assets.length === 0) && (
                      <tr>
                        <td colSpan={6} className="py-12 text-center">
                          <Box className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                          <p className="text-slate-500 font-bold text-sm">
                            Este colaborador no tiene equipos asignados actualmente
                          </p>
                          <p className="text-slate-400 text-xs mt-1">
                            Utiliza el botón superior "Asignar Equipo" para escanear con la pistola o buscar en el stock.
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VISTA 2: DIAGRAMA DE NODOS (@xyflow/react) */}
          {activeDetailTab === 'DIAGRAM' && (
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-0">
              {/* BLOQUE 2: LIENZO CENTRAL CON EL DIAGRAMA DE NODOS (@xyflow/react) */}
              <div className="lg:col-span-8 bg-white rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col overflow-hidden relative">
                <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 shrink-0">
                  <div className="flex items-center gap-2">
                    <Network className="w-4 h-4 text-sky-600" />
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Diagrama de Jerarquía y Custodia
                    </h4>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Arrastra los nodos o haz zoom para explorar
                  </span>
                </div>

                <div className="flex-1 w-full h-full min-h-[420px] bg-slate-50/50">
                  <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    nodeTypes={nodeTypes}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    fitView
                    fitViewOptions={{ padding: 0.3 }}
                  >
                    <Background gap={16} size={1} color="#CBD5E1" />
                    <Controls className="!bg-white !border-slate-200 !shadow-sm !rounded-xl" />
                  </ReactFlow>
                </div>
              </div>

              {/* BLOQUE 3: COLUMNA LATERAL DERECHA (ACCIONES, HISTORIAL Y ALERTAS) */}
              <div className="lg:col-span-4 flex flex-col gap-4 overflow-y-auto pr-1">
                {/* Acciones de Asignación y Swap */}
                <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-3 shrink-0">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                    <PlusCircle className="w-4 h-4 text-sky-600" />
                    <span>Acciones de Custodia</span>
                  </h4>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => currentUser && setAssignTargetUser(currentUser)}
                      className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200 hover:border-sky-300 hover:bg-sky-50/50 transition text-center gap-1.5"
                    >
                      <PlusCircle className="w-4 h-4 text-sky-600" />
                      <span className="text-xs font-bold text-slate-900 leading-tight">Asignar Equipos</span>
                      <span className="text-[10px] text-slate-500">Escáner continuo o filtros</span>
                    </button>

                    <button
                      onClick={() => setSwapModalOpen(true)}
                      className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/50 transition text-center gap-1.5"
                    >
                      <ArrowLeftRight className="w-4 h-4 text-amber-600" />
                      <span className="text-xs font-bold text-slate-900 leading-tight">Cambio (Swap)</span>
                      <span className="text-[10px] text-slate-500">Reemplazo inmediato</span>
                    </button>
                  </div>
                </div>

                {/* Alertas preventivas del usuario */}
                {userAlerts.length > 0 && (
                  <div className="bg-white p-5 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-sm space-y-3 shrink-0">
                    <div className="flex items-center gap-2 text-amber-800 font-bold text-xs uppercase">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Alertas Preventivas ({userAlerts.length})</span>
                    </div>
                    <div className="space-y-2">
                      {userAlerts.map((alt) => (
                        <div
                          key={alt.id}
                          className="p-2.5 rounded-lg bg-white border border-amber-200 text-xs shadow-xs"
                        >
                          <span className="font-bold text-slate-900 block">{alt.title}</span>
                          <p className="text-[11px] text-slate-600 mt-0.5">{alt.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Historial de Cambios y Movimientos */}
                <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-3 flex-1 flex flex-col min-h-[220px]">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                      <History className="w-4 h-4 text-slate-500" />
                      <span>Historial de Movimientos</span>
                    </h4>
                    <span className="text-[10px] font-mono text-slate-400">Audit Log</span>
                  </div>

                  <div className="space-y-2.5 overflow-y-auto flex-1">
                    {userHistory.map((h) => (
                      <div
                        key={h.id}
                        className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-sky-800 text-[11px]">
                            {h.asset_tag}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(h.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-700 font-medium">{h.notes}</p>
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span className="px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                            {h.action_type}
                          </span>
                          {h.responsiva_status === 'SIGNED' ? (
                            <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
                              <CheckCircle className="w-3 h-3" /> Firmada
                            </span>
                          ) : h.responsiva_status === 'PENDING' ? (
                            <span className="text-amber-700 font-semibold">Firma Pendiente</span>
                          ) : null}
                        </div>
                      </div>
                    ))}

                    {userHistory.length === 0 && (
                      <div className="py-8 text-center text-slate-400 text-xs italic">
                        No hay movimientos registrados para este colaborador.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Asignación Rápida de Hardware (Escáner continuo y Filtros) */}
      {assignTargetUser && (
        <QuickUserAssignModal
          user={assignTargetUser}
          onClose={() => setAssignTargetUser(null)}
          onAssignmentsUpdated={() => {
            loadUsers();
            if (selectedUserId) loadUserDetails(selectedUserId);
          }}
          onOpenResponsiva={() => {
            setSelectedUserId(assignTargetUser.id);
            setResponsivaModalOpen(true);
          }}
        />
      )}

      {/* Modal Swap */}
      {swapModalOpen && currentUser && (
        <SwapModal
          user={currentUser}
          userAssets={currentUser.assigned_assets || []}
          availableAssets={availableStockAssets}
          onClose={() => setSwapModalOpen(false)}
          onSuccess={() => {
            setSwapModalOpen(false);
            if (selectedUserId) loadUserDetails(selectedUserId);
            loadUsers();
          }}
        />
      )}

      {/* Modal de Carta de Responsiva Oficial */}
      {responsivaModalOpen && selectedUserId && (
        <ResponsivaModal
          userId={selectedUserId}
          onClose={() => setResponsivaModalOpen(false)}
          onUploadSuccess={() => {
            if (selectedUserId) loadUserDetails(selectedUserId);
          }}
        />
      )}

      {/* Modal Auditoría Rápida de Hardware */}
      {auditTargetUser && (
        <QuickUserAuditModal
          user={auditTargetUser}
          onClose={() => setAuditTargetUser(null)}
          onAuditFinished={() => {
            loadUsers();
            if (selectedUserId) loadUserDetails(selectedUserId);
          }}
        />
      )}

      {/* Modal Edición de Activo Asignado */}
      {editingAsset && (
        <AssetFormModal
          assetToEdit={editingAsset}
          users={users}
          availableLaptops={currentUser?.assigned_assets?.filter(a => a.category === 'LAPTOP' || a.category === 'WORKSTATION') || []}
          onClose={() => setEditingAsset(null)}
          onSuccess={() => {
            setEditingAsset(null);
            if (selectedUserId) loadUserDetails(selectedUserId);
            loadUsers();
          }}
        />
      )}

      {/* Modal Edición de Colaborador */}
      {editingUser && (
        <UserFormModal
          userToEdit={editingUser}
          onClose={() => setEditingUser(null)}
          onUserSaved={() => {
            setEditingUser(null);
            if (selectedUserId) loadUserDetails(selectedUserId);
            loadUsers();
          }}
        />
      )}
    </div>
  );
};
