import React, { useState, useEffect } from 'react';
import { Plus, Barcode, PencilSimple, Trash, ArrowsClockwise } from '@phosphor-icons/react';
import { Asset, User } from '../types';
import { api } from '../api';
import { AssetFormModal } from '../components/AssetFormModal';
import { BarcodeStickerModal } from '../components/BarcodeStickerModal';
import { AssetDataTable } from '../components/AssetDataTable';

export const AssetsView: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [assetToEdit, setAssetToEdit] = useState<Asset | null>(null);
  const [barcodeModalAsset, setBarcodeModalAsset] = useState<Asset | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [allAssets, allUsers] = await Promise.all([api.getAssets(), api.getUsers()]);
      setAssets(allAssets);
      setUsers(allUsers);
    } catch (err) {
      console.error('Error cargando activos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, tag: string) => {
    if (!window.confirm(`¿Seguro que deseas eliminar o dar de baja el activo ${tag}?`)) {
      return;
    }
    try {
      await api.deleteAsset(id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar activo');
    }
  };

  const laptops = assets.filter((a) => a.category === 'LAPTOP');

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      <AssetDataTable
        title="Inventario General de Activos"
        assets={assets}
        loading={loading}
        headerActions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadData}
              aria-label="Recargar inventario"
              title="Recargar inventario"
              className="p-2 rounded-xl bg-white border border-[#E6E8F0] text-slate-600 hover:bg-slate-50 transition"
            >
              <ArrowsClockwise className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => {
                setAssetToEdit(null);
                setFormOpen(true);
              }}
              className="inline-flex items-center gap-1.5 bg-[#5B4FE9] hover:bg-[#4B3FD8] text-white font-semibold text-xs px-3.5 py-2 rounded-xl shadow-xs transition active:scale-[0.98]"
            >
              <Plus weight="bold" className="w-3.5 h-3.5" />
              <span>Nuevo Activo</span>
            </button>
          </div>
        }
        renderActions={(a) => (
          <>
            <button
              type="button"
              onClick={() => setBarcodeModalAsset(a)}
              aria-label={`Código de barras de ${a.asset_tag}`}
              className="p-1.5 text-slate-500 hover:text-[#5B4FE9] hover:bg-[#F3F2FF] rounded-lg transition"
              title="Imprimir Código de Barras"
            >
              <Barcode weight="duotone" className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setAssetToEdit(a);
                setFormOpen(true);
              }}
              aria-label={`Editar ${a.asset_tag}`}
              className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition"
              title="Editar Activo"
            >
              <PencilSimple weight="duotone" className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(a.id, a.asset_tag)}
              aria-label={`Eliminar ${a.asset_tag}`}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
              title="Baja o Eliminación"
            >
              <Trash weight="duotone" className="w-4 h-4" />
            </button>
          </>
        )}
      />

      {formOpen && (
        <AssetFormModal
          assetToEdit={assetToEdit}
          users={users}
          availableLaptops={laptops}
          onClose={() => setFormOpen(false)}
          onSuccess={loadData}
        />
      )}

      {barcodeModalAsset && (
        <BarcodeStickerModal asset={barcodeModalAsset} onClose={() => setBarcodeModalAsset(null)} />
      )}
    </div>
  );
};
