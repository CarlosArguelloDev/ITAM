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
  ArrowLeftRight,
  PlusCircle,
  AlertTriangle,
  History,
  Shield,
  Clock,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';

import { User, Asset, UserDiagramResponse, AssetHistory, AlertItem } from '../types';
import { api } from '../api';
import { ResponsivaModal } from '../components/ResponsivaModal';
import { SwapModal } from '../components/SwapModal';

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
      {data.specs?.ram || data.specs?.cpu ? `${data.specs.ram} • ${data.specs.cpu}` : data.location}
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
    <p className="font-semibold text-slate-900">{data.brand} {data.model}</p>
    <p className="text-[11px] font-mono text-slate-500">S/N: {data.serial_number}</p>
    <div className="mt-1 text-[10px] text-indigo-600">
      {data.specs?.inches ? `${data.specs.inches}" • ${data.specs?.resolution || ''}` : 'Display Hub'}
    </div>
  </div>
);

const CustomPeripheralNode = ({ data }: { data: any }) => (
  <div className="bg-white rounded-xl border border-amber-400 p-3 shadow-sm min-w-[210px] text-xs">
    <Handle type="target" position={Position.Top} className="!bg-amber-600" />
    <div className="flex items-center justify-between mb-1">
      <div className="flex items-center gap-1.5 text-amber-700 font-bold text-[10px] uppercase">
        <Headphones className="w-3.5 h-3.5" />
        <span>Periférico</span>
      </div>
      <span className="font-mono text-[10px] font-bold text-slate-700">{data.asset_tag}</span>
    </div>
    <p className="font-semibold text-slate-900">{data.model}</p>
    <p className="text-[11px] font-mono text-slate-500">S/N: {data.serial_number}</p>
    <div className="mt-1 text-[10px] text-amber-600">
      {data.specs?.type || 'Accesorio TI'}
    </div>
  </div>
);

