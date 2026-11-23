import React, { useEffect, useMemo, useState } from 'react';
import {
  Drop,
  Plus,
  Minus,
  MagnifyingGlass,
  ArrowsClockwise,
  PencilSimple,
  Trash,
  Printer,
  WarningCircle,
  ClockCounterClockwise,
  Package,
  X,
  ArrowDownLeft,
  ArrowUpRight,
  SlidersHorizontal,
} from '@phosphor-icons/react';
import { api } from '../api';
import {
  Asset,
  Consumable,
  ConsumableColor,
  ConsumableKind,
  ConsumableMovement,
  Department,
  LocationType,
} from '../types';
import { BrandTag } from '../components/HardwareIcon';
import { CopyButton } from '../components/CopyButton';

const KIND_LABELS: Record<ConsumableKind, string> = {
  TONER: 'Tóner',
  CARTUCHO: 'Cartucho',
  CINTA: 'Cinta / Ribbon',
  TAMBOR: 'Tambor / Drum',
  OTRO: 'Otro',
};

const COLOR_DOT: Record<ConsumableColor, { label: string; dot: string; badge: string }> = {
  NEGRO: {
    label: 'Negro',
    dot: 'bg-slate-900',
    badge: 'bg-slate-100 text-slate-800 border-slate-200',
  },
  CIAN: {
    label: 'Cian',
    dot: 'bg-cyan-500',
    badge: 'bg-cyan-50 text-cyan-800 border-cyan-200',
  },
  MAGENTA: {
    label: 'Magenta',
    dot: 'bg-pink-500',
    badge: 'bg-pink-50 text-pink-800 border-pink-200',
  },
  AMARILLO: {
    label: 'Amarillo',
    dot: 'bg-amber-400',
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  COLOR: {
    label: 'Tricolor',
    dot: 'bg-gradient-to-tr from-cyan-500 via-pink-500 to-amber-400',
    badge: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  },
  NA: {
    label: 'N/A',
    dot: 'bg-slate-300',
    badge: 'bg-slate-50 text-slate-600 border-slate-200',
  },
};

export const ConsumablesView: React.FC = () => {
  const [consumables, setConsumables] = useState<Consumable[]>([]);
  const [movements, setMovements] = useState<ConsumableMovement[]>([]);
  const [printers, setPrinters] = useState<Asset[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'CATALOG' | 'MOVEMENTS'>('CATALOG');
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<string>('');
  const [locationFilter, setLocationFilter] = useState<string>('');
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  // Modal Alta / Edición
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Consumable | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [kind, setKind] = useState<ConsumableKind>('TONER');
  const [brand, setBrand] = useState('KYOCERA');
  const [color, setColor] = useState<ConsumableColor>('NEGRO');
  const [compatibleModels, setCompatibleModels] = useState('');
  const [location, setLocation] = useState<LocationType>('OPM');
  const [stock, setStock] = useState(1);
  const [minStock, setMinStock] = useState(2);
  const [idealStock, setIdealStock] = useState(4);
  const [unitCost, setUnitCost] = useState(0);
  const [pageYield, setPageYield] = useState(0);
  const [notes, setNotes] = useState('');
  const [savingForm, setSavingForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Modal Movimiento (Entrada / Salida / Ajuste)
  const [moveTarget, setMoveTarget] = useState<Consumable | null>(null);
  const [moveType, setMoveType] = useState<'IN' | 'OUT' | 'ADJUST'>('OUT');
  const [moveQty, setMoveQty] = useState(1);
  const [movePrinterId, setMovePrinterId] = useState('');
  const [moveDept, setMoveDept] = useState('');
  const [moveNotes, setMoveNotes] = useState('');
  const [savingMove, setSavingMove] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [cList, mList, allAssets, depts] = await Promise.all([
        api.getConsumables().catch(() => []),
        api.getConsumableMovements().catch(() => []),
        api.getAssets({ category: 'IMPRESORA' }).catch(() => []),
        api.getDepartments().catch(() => []),
      ]);
      setConsumables(cList);
      setMovements(mList);
      setPrinters(allAssets);
      setDepartments(depts);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setCode('');
    setName('');
    setKind('TONER');
    setBrand('KYOCERA');
    setColor('NEGRO');
    setCompatibleModels('');
    setLocation('OPM');
    setStock(1);
    setMinStock(2);
    setIdealStock(4);
    setUnitCost(0);
    setPageYield(0);
    setNotes('');
    setFormError(null);
    setFormOpen(true);
  };

  const openEditModal = (c: Consumable) => {
    setEditingItem(c);
    setCode(c.code);
    setName(c.name);
    setKind(c.kind);
    setBrand(c.brand);
    setColor(c.color);
    setCompatibleModels(c.compatible_models);
    setLocation(c.location);
    setStock(c.stock);
    setMinStock(c.min_stock);
    setIdealStock(c.ideal_stock || 4);
    setUnitCost(c.unit_cost || 0);
    setPageYield(c.page_yield || 0);
    setNotes(c.notes);
    setFormError(null);
    setFormOpen(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      setFormError('El código (SKU) y el nombre son obligatorios.');
      return;
    }
    try {
      setSavingForm(true);
      setFormError(null);
      const payload = {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        kind,
        brand: brand.trim().toUpperCase(),
        color,
        compatible_models: compatibleModels.trim(),
        location,
        stock: Number(stock) || 0,
        min_stock: Number(minStock) || 0,
        ideal_stock: Number(idealStock) || 4,
        unit_cost: Number(unitCost) || 0,
        page_yield: Number(pageYield) || 0,
        notes: notes.trim(),
      };
      if (editingItem) {
        await api.updateConsumable(editingItem.id, payload);
      } else {
        await api.createConsumable(payload);
      }
      setFormOpen(false);
      await loadAll();
    } catch (err: any) {
      setFormError(err.message || 'No se pudo guardar el consumible');
    } finally {
      setSavingForm(false);
    }
  };

  const openMoveModal = (c: Consumable, type: 'IN' | 'OUT' | 'ADJUST') => {
    setMoveTarget(c);
    setMoveType(type);
    setMoveQty(type === 'ADJUST' ? c.stock : 1);
    setMovePrinterId('');
    setMoveDept('');
    setMoveNotes('');
    setMoveError(null);
  };

  const handleSaveMove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moveTarget) return;
    try {
      setSavingMove(true);
      setMoveError(null);
      await api.moveConsumable(moveTarget.id, {
        movement_type: moveType,
        quantity: Number(moveQty) || 0,
        printer_asset_id: movePrinterId || undefined,
        department: moveDept.trim(),
        notes: moveNotes.trim(),
      });
      setMoveTarget(null);
      await loadAll();
    } catch (err: any) {
      setMoveError(err.message || 'No se pudo registrar el movimiento');
    } finally {
      setSavingMove(false);
    }
  };

  const handleDelete = async (c: Consumable) => {
    if (!window.confirm(`¿Eliminar el consumible ${c.code} (${c.name}) y su historial?`)) return;
    try {
      await api.deleteConsumable(c.id);
      await loadAll();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar');
    }
  };

  const filteredConsumables = useMemo(() => {
    const q = search.trim().toLowerCase();
    return consumables.filter((c) => {
      if (kindFilter && c.kind !== kindFilter) return false;
      if (locationFilter && c.location !== locationFilter) return false;
      if (onlyLowStock && c.stock > c.min_stock) return false;
      if (!q) return true;
      return (
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.brand.toLowerCase().includes(q) ||
        c.compatible_models.toLowerCase().includes(q)
      );
    });
  }, [consumables, search, kindFilter, locationFilter, onlyLowStock]);

  const kpis = useMemo(() => {
    const totalModels = consumables.length;
    const totalPieces = consumables.reduce((acc, c) => acc + c.stock, 0);
    const lowStock = consumables.filter((c) => c.stock <= c.min_stock).length;
    const toBuy = consumables.reduce(
      (acc, c) => acc + Math.max(0, (c.ideal_stock || 4) - c.stock),
      0
    );
    const now = new Date();
    const monthOuts = movements
      .filter((m) => {
        if (m.movement_type !== 'OUT') return false;
        const d = new Date(m.created_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((acc, m) => acc + m.quantity, 0);
    return { totalModels, totalPieces, lowStock, toBuy, monthOuts };
  }, [consumables, movements]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-[#E6E8F0] p-4 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Modelos Registrados
            </p>
            <p className="text-2xl font-display font-bold text-slate-900 mt-1 tabular-nums">
              {kpis.totalModels}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#F3F2FF] border border-[#E4E2F8] flex items-center justify-center text-[#5B4FE9]">
            <Drop className="w-5 h-5" weight="duotone" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E6E8F0] p-4 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Piezas en Stock
            </p>
            <p className="text-2xl font-display font-bold text-emerald-700 mt-1 tabular-nums">
              {kpis.totalPieces}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <Package className="w-5 h-5" weight="duotone" />
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setActiveTab('CATALOG');
            setOnlyLowStock((prev) => !prev);
          }}
          className={`text-left bg-white rounded-2xl border p-4 shadow-2xs flex items-center justify-between transition hover:-translate-y-0.5 ${
            onlyLowStock ? 'border-amber-400 ring-2 ring-amber-200' : 'border-[#E6E8F0]'
          }`}
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Stock Bajo / Agotado
            </p>
            <p className="text-2xl font-display font-bold text-amber-700 mt-1 tabular-nums">
              {kpis.lowStock}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <WarningCircle className="w-5 h-5" weight="duotone" />
          </div>
        </button>

        <div className="bg-white rounded-2xl border border-[#E6E8F0] p-4 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Por Comprar (a Ideal)
            </p>
            <p className="text-2xl font-display font-bold text-sky-700 mt-1 tabular-nums">
              {kpis.toBuy}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
              {kpis.monthOuts} salidas este mes
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600">
            <Printer className="w-5 h-5" weight="duotone" />
          </div>
        </div>
      </div>

      {/* Contenedor Principal */}
      <div className="bg-white rounded-2xl border border-[#E6E8F0] shadow-2xs overflow-hidden">
        {/* Header + Tabs + CTA */}
        <div className="px-6 py-4 border-b border-[#E6E8F0] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('CATALOG')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
                activeTab === 'CATALOG'
                  ? 'bg-[#F3F2FF] text-[#4F46E5] border border-[#E4E2F8]'
                  : 'text-slate-600 hover:bg-slate-50 border border-transparent'
              }`}
            >
              <Drop className="w-4 h-4" weight="duotone" />
              <span>Catálogo & Stock ({consumables.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('MOVEMENTS')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
                activeTab === 'MOVEMENTS'
                  ? 'bg-[#F3F2FF] text-[#4F46E5] border border-[#E4E2F8]'
                  : 'text-slate-600 hover:bg-slate-50 border border-transparent'
              }`}
            >
              <ClockCounterClockwise className="w-4 h-4" weight="duotone" />
              <span>Historial de Movimientos ({movements.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadAll}
              aria-label="Actualizar consumibles"
              className="p-2 rounded-xl border border-[#E6E8F0] bg-white hover:bg-slate-50 text-slate-600 transition active:scale-[0.98]"
            >
              <ArrowsClockwise className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} weight="bold" />
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 bg-[#5B4FE9] hover:bg-[#4B3FD8] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" weight="bold" />
              <span>Nuevo Tóner / Cartucho</span>
            </button>
          </div>
        </div>

        {activeTab === 'CATALOG' ? (
          <>
            {/* Filtros Instantáneos */}
            <div className="px-6 py-3.5 bg-[#F6F7FB]/70 border-b border-[#E6E8F0] flex flex-wrap items-center gap-3 text-xs">
              <div className="relative flex-1 min-w-[220px]">
                <MagnifyingGlass
                  className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                  weight="duotone"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por SKU, nombre, marca o impresora compatible..."
                  className="w-full bg-white border border-[#E6E8F0] rounded-xl pl-9 pr-8 py-2 text-slate-800 placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B4FE9]"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    aria-label="Limpiar búsqueda"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" weight="bold" />
                  </button>
                )}
              </div>

              <select
                value={kindFilter}
                onChange={(e) => setKindFilter(e.target.value)}
                aria-label="Filtrar por tipo"
                className="bg-white border border-[#E6E8F0] rounded-xl px-3 py-2 font-medium text-slate-700 focus-visible:ring-2 focus-visible:ring-[#5B4FE9]"
              >
                <option value="">Todos los Tipos</option>
                <option value="TONER">Tóner</option>
                <option value="CARTUCHO">Cartucho</option>
                <option value="CINTA">Cinta / Ribbon</option>
                <option value="TAMBOR">Tambor / Drum</option>
                <option value="OTRO">Otro</option>
              </select>

              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                aria-label="Filtrar por sede"
                className="bg-white border border-[#E6E8F0] rounded-xl px-3 py-2 font-medium text-slate-700 focus-visible:ring-2 focus-visible:ring-[#5B4FE9]"
              >
                <option value="">Todas las Sedes</option>
                <option value="OPM">OPM</option>
                <option value="OMEX">OMEX</option>
              </select>

              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-[#E6E8F0] cursor-pointer select-none font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={onlyLowStock}
                  onChange={(e) => setOnlyLowStock(e.target.checked)}
                  className="rounded border-slate-300 text-[#5B4FE9]"
                />
                <span>Solo stock bajo</span>
              </label>
            </div>

            {/* Tabla de Consumibles */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E6E8F0] bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4 sticky left-0 bg-slate-50 z-10 border-r border-[#E6E8F0]">
                      SKU / Consumible
                    </th>
                    <th className="py-3 px-4">Tipo & Color</th>
                    <th className="py-3 px-4">Impresoras Compatibles</th>
                    <th className="py-3 px-4">Costo / Rend.</th>
                    <th className="py-3 px-4 text-right">Stock / Ideal</th>
                    <th className="py-3 px-4 text-center">Comprar</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6E8F0]">
                  {filteredConsumables.map((c) => {
                    const colorInfo = COLOR_DOT[c.color] || COLOR_DOT.NA;
                    const isOut = c.stock === 0;
                    const isLow = c.stock > 0 && c.stock <= c.min_stock;
                    const ideal = c.ideal_stock || 4;
                    const toBuy = Math.max(0, ideal - c.stock);
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 sticky left-0 bg-white z-10 border-r border-[#E6E8F0] min-w-[230px]">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900">{c.code}</span>
                            <CopyButton value={c.code} label="código" />
                            <BrandTag brand={c.brand} />
                          </div>
                          <div className="text-slate-600 font-medium mt-0.5 truncate max-w-[260px]" title={c.name}>
                            {c.name}
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md text-[10px]">
                              {KIND_LABELS[c.kind] || c.kind}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${colorInfo.badge}`}
                            >
                              <span className={`w-2 h-2 rounded-full ${colorInfo.dot}`} />
                              {colorInfo.label}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600 max-w-[220px]">
                          {c.compatible_models ? (
                            <span className="truncate block" title={c.compatible_models}>
                              {c.compatible_models}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">No especificado</span>
                          )}
                          <span className="inline-block mt-1 font-bold text-sky-800 bg-sky-50 px-1.5 py-0.5 rounded text-[10px] border border-sky-200">
                            {c.location}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {c.unit_cost > 0 ? (
                            <div className="font-mono font-semibold text-slate-800 tabular-nums">
                              ${c.unit_cost.toLocaleString('es-MX')}
                            </div>
                          ) : (
                            <div className="text-slate-400 italic">Sin precio</div>
                          )}
                          {c.page_yield > 0 && (
                            <div className="text-[10px] text-slate-400 tabular-nums">
                              {c.page_yield.toLocaleString('es-MX')} págs
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            <span
                              className={`font-mono font-bold text-sm tabular-nums px-2.5 py-0.5 rounded-lg border ${
                                isOut
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : isLow
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}
                            >
                              {c.stock}
                            </span>
                            <span className="text-[10px] text-slate-400 tabular-nums">
                              / {ideal}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {toBuy > 0 ? (
                            <span className="font-mono font-bold text-xs tabular-nums px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                              +{toBuy}
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                              OK
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openMoveModal(c, 'IN')}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-semibold transition active:scale-[0.98]"
                              title="Registrar entrada de stock"
                            >
                              <Plus className="w-3.5 h-3.5" weight="bold" />
                              <span>Entrada</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => openMoveModal(c, 'OUT')}
                              disabled={c.stock === 0}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#F3F2FF] hover:bg-[#E4E2F8] text-[#4F46E5] border border-[#E4E2F8] font-semibold transition disabled:opacity-40 active:scale-[0.98]"
                              title="Entregar o instalar en impresora"
                            >
                              <Minus className="w-3.5 h-3.5" weight="bold" />
                              <span>Salida</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => openMoveModal(c, 'ADJUST')}
                              aria-label="Ajustar stock"
                              title="Ajuste manual de inventario"
                              className="p-1.5 rounded-lg border border-[#E6E8F0] hover:bg-slate-100 text-slate-600 transition"
                            >
                              <SlidersHorizontal className="w-3.5 h-3.5" weight="duotone" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditModal(c)}
                              aria-label="Editar consumible"
                              className="p-1.5 rounded-lg border border-[#E6E8F0] hover:bg-slate-100 text-slate-600 transition"
                            >
                              <PencilSimple className="w-3.5 h-3.5" weight="duotone" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(c)}
                              aria-label="Eliminar consumible"
                              className="p-1.5 rounded-lg border border-[#E6E8F0] hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-slate-500 transition"
                            >
                              <Trash className="w-3.5 h-3.5" weight="duotone" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredConsumables.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 italic">
                        {consumables.length === 0
                          ? 'Aún no hay tóners o cartuchos registrados. Haz clic en "Nuevo Tóner / Cartucho" para comenzar.'
                          : 'No se encontraron consumibles con los filtros actuales.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          /* Historial de Movimientos */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E6E8F0] bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Movimiento</th>
                  <th className="py-3 px-4">Consumible</th>
                  <th className="py-3 px-4 text-right">Cantidad</th>
                  <th className="py-3 px-4">Impresora / Área</th>
                  <th className="py-3 px-4">Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E8F0]">
                {movements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 tabular-nums whitespace-nowrap">
                      {new Date(m.created_at).toLocaleString('es-MX', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {m.movement_type === 'IN' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <ArrowDownLeft className="w-3 h-3" weight="bold" />
                          ENTRADA
                        </span>
                      ) : m.movement_type === 'OUT' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                          <ArrowUpRight className="w-3 h-3" weight="bold" />
                          SALIDA
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          AJUSTE
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-slate-900">{m.consumable_code}</div>
                      <div className="text-slate-500 truncate max-w-[220px]">{m.consumable_name}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold tabular-nums whitespace-nowrap">
                      {m.movement_type === 'IN' ? (
                        <span className="text-emerald-700">+{m.quantity}</span>
                      ) : m.movement_type === 'OUT' ? (
                        <span className="text-rose-600">-{m.quantity}</span>
                      ) : (
                        <span className="text-amber-700">={m.quantity}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {m.printer_tag ? (
                        <div className="flex items-center gap-1.5">
                          <Printer className="w-3.5 h-3.5 text-amber-600 shrink-0" weight="duotone" />
                          <span className="font-mono font-semibold text-slate-800">{m.printer_tag}</span>
                          {m.printer_model && (
                            <span className="text-slate-400">({m.printer_model})</span>
                          )}
                        </div>
                      ) : m.department ? (
                        <span className="font-medium text-slate-700">{m.department}</span>
                      ) : (
                        <span className="text-slate-400 italic">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-[240px] truncate" title={m.notes}>
                      {m.notes || '—'}
                    </td>
                  </tr>
                ))}
                {movements.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 italic">
                      Sin movimientos registrados todavía.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Alta / Edición de Consumible */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-[#E6E8F0] w-full max-w-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E6E8F0] flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-sm font-display font-bold text-slate-900">
                  {editingItem ? 'Editar Tóner / Cartucho' : 'Registrar Nuevo Tóner / Cartucho'}
                </h3>
                <p className="text-xs text-slate-500">
                  Control de catálogo, compatibilidad de impresoras y stock mínimo
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
              >
                <X className="w-4 h-4" weight="bold" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2 font-medium">
                  <WarningCircle className="w-4 h-4 shrink-0" weight="duotone" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Código / SKU *:</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Ej. TK-5242K"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-900"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">Nombre / Descripción *:</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Tóner Negro Kyocera M5526cdw"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tipo:</label>
                  <select
                    value={kind}
                    onChange={(e) => setKind(e.target.value as ConsumableKind)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-medium"
                  >
                    <option value="TONER">Tóner</option>
                    <option value="CARTUCHO">Cartucho</option>
                    <option value="CINTA">Cinta / Ribbon</option>
                    <option value="TAMBOR">Tambor / Drum</option>
                    <option value="OTRO">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Marca:</label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="KYOCERA, BROTHER, ZEBRA..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 uppercase font-semibold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Color:</label>
                  <select
                    value={color}
                    onChange={(e) => setColor(e.target.value as ConsumableColor)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-medium"
                  >
                    <option value="NEGRO">Negro</option>
                    <option value="CIAN">Cian</option>
                    <option value="MAGENTA">Magenta</option>
                    <option value="AMARILLO">Amarillo</option>
                    <option value="COLOR">Tricolor</option>
                    <option value="NA">N/A</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Impresoras Compatibles:
                </label>
                <input
                  type="text"
                  value={compatibleModels}
                  onChange={(e) => setCompatibleModels(e.target.value)}
                  placeholder="Ej. ECOSYS M5526cdw, ECOSYS P2235dn, ZT411..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Sede:</label>
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value as LocationType)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-sky-800"
                  >
                    <option value="OPM">OPM</option>
                    <option value="OMEX">OMEX</option>
                  </select>
                </div>
                {!editingItem && (
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Stock Inicial:</label>
                    <input
                      type="number"
                      min={0}
                      value={stock}
                      onChange={(e) => setStock(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold tabular-nums"
                    />
                  </div>
                )}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Stock Mínimo (Alerta):</label>
                  <input
                    type="number"
                    min={0}
                    value={minStock}
                    onChange={(e) => setMinStock(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold tabular-nums"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Stock Ideal:</label>
                  <input
                    type="number"
                    min={1}
                    value={idealStock}
                    onChange={(e) => setIdealStock(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Precio Unitario (MXN):</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={unitCost}
                    onChange={(e) => setUnitCost(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold tabular-nums"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Rendimiento (páginas):</label>
                  <input
                    type="number"
                    min={0}
                    value={pageYield}
                    onChange={(e) => setPageYield(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Notas:</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Proveedor, ubicación en almacén, etc."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E6E8F0] font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingForm}
                  className="px-5 py-2 rounded-xl bg-[#5B4FE9] hover:bg-[#4B3FD8] text-white font-bold transition disabled:opacity-50"
                >
                  {savingForm ? 'Guardando...' : editingItem ? 'Guardar Cambios' : 'Registrar Consumible'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Movimiento de Stock */}
      {moveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-[#E6E8F0] w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E6E8F0] flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-sm font-display font-bold text-slate-900">
                  {moveType === 'IN'
                    ? 'Registrar Entrada de Stock'
                    : moveType === 'OUT'
                    ? 'Registrar Salida / Instalación'
                    : 'Ajuste Manual de Stock'}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {moveTarget.code} • Stock actual: <strong>{moveTarget.stock}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMoveTarget(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
              >
                <X className="w-4 h-4" weight="bold" />
              </button>
            </div>

            <form onSubmit={handleSaveMove} className="p-6 space-y-4 text-xs">
              {moveError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2 font-medium">
                  <WarningCircle className="w-4 h-4 shrink-0" weight="duotone" />
                  <span>{moveError}</span>
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  {moveType === 'ADJUST' ? 'Nuevo Stock Total:' : 'Cantidad:'}
                </label>
                <input
                  type="number"
                  min={moveType === 'ADJUST' ? 0 : 1}
                  max={moveType === 'OUT' ? moveTarget.stock : undefined}
                  value={moveQty}
                  onChange={(e) => setMoveQty(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-base tabular-nums"
                />
              </div>

              {moveType === 'OUT' && (
                <>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Impresora Destino (Opcional):
                    </label>
                    <select
                      value={movePrinterId}
                      onChange={(e) => {
                        const pid = e.target.value;
                        setMovePrinterId(pid);
                        const p = printers.find((item) => item.id === pid);
                        if (p?.department) setMoveDept(p.department);
                      }}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-medium"
                    >
                      <option value="">(Sin impresora específica)</option>
                      {printers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.asset_tag} — {p.brand} {p.model}
                          {p.department ? ` (${p.department})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Área / Departamento (Opcional):
                    </label>
                    <select
                      value={moveDept}
                      onChange={(e) => setMoveDept(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-medium"
                    >
                      <option value="">(Sin especificar)</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.name}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Notas:</label>
                <input
                  type="text"
                  value={moveNotes}
                  onChange={(e) => setMoveNotes(e.target.value)}
                  placeholder={
                    moveType === 'IN'
                      ? 'Ej. Orden de compra #1234'
                      : 'Ej. Cambio por tóner agotado'
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMoveTarget(null)}
                  className="px-4 py-2 rounded-xl border border-[#E6E8F0] font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingMove}
                  className="px-5 py-2 rounded-xl bg-[#5B4FE9] hover:bg-[#4B3FD8] text-white font-bold transition disabled:opacity-50"
                >
                  {savingMove ? 'Registrando...' : 'Confirmar Movimiento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
