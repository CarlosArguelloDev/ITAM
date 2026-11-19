import React, { useMemo, useState } from 'react';
import {
  MagnifyingGlass,
  Funnel,
  ArrowsDownUp,
  Columns,
  DownloadSimple,
  CaretRight,
  CaretDown,
  CaretLeft,
  ArrowUp,
  ArrowDown,
  X,
  Rows,
} from '@phosphor-icons/react';
import { Asset, AssetStatus } from '../types';
import { HardwareIcon, BrandTag } from './HardwareIcon';

export type GroupByOption = 'none' | 'category' | 'status' | 'department' | 'location';
export type SortField = 'asset_tag' | 'category' | 'serial_number' | 'status' | 'assigned_to_name' | 'location' | 'last_audited_at';

interface ColumnConfig {
  id: 'category' | 'serial_number' | 'status' | 'custody' | 'location' | 'last_audited_at';
  label: string;
}

const OPTIONAL_COLUMNS: ColumnConfig[] = [
  { id: 'category', label: 'Categoría' },
  { id: 'serial_number', label: 'Número de Serie' },
  { id: 'status', label: 'Estado' },
  { id: 'custody', label: 'Custodia' },
  { id: 'location', label: 'Sede / Área' },
  { id: 'last_audited_at', label: 'Última Auditoría' },
];

interface AssetDataTableProps {
  title: string;
  assets: Asset[];
  loading?: boolean;
  emptyMessage?: string;
  defaultColumns?: ColumnConfig['id'][];
  headerActions?: React.ReactNode;
  renderActions?: (asset: Asset) => React.ReactNode;
}