export const UsersDiagramView: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [diagramData, setDiagramData] = useState<UserDiagramResponse | null>(null);
  const [userHistory, setUserHistory] = useState<AssetHistory[]>([]);
  const [userAlerts, setUserAlerts] = useState<AlertItem[]>([]);
  const [availableStock, setAvailableStock] = useState<Asset[]>([]);

  // Estados locales de React Flow para permitir mover nodos libremente
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  // Modales
  const [responsivaModalOpen, setResponsivaModalOpen] = useState(false);
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedAssignAssetId, setSelectedAssignAssetId] = useState('');

  const nodeTypes = useMemo(
    () => ({
      userNode: CustomUserNode,
      laptopNode: CustomLaptopNode,
      dockingNode: CustomDockingNode,
      monitorNode: CustomMonitorNode,
      peripheralNode: CustomPeripheralNode,
    }),
    []
  );

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
      const allUsers = await api.getUsers({ active: true });
      setUsers(allUsers);
      if (allUsers.length > 0 && !selectedUserId) {
        setSelectedUserId(allUsers[0].id);
      }
    } catch (err) {
      console.error('Error cargando usuarios:', err);
    }
  };

  const loadUserDetails = async (uid: string) => {
    try {
      const [diag, stock, alerts] = await Promise.all([
        api.getUserDiagram(uid),
        api.getAssets({ status: 'AVAILABLE' }),
        api.getAlerts(),
      ]);

      setDiagramData(diag);
      setAvailableStock(stock);

      // Filtrar alertas que corresponden a este usuario o sus activos
      const userSpecificAlerts = alerts.filter(
        (alt) => alt.user_id === uid || diag.user.assigned_assets?.some((ast) => ast.id === alt.asset_id)
      );
      setUserAlerts(userSpecificAlerts);

      // Cargar historial de sus activos asignados
      if (diag.user.assigned_assets && diag.user.assigned_assets.length > 0) {
        const histories = await Promise.all(
          diag.user.assigned_assets.slice(0, 3).map((a) => api.getAssetHistory(a.id))
        );
        setUserHistory(histories.flat().slice(0, 8));
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

  const handleAssignDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignAssetId || !selectedUserId) return;

    try {
      await api.assignAsset({
        asset_id: selectedAssignAssetId,
        user_id: selectedUserId,
        notes: 'Asignación directa desde vista de usuario',
      });
      setAssignModalOpen(false);
      setSelectedAssignAssetId('');
      loadUserDetails(selectedUserId);
    } catch (err: any) {
      alert(err.message || 'Error al asignar activo');
    }
  };

  const currentUser = diagramData?.user;

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto flex flex-col h-[calc(100vh-64px)]">
      {/* Selector de Usuario */}
      <div className="bg-white px-5 py-3 rounded-2xl border border-[#E2E8F0] shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <UserIcon className="w-5 h-5 text-sky-600" />
          <span className="text-xs font-bold text-slate-700">Seleccionar Colaborador:</span>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name} ({u.employee_code}) - {u.department}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Total colaboradores activos: <strong>{users.length}</strong>
        </div>
      </div>

      {currentUser && (
        <div className="flex-1 flex flex-col gap-6 overflow-hidden">
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
                    <span className="font-mono text-xs font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                      {currentUser.employee_code}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      ACTIVO
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {currentUser.email} • {currentUser.department} • Sede: <strong>{currentUser.location}</strong>
                  </p>
                </div>
              </div>

              {/* Resumen numérico del kit */}
              <div className="flex items-center gap-4 text-xs">
                <div className="text-center px-3 py-1 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Equipos</span>
                  <span className="text-base font-bold text-slate-900">
                    {diagramData?.summary.total || 0}
                  </span>
                </div>
                <div className="text-center px-3 py-1 bg-sky-50 rounded-xl border border-sky-200 text-sky-800">
                  <span className="text-[10px] text-sky-600 block uppercase font-bold">Laptops</span>
                  <span className="text-base font-bold">{diagramData?.summary.laptops || 0}</span>
                </div>
                <div className="text-center px-3 py-1 bg-indigo-50 rounded-xl border border-indigo-200 text-indigo-800">
                  <span className="text-[10px] text-indigo-600 block uppercase font-bold">Monitores</span>
                  <span className="text-base font-bold">{diagramData?.summary.monitors || 0}</span>
                </div>
                <div className="text-center px-3 py-1 bg-teal-50 rounded-xl border border-teal-200 text-teal-800">
                  <span className="text-[10px] text-teal-600 block uppercase font-bold">Docks</span>
                  <span className="text-base font-bold">{diagramData?.summary.dockings || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* CUERPO PRINCIPAL: LIENZO CENTRAL (BLOQUE 2) + COLUMNA LATERAL DERECHA (BLOQUE 3) */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
            {/* BLOQUE 2: LIENZO CENTRAL CON EL DIAGRAMA DE NODOS (@xyflow/react) */}
            <div className="lg:col-span-8 bg-white rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col overflow-hidden relative">
              <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-2">
                  <Laptop className="w-4 h-4 text-sky-600" />
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Diagrama de Custodia y Asignación de Equipos
                  </h4>
                </div>
              </div>

              <div className="flex-1 w-full h-full min-h-[420px] bg-slate-50/30">
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  nodeTypes={nodeTypes}
                  fitView
                  fitViewOptions={{ padding: 0.2 }}
                >
                  <Background gap={16} size={1} color="#E2E8F0" />
                  <Controls className="!bg-white !border-slate-200 !shadow-sm !rounded-lg" />
                </ReactFlow>
              </div>
            </div>

            {/* BLOQUE 3: COLUMNA LATERAL DERECHA */}
            <div className="lg:col-span-4 flex flex-col gap-5 overflow-y-auto pr-1">
              {/* Acciones de Asignación y Responsiva */}
              <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                  <Shield className="w-4 h-4 text-sky-600" />
                  <span>Acciones de Asignación</span>
                </h4>

                {/* Botón Principal de Carta de Responsiva */}
                <button
                  onClick={() => setResponsivaModalOpen(true)}
                  className="w-full bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-700 hover:to-sky-800 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-sm flex items-center justify-center gap-2 transition"
                >
                  <FileText className="w-4 h-4" />
                  <span>Generar Carta de Responsiva</span>
                </button>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  {/* Botón Swap */}
                  <button
                    onClick={() => setSwapModalOpen(true)}
                    disabled={!currentUser.assigned_assets || currentUser.assigned_assets.length === 0}
                    className="bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-800 text-xs font-semibold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    <span>Cambio (Swap)</span>
                  </button>

                  {/* Asignar desde Stock */}
                  <button
                    onClick={() => setAssignModalOpen(true)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Asignar Equipo</span>
                  </button>
                </div>
              </div>

              {/* Alertas del Usuario */}
              {userAlerts.length > 0 && (
                <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 shadow-sm space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Alertas para este Usuario ({userAlerts.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {userAlerts.map((alt) => (
                      <div
                        key={alt.id}
                        className="p-2.5 bg-white rounded-lg border border-amber-200 text-[11px] text-amber-950"
                      >
                        <p className="font-semibold">{alt.title}</p>
                        <p className="text-slate-500 text-[10px] mt-0.5">{alt.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Historial de Cambios de Equipo */}
              <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                    <History className="w-4 h-4 text-slate-500" />
                    <span>Historial de Equipos</span>
                  </h4>
                </div>

                <div className="space-y-2.5 overflow-y-auto max-h-64 text-xs divide-y divide-slate-100">
                  {userHistory.map((h) => (
                    <div key={h.id} className="pt-2 first:pt-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[11px] text-slate-800 font-mono">
                          {h.asset_tag || 'Activo'}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {h.action_type}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5">{h.notes}</p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                        <span>{new Date(h.created_at).toLocaleDateString()}</span>
                        {h.responsiva_status === 'SIGNED' ? (
                          <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
                            <CheckCircle className="w-3 h-3" /> Signed
                          </span>
                        ) : h.responsiva_status === 'PENDING' ? (
                          <span className="text-amber-700 font-semibold flex items-center gap-0.5">
                            <Clock className="w-3 h-3" /> Pendiente
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))}

                  {userHistory.length === 0 && (
                    <p className="text-xs text-slate-400 italic py-4 text-center">
                      No hay historial reciente registrado para este usuario.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Carta de Responsiva */}
      {responsivaModalOpen && selectedUserId && (
        <ResponsivaModal
          userId={selectedUserId}
          onClose={() => setResponsivaModalOpen(false)}
          onUploadSuccess={() => loadUserDetails(selectedUserId)}
        />
      )}

      {/* Modal de Swap de Equipo */}
      {swapModalOpen && currentUser && (
        <SwapModal
          user={currentUser}
          userAssets={currentUser.assigned_assets || []}
          availableAssets={availableStock}
          onClose={() => setSwapModalOpen(false)}
          onSuccess={() => loadUserDetails(selectedUserId)}
        />
      )}

      {/* Modal Rápido de Asignación Directa desde Stock */}
      {assignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Asignar Equipo desde Stock</h3>
            <p className="text-xs text-slate-500">
              Selecciona un equipo disponible para vincularlo a <strong>{currentUser?.full_name}</strong>.
            </p>

            <form onSubmit={handleAssignDirect} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Equipo en Stock:</label>
                <select
                  value={selectedAssignAssetId}
                  onChange={(e) => setSelectedAssignAssetId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-medium text-slate-800"
                >
                  <option value="">(Selecciona un equipo)</option>
                  {availableStock.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.asset_tag} - {a.brand} {a.model} ({a.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!selectedAssignAssetId}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-semibold rounded-lg"
                >
                  Confirmar Asignación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
