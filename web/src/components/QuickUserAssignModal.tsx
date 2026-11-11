import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Barcode,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Search,
  Plus,
  Trash2,
  Laptop,
  Monitor,
  Cpu,
  Headphones,
  Box,
  Filter,
  FileText,
  Check,
  Zap,
  RefreshCw,
  User as UserIcon,
  Building,
  MapPin,
  Tag,
} from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { User, Asset, AssetCategory } from '../types';
import { api } from '../api';

interface QuickUserAssignModalProps {
  user: User;
  onClose: () => void;
  onAssignmentsUpdated: () => void;
  onOpenResponsiva?: () => void;
}

export const QuickUserAssignModal: React.FC<QuickUserAssignModalProps> = ({
  user,
  onClose,
  onAssignmentsUpdated,
  onOpenResponsiva,
}) => {
  // Lista de activos en stock disponibles
  const [stockAssets, setStockAssets] = useState<Asset[]>([]);
  // Lista de activos actualmente asignados a este usuario
  const [assignedAssets, setAssignedAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros de búsqueda en stock
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [locationFilter, setLocationFilter] = useState<string>('');

  // Escaneo
  const [inputCode, setInputCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'warn' | 'error'; message: string } | null>(null);

  // Acción en proceso
  const [processingId, setProcessingId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    loadData();
  }, [user.id]);

  useEffect(() => {
    if (!cameraActive) {
      inputRef.current?.focus();
    }
  }, [cameraActive]);

  // Cámara QR
  useEffect(() => {
    if (cameraActive) {
      const scanner = new Html5QrcodeScanner(
        'assign-camera-container',
        { fps: 10, qrbox: { width: 280, height: 120 }, aspectRatio: 1.77 },
        false
      );

      scanner.render(
        (decodedText) => {
          let tag = decodedText.trim();
          if (tag.includes('/audit/scan/')) {
            const parts = tag.split('/audit/scan/');
            tag = parts[parts.length - 1];
          }
          handleDirectAssignByCode(tag);
        },
        () => {}
      );

      scannerRef.current = scanner;

      return () => {
        scanner.clear().catch(() => {});
      };
    }
  }, [cameraActive]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [available, userAssets] = await Promise.all([
        api.getAssets({ status: 'AVAILABLE' }),
        api.getAssets({ user_id: user.id }),
      ]);
      setStockAssets(available);
      setAssignedAssets(userAssets);
    } catch (err) {
      console.error('Error cargando activos para asignación:', err);
    } finally {
      setLoading(false);
    }
  };

  // Asignar activo directamente por objeto
  const handleAssignAsset = async (asset: Asset) => {
    try {
      setProcessingId(asset.id);
      setFeedback(null);

      await api.assignAsset({
        asset_id: asset.id,
        user_id: user.id,
        location: user.location,
        notes: `Asignación a ${user.full_name} (${user.employee_code})`,
      });

      // Actualizar estado local inmediatamente
      setStockAssets((prev) => prev.filter((a) => a.id !== asset.id));
      setAssignedAssets((prev) => [...prev, { ...asset, status: 'ASSIGNED', assigned_to_user_id: user.id }]);

      setFeedback({
        type: 'success',
        message: `¡Asignado! [${asset.category}] ${asset.asset_tag} • ${asset.brand} ${asset.model}`,
      });

      onAssignmentsUpdated();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Error al asignar el activo',
      });
    } finally {
      setProcessingId(null);
      inputRef.current?.focus();
    }
  };

  // Desasignar activo (regresar a stock)
  const handleUnassignAsset = async (asset: Asset) => {
    try {
      setProcessingId(asset.id);
      setFeedback(null);

      await api.unassignAsset({
        asset_id: asset.id,
        next_status: 'AVAILABLE',
        location: asset.location || user.location,
        notes: `Desasignado de ${user.full_name} y devuelto a stock central`,
      });

      // Actualizar estado local
      setAssignedAssets((prev) => prev.filter((a) => a.id !== asset.id));
      setStockAssets((prev) => [{ ...asset, status: 'AVAILABLE', assigned_to_user_id: undefined }, ...prev]);

      setFeedback({
        type: 'warn',
        message: `Removido: [${asset.category}] ${asset.asset_tag} fue devuelto al stock central.`,
      });

      onAssignmentsUpdated();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Error al desasignar el activo',
      });
    } finally {
      setProcessingId(null);
      inputRef.current?.focus();
    }
  };

  // Manejo de lectura por código de barras o número de serie (escáner / enter)
  const handleDirectAssignByCode = async (rawCode: string) => {
    const code = rawCode.trim();
    if (!code) return;

    try {
      setScanning(true);
      setFeedback(null);

      // Buscar activo por tag o serie
      const found = await api.getAssetByTag(code).catch(() => null);

      if (!found) {
        setFeedback({
          type: 'error',
          message: `No se encontró ningún activo con el tag o serie "${code}".`,
        });
        return;
      }

      // Si ya está asignado a este mismo usuario
      if (found.assigned_to_user_id === user.id) {
        setFeedback({
          type: 'warn',
          message: `El activo ${found.asset_tag} (${found.brand} ${found.model}) ya está asignado a este colaborador.`,
        });
        return;
      }

      // Si estaba asignado a otra persona
      const wasAssignedToOther = found.status === 'ASSIGNED' && found.assigned_to_user_id;

      await api.assignAsset({
        asset_id: found.id,
        user_id: user.id,
        location: user.location,
        notes: `Asignación escaneada para ${user.full_name}`,
      });

      // Actualizar listas locales
      setStockAssets((prev) => prev.filter((a) => a.id !== found.id));
      setAssignedAssets((prev) => [
        ...prev.filter((a) => a.id !== found.id),
        { ...found, status: 'ASSIGNED', assigned_to_user_id: user.id },
      ]);

      setFeedback({
        type: 'success',
        message: wasAssignedToOther
          ? `¡Reasignado! [${found.category}] ${found.asset_tag} fue transferido a ${user.full_name}.`
          : `¡Asignado! [${found.category}] ${found.asset_tag} • ${found.brand} ${found.model} (S/N: ${found.serial_number})`,
      });

      setInputCode('');
      onAssignmentsUpdated();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Error al procesar el activo escaneado',
      });
    } finally {
      setScanning(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputCode.trim()) {
      handleDirectAssignByCode(inputCode);
    }
  };

  // Filtrado de activos disponibles en stock
  const filteredStock = useMemo(() => {
    return stockAssets.filter((a) => {
      const matchSearch =
        !searchFilter ||
        a.asset_tag.toLowerCase().includes(searchFilter.toLowerCase()) ||
        a.serial_number.toLowerCase().includes(searchFilter.toLowerCase()) ||
        a.brand.toLowerCase().includes(searchFilter.toLowerCase()) ||
        a.model.toLowerCase().includes(searchFilter.toLowerCase()) ||
        (a.department && a.department.toLowerCase().includes(searchFilter.toLowerCase()));

      const matchCat = !categoryFilter || a.category === categoryFilter;
      const matchLoc = !locationFilter || a.location === locationFilter;

      return matchSearch && matchCat && matchLoc;
    });
  }, [stockAssets, searchFilter, categoryFilter, locationFilter]);

  // Lista de categorías únicas presentes en el stock disponible
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    stockAssets.forEach((a) => set.add(a.category));
    return Array.from(set).sort();
  }, [stockAssets]);

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'LAPTOP':
        return <Laptop className="w-4 h-4 text-sky-600" />;
      case 'MONITOR':
        return <Monitor className="w-4 h-4 text-indigo-600" />;
      case 'DOCKING':
      case 'WORKSTATION':
        return <Cpu className="w-4 h-4 text-teal-600" />;
      case 'AUDIFONOS':
      case 'PERIPHERAL':
        return <Headphones className="w-4 h-4 text-amber-600" />;
      default:
        return <Box className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 md:p-6 overflow-hidden">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        
        {/* 1. Header con Información del Colaborador */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
              {user.full_name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">{user.full_name}</h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 font-semibold">
                  {user.employee_code}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                <span className="flex items-center gap-1 font-medium">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  {user.department || 'GENERAL'}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 font-bold text-sky-700">
                  <MapPin className="w-3.5 h-3.5 text-sky-500" />
                  Planta / Sede: {user.location}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <span className="text-[11px] text-slate-400 block font-medium">En custodia actual</span>
              <span className="text-xs font-bold text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                {assignedAssets.length} {assignedAssets.length === 1 ? 'activo' : 'activos'}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. Barra de Escáner Continuo (Pistola Lectora / Cámara) */}
        <div className="p-4 bg-sky-50/70 border-b border-sky-100 shrink-0">
          <form onSubmit={handleInputSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Barcode className="w-5 h-5 text-sky-600 absolute left-3.5 top-3" />
              <input
                ref={inputRef}
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="Disparar pistola lectora o escribir Tag / Número de Serie y presionar Enter..."
                disabled={scanning}
                className="w-full pl-11 pr-24 py-2.5 bg-white border-2 border-sky-300 focus:border-sky-600 rounded-xl text-xs font-mono font-semibold text-slate-900 placeholder:font-sans placeholder:font-normal placeholder:text-slate-400 focus:outline-none shadow-sm transition"
              />
              <span className="absolute right-3 top-2.5 text-[10px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded uppercase">
                Modo Escáner
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={scanning || !inputCode.trim()}
                className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                <Zap className="w-4 h-4" />
                <span>{scanning ? 'Asignando...' : 'Asignar Tag'}</span>
              </button>

              <button
                type="button"
                onClick={() => setCameraActive(!cameraActive)}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
                  cameraActive
                    ? 'bg-amber-100 border-amber-300 text-amber-800'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
                title="Escanear con cámara web o celular"
              >
                <Camera className="w-4 h-4" />
                <span className="hidden md:inline">{cameraActive ? 'Apagar Cámara' : 'Cámara QR'}</span>
              </button>
            </div>
          </form>

          {/* Cámara Container */}
          {cameraActive && (
            <div className="mt-3 p-3 bg-white rounded-xl border border-sky-200 flex flex-col items-center">
              <p className="text-xs text-slate-500 mb-2 font-medium">Apunta el código de barras o QR frente a la cámara</p>
              <div id="assign-camera-container" className="w-full max-w-sm rounded-lg overflow-hidden border border-slate-300" />
            </div>
          )}

          {/* Mensaje Flash de Feedback */}
          {feedback && (
            <div
              className={`mt-2.5 p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-1 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : feedback.type === 'warn'
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span className="flex-1">{feedback.message}</span>
              <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* 3. Split View: Stock con Filtros (Izquierda) vs. Asignados (Derecha) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          
          {/* LADO IZQUIERDO: BUSCADOR Y CATÁLOGO DE STOCK (7 cols) */}
          <div className="lg:col-span-7 border-r border-slate-200 flex flex-col overflow-hidden bg-slate-50/50">
            {/* Barra de Filtros */}
            <div className="p-4 border-b border-slate-200 bg-white space-y-2.5 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Box className="w-4 h-4 text-sky-600" />
                  Equipos Disponibles en Stock ({filteredStock.length} de {stockAssets.length})
                </span>
                {(searchFilter || categoryFilter || locationFilter) && (
                  <button
                    onClick={() => {
                      setSearchFilter('');
                      setCategoryFilter('');
                      setLocationFilter('');
                    }}
                    className="text-[11px] text-sky-600 hover:text-sky-800 font-semibold"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>

              {/* Input de Búsqueda rápida */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Filtrar por Tag, Serie, Marca o Modelo..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
                />
              </div>

              {/* Filtros de Categoría y Sede */}
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  <option value="">Todas las Categorías ({availableCategories.length})</option>
                  {availableCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs font-bold text-sky-800 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  <option value="">Sede: Todas</option>
                  <option value="OPM">Planta OPM</option>
                  <option value="OMEX">Oficinas OMEX</option>
                </select>
              </div>
            </div>

            {/* Lista de Activos Disponibles */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {loading ? (
                <div className="py-12 text-center text-xs text-slate-400">Cargando inventario disponible...</div>
              ) : filteredStock.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 italic">
                  No hay activos en stock que coincidan con los filtros de búsqueda.
                </div>
              ) : (
                filteredStock.map((ast) => (
                  <div
                    key={ast.id}
                    className="p-3 bg-white rounded-xl border border-slate-200 hover:border-sky-300 hover:shadow-xs transition flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 shrink-0">
                        {getCategoryIcon(ast.category)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 truncate">{ast.asset_tag}</span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                            {ast.category}
                          </span>
                        </div>
                        <p className="text-slate-600 font-medium truncate">
                          {ast.brand} {ast.model}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
                          <span>S/N: {ast.serial_number}</span>
                          <span>•</span>
                          <span className="font-sans font-semibold text-sky-700">{ast.location}</span>
                          {ast.department && (
                            <>
                              <span>•</span>
                              <span className="font-sans text-slate-500 truncate">{ast.department}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleAssignAsset(ast)}
                      disabled={processingId === ast.id}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-bold text-xs flex items-center gap-1 shrink-0 shadow-xs transition"
                      title="Asignar al colaborador"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{processingId === ast.id ? '...' : 'Asignar'}</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* LADO DERECHO: EQUIPOS ASIGNADOS A ESTE COLABORADOR (5 cols) */}
          <div className="lg:col-span-5 flex flex-col overflow-hidden bg-white">
            <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between shrink-0">
              <div>
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Equipos en Custodia ({assignedAssets.length})
                </h4>
                <p className="text-[11px] text-slate-500">Hardware bajo resguardo formal del colaborador</p>
              </div>

              {assignedAssets.length > 0 && onOpenResponsiva && (
                <button
                  onClick={onOpenResponsiva}
                  className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs transition"
                  title="Generar Responsiva PDF"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Responsiva</span>
                </button>
              )}
            </div>

            {/* Lista de Equipos Asignados */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {assignedAssets.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-400 space-y-2">
                  <Box className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="font-semibold text-slate-500">Aún no tiene activos asignados</p>
                  <p className="text-[11px]">
                    Usa la barra superior para escanear con la pistola lectora o selecciona equipos de la columna izquierda.
                  </p>
                </div>
              ) : (
                assignedAssets.map((ast) => {
                  const isLaptop = ast.category === 'LAPTOP';
                  return (
                    <div
                      key={ast.id}
                      className={`p-3 rounded-xl border transition flex items-center justify-between gap-3 text-xs ${
                        isLaptop
                          ? 'bg-sky-50/50 border-sky-200 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`p-2 rounded-lg shrink-0 ${
                            isLaptop ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {getCategoryIcon(ast.category)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 truncate">{ast.asset_tag}</span>
                            {isLaptop && (
                              <span className="text-[9px] font-bold uppercase tracking-wider bg-sky-600 text-white px-1.5 py-0.5 rounded">
                                Primario
                              </span>
                            )}
                          </div>
                          <p className="text-slate-700 font-medium truncate">
                            {ast.brand} {ast.model}
                          </p>
                          <p className="text-[11px] font-mono text-slate-400 truncate">
                            S/N: {ast.serial_number}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleUnassignAsset(ast)}
                        disabled={processingId === ast.id}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition shrink-0"
                        title="Desasignar y devolver al stock"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Resumen al pie del lado derecho */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs flex items-center justify-between shrink-0">
              <span className="text-slate-500 font-medium">Total en posesión:</span>
              <span className="font-bold text-slate-800">{assignedAssets.length} equipos</span>
            </div>
          </div>
        </div>

        {/* 4. Footer General */}
        <div className="px-6 py-3 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Pistoleo activo: Puedes seguir disparando a los códigos para agregar más equipos.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs transition"
            >
              Listo / Cerrar
            </button>
            {assignedAssets.length > 0 && onOpenResponsiva && (
              <button
                onClick={() => {
                  onClose();
                  onOpenResponsiva();
                }}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs shadow-sm transition flex items-center gap-1.5"
              >
                <FileText className="w-4 h-4" />
                <span>Generar Carta Responsiva</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