export const AssetDataTable: React.FC<AssetDataTableProps> = ({
  title,
  assets,
  loading = false,
  emptyMessage = 'No se encontraron equipos con los filtros aplicados.',
  defaultColumns = ['category', 'serial_number', 'status', 'custody', 'location', 'last_audited_at'],
  headerActions,
  renderActions,
}) => {
  // Filtros instantáneos
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Agrupación, ordenamiento, columnas y paginación
  const [groupBy, setGroupBy] = useState<GroupByOption>('none');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [sortField, setSortField] = useState<SortField>('asset_tag');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [visibleCols, setVisibleCols] = useState<Record<ColumnConfig['id'], boolean>>(() => ({
    category: defaultColumns.includes('category'),
    serial_number: defaultColumns.includes('serial_number'),
    status: defaultColumns.includes('status'),
    custody: defaultColumns.includes('custody'),
    location: defaultColumns.includes('location'),
    last_audited_at: defaultColumns.includes('last_audited_at'),
  }));
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);

  const uniqueCategories = useMemo(
    () => Array.from(new Set(assets.map((a) => a.category).filter(Boolean))).sort(),
    [assets]
  );
  const uniqueDepartments = useMemo(
    () => Array.from(new Set(assets.map((a) => a.department).filter(Boolean) as string[])).sort(),
    [assets]
  );

  // Filtrado instantáneo en memoria
  const filteredAssets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assets.filter((a) => {
      if (categoryFilter && a.category !== categoryFilter) return false;
      if (statusFilter && a.status !== statusFilter) return false;
      if (locationFilter && a.location !== locationFilter) return false;
      if (departmentFilter && (a.department || '') !== departmentFilter) return false;
      if (!q) return true;
      return (
        a.asset_tag.toLowerCase().includes(q) ||
        (a.serial_number || '').toLowerCase().includes(q) ||
        (a.brand || '').toLowerCase().includes(q) ||
        (a.model || '').toLowerCase().includes(q) ||
        (a.category || '').toLowerCase().includes(q) ||
        (a.assigned_to_name || '').toLowerCase().includes(q) ||
        (a.department || '').toLowerCase().includes(q)
      );
    });
  }, [assets, search, categoryFilter, statusFilter, locationFilter, departmentFilter]);

  // Ordenamiento
  const sortedAssets = useMemo(() => {
    const copy = [...filteredAssets];
    copy.sort((a, b) => {
      const av = String((a as any)[sortField] || '').toLowerCase();
      const bv = String((b as any)[sortField] || '').toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return copy;
  }, [filteredAssets, sortField, sortDir]);

  // Paginación
  const totalCount = sortedAssets.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, totalCount);
  const pagedAssets = useMemo(
    () => sortedAssets.slice(startIdx, endIdx),
    [sortedAssets, startIdx, endIdx]
  );

  // Agrupación sobre la página (o filas filtradas si está agrupado)
  const groupedRows = useMemo(() => {
    if (groupBy === 'none') return null;
    const map = new Map<string, Asset[]>();
    sortedAssets.forEach((a) => {
      let key = 'Sin especificar';
      if (groupBy === 'category') key = a.category || 'Sin categoría';
      else if (groupBy === 'status') key = a.status || 'Sin estado';
      else if (groupBy === 'department') key = a.department || 'Sin departamento';
      else if (groupBy === 'location') key = a.location || 'Sin sede';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [sortedAssets, groupBy]);

  const activeFilterCount =
    (categoryFilter ? 1 : 0) +
    (statusFilter ? 1 : 0) +
    (locationFilter ? 1 : 0) +
    (departmentFilter ? 1 : 0);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setPage(1);
  };

  const resetFilters = () => {
    setSearch('');
    setCategoryFilter('');
    setStatusFilter('');
    setLocationFilter('');
    setDepartmentFilter('');
    setPage(1);
  };

  const exportCSV = () => {
    const headers = ['Tag', 'Marca', 'Modelo', 'Categoría', 'Serial', 'Estado', 'Custodia', 'Sede', 'Departamento'];
    const rows = sortedAssets.map((a) => [
      a.asset_tag,
      a.brand,
      a.model,
      a.category,
      a.serial_number,
      a.status,
      a.assigned_to_name || 'En Stock',
      a.location,
      a.department || '',
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `activos_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: AssetStatus) => {
    switch (status) {
      case 'ASSIGNED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
            ASSIGNED
          </span>
        );
      case 'AVAILABLE':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            AVAILABLE
          </span>
        );
      case 'MAINTENANCE':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            MAINTENANCE
          </span>
        );
      case 'RETIRED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
            RETIRED
          </span>
        );
      case 'LOST':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            LOST
          </span>
        );
    }
  };

  const renderSortHeader = (label: string, field: SortField) => {
    const active = sortField === field;
    return (
      <button
        type="button"
        onClick={() => toggleSort(field)}
        className="inline-flex items-center gap-1 font-semibold text-slate-500 hover:text-slate-900 transition"
      >
        <span>{label}</span>
        {active &&
          (sortDir === 'asc' ? (
            <ArrowUp weight="bold" className="w-3 h-3 text-[#5B4FE9]" />
          ) : (
            <ArrowDown weight="bold" className="w-3 h-3 text-[#5B4FE9]" />
          ))}
      </button>
    );
  };

  const renderRow = (a: Asset) => (
    <tr key={a.id} className="group hover:bg-[#F8FAFC] transition-colors">
      {/* Primera Columna Fijada (Pinned Left) */}
      <td className="sticky left-0 z-10 bg-white group-hover:bg-[#F8FAFC] py-3 pl-5 pr-4 border-r border-slate-100 shadow-[2px_0_6px_-2px_rgba(15,23,42,0.06)]">
        <div className="flex items-center gap-3 min-w-[210px]">
          <div className="w-8 h-8 rounded-xl bg-[#F6F7FB] border border-[#E6E8F0] flex items-center justify-center shrink-0">
            <HardwareIcon category={a.category} className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-bold text-slate-900 text-xs">{a.asset_tag}</span>
              <BrandTag brand={a.brand} />
            </div>
            <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
              {a.model || a.category}
            </div>
          </div>
        </div>
      </td>

      {visibleCols.category && (
        <td className="py-3 px-4 font-semibold text-slate-700 whitespace-nowrap">{a.category}</td>
      )}

      {visibleCols.serial_number && (
        <td className="py-3 px-4 font-mono text-slate-700 tabular-nums whitespace-nowrap">
          {a.serial_number || '—'}
        </td>
      )}

      {visibleCols.status && <td className="py-3 px-4 whitespace-nowrap">{getStatusBadge(a.status)}</td>}

      {visibleCols.custody && (
        <td className="py-3 px-4 whitespace-nowrap">
          {a.assigned_to_name ? (
            <span className="font-semibold text-slate-800">{a.assigned_to_name}</span>
          ) : (
            <span className="text-slate-400 italic">Sin persona</span>
          )}
        </td>
      )}

      {visibleCols.location && (
        <td className="py-3 px-4 whitespace-nowrap">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded-md text-[10px] border border-sky-200">
              {a.location}
            </span>
            {a.department && (
              <span className="text-[11px] text-slate-600 font-medium truncate max-w-[130px]" title={a.department}>
                {a.department}
              </span>
            )}
          </div>
        </td>
      )}

      {visibleCols.last_audited_at && (
        <td className="py-3 px-4 text-slate-500 tabular-nums whitespace-nowrap">
          {a.last_audited_at ? (
            new Date(a.last_audited_at).toLocaleDateString('es-MX', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })
          ) : (
            <span className="text-amber-700 font-semibold text-[11px]">Sin auditar</span>
          )}
        </td>
      )}

      {renderActions && (
        <td className="py-3 pl-4 pr-5 text-right whitespace-nowrap">
          <div className="inline-flex items-center justify-end gap-1">{renderActions(a)}</div>
        </td>
      )}
    </tr>
  );

  return (
    <div className="bg-white rounded-2xl border border-[#E6E8F0] shadow-2xs overflow-hidden">
      {/* Toolbar superior estilo referencia (Title + Search instantáneo + Filter + Group + Sort + Columns + Export) */}
      <div className="px-5 py-4 border-b border-[#E6E8F0] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#F3F2FF] text-[#4F46E5] border border-[#E4E2F8] tabular-nums">
            {totalCount}
          </span>
          {(search || activeFilterCount > 0) && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-rose-600 px-2 py-0.5 rounded-lg hover:bg-rose-50 transition"
            >
              <X weight="bold" className="w-3 h-3" />
              <span>Limpiar</span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Búsqueda Instantánea */}
          <div className="relative flex-1 sm:flex-initial sm:w-64">
            <MagnifyingGlass
              weight="duotone"
              className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar al instante (tag, serie, modelo...)"
              aria-label="Buscar activos al instante"
              className="w-full pl-9 pr-8 py-1.5 bg-[#F6F7FB] border border-[#E6E8F0] rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white transition"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
                aria-label="Limpiar búsqueda"
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700"
              >
                <X weight="bold" className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Botón Filtros */}
          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
              filtersOpen || activeFilterCount > 0
                ? 'bg-[#F3F2FF] border-[#C7D2FE] text-[#4F46E5]'
                : 'bg-white border-[#E6E8F0] text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Funnel weight="duotone" className="w-3.5 h-3.5" />
            <span>Filtros</span>
            {activeFilterCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#5B4FE9] text-white text-[10px] tabular-nums">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Selector Agrupar por (Row Grouping) */}
          <div className="inline-flex items-center gap-1.5 bg-white border border-[#E6E8F0] rounded-xl px-2.5 py-1.5 text-xs">
            <Rows weight="duotone" className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupByOption)}
              aria-label="Agrupar filas por"
              className="bg-transparent font-semibold text-slate-700 text-xs focus:outline-none cursor-pointer"
            >
              <option value="none">Sin agrupar</option>
              <option value="category">Agrupar: Categoría</option>
              <option value="status">Agrupar: Estado</option>
              <option value="department">Agrupar: Depto / Site</option>
              <option value="location">Agrupar: Sede</option>
            </select>
          </div>

          {/* Selector Ordenar */}
          <div className="inline-flex items-center gap-1.5 bg-white border border-[#E6E8F0] rounded-xl px-2.5 py-1.5 text-xs">
            <ArrowsDownUp weight="duotone" className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={sortField}
              onChange={(e) => {
                setSortField(e.target.value as SortField);
                setPage(1);
              }}
              aria-label="Ordenar por"
              className="bg-transparent font-semibold text-slate-700 text-xs focus:outline-none cursor-pointer"
            >
              <option value="asset_tag">Orden: Tag</option>
              <option value="category">Orden: Categoría</option>
              <option value="serial_number">Orden: Serie</option>
              <option value="status">Orden: Estado</option>
              <option value="assigned_to_name">Orden: Custodia</option>
            </select>
          </div>

          {/* Selector de Columnas */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setColumnsOpen((o) => !o)}
              aria-label="Administrar columnas"
              className="p-2 rounded-xl bg-white border border-[#E6E8F0] text-slate-600 hover:bg-slate-50 transition"
              title="Mostrar / ocultar columnas"
            >
              <Columns weight="duotone" className="w-4 h-4" />
            </button>
            {columnsOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl border border-[#E6E8F0] shadow-lg p-2.5 z-30 space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 pb-1">
                  Columnas visibles
                </div>
                {OPTIONAL_COLUMNS.map((col) => (
                  <label
                    key={col.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 text-xs text-slate-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={visibleCols[col.id]}
                      onChange={(e) =>
                        setVisibleCols((prev) => ({ ...prev, [col.id]: e.target.checked }))
                      }
                      className="rounded border-slate-300 text-[#5B4FE9]"
                    />
                    <span>{col.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Exportar CSV */}
          <button
            type="button"
            onClick={exportCSV}
            aria-label="Exportar a CSV"
            title="Exportar vista filtrada a CSV"
            className="p-2 rounded-xl bg-white border border-[#E6E8F0] text-slate-600 hover:bg-slate-50 transition"
          >
            <DownloadSimple weight="duotone" className="w-4 h-4" />
          </button>

          {headerActions}
        </div>
      </div>

      {/* Panel de Filtros Instantáneos */}
      {filtersOpen && (
        <div className="px-5 py-3 bg-[#F6F7FB] border-b border-[#E6E8F0] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filtrar por categoría"
            className="bg-white border border-[#E6E8F0] rounded-xl px-3 py-2 font-medium text-slate-700"
          >
            <option value="">Todas las Categorías</option>
            {uniqueCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filtrar por estado"
            className="bg-white border border-[#E6E8F0] rounded-xl px-3 py-2 font-medium text-slate-700"
          >
            <option value="">Todos los Estados</option>
            <option value="ASSIGNED">Asignado (ASSIGNED)</option>
            <option value="AVAILABLE">Disponible (AVAILABLE)</option>
            <option value="MAINTENANCE">Mantenimiento</option>
            <option value="RETIRED">Retirado</option>
            <option value="LOST">Extraviado</option>
          </select>

          <select
            value={locationFilter}
            onChange={(e) => {
              setLocationFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filtrar por sede"
            className="bg-white border border-[#E6E8F0] rounded-xl px-3 py-2 font-medium text-slate-700"
          >
            <option value="">Todas las Sedes</option>
            <option value="OPM">OPM</option>
            <option value="OMEX">OMEX</option>
          </select>

          <select
            value={departmentFilter}
            onChange={(e) => {
              setDepartmentFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filtrar por departamento o site"
            className="bg-white border border-[#E6E8F0] rounded-xl px-3 py-2 font-medium text-slate-700"
          >
            <option value="">Todos los Deptos / Sites</option>
            {uniqueDepartments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Tabla con Primera Columna Fija */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#F8FAFC] border-b border-[#E6E8F0] text-[11px] uppercase tracking-wider">
              <th className="sticky left-0 z-10 bg-[#F8FAFC] py-3 pl-5 pr-4 border-r border-slate-100 shadow-[2px_0_6px_-2px_rgba(15,23,42,0.06)]">
                {renderSortHeader('Activo & Tag', 'asset_tag')}
              </th>
              {visibleCols.category && (
                <th className="py-3 px-4">{renderSortHeader('Categoría', 'category')}</th>
              )}
              {visibleCols.serial_number && (
                <th className="py-3 px-4">{renderSortHeader('Número de Serie', 'serial_number')}</th>
              )}
              {visibleCols.status && (
                <th className="py-3 px-4">{renderSortHeader('Estado', 'status')}</th>
              )}
              {visibleCols.custody && (
                <th className="py-3 px-4">{renderSortHeader('Custodia', 'assigned_to_name')}</th>
              )}
              {visibleCols.location && (
                <th className="py-3 px-4">{renderSortHeader('Sede / Área', 'location')}</th>
              )}
              {visibleCols.last_audited_at && (
                <th className="py-3 px-4">{renderSortHeader('Auditoría', 'last_audited_at')}</th>
              )}
              {renderActions && (
                <th className="py-3 pl-4 pr-5 text-right font-semibold text-slate-500">Acciones</th>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {groupedRows ? (
              groupedRows.map(([groupName, items]) => {
                const isCollapsed = !!collapsedGroups[groupName];
                return (
                  <React.Fragment key={groupName}>
                    <tr
                      onClick={() =>
                        setCollapsedGroups((prev) => ({ ...prev, [groupName]: !prev[groupName] }))
                      }
                      className="bg-[#F6F7FB] hover:bg-slate-100 cursor-pointer transition"
                    >
                      <td colSpan={8} className="py-2.5 px-5 font-bold text-slate-800">
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
                    {!isCollapsed && items.map(renderRow)}
                  </React.Fragment>
                );
              })
            ) : (
              pagedAssets.map(renderRow)
            )}

            {!loading && totalCount === 0 && (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400 italic">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer de Paginación */}
      {groupBy === 'none' && totalCount > 0 && (
        <div className="px-5 py-3 border-t border-[#E6E8F0] bg-[#FAFBFD] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>Mostrar</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              aria-label="Filas por página"
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
              {startIdx + 1}–{endIdx} de {totalCount}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Página anterior"
                className="p-1.5 rounded-lg bg-white border border-[#E6E8F0] text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                <CaretLeft weight="bold" className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
  );
};
