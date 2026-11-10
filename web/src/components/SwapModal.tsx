import React, { useState } from 'react';
import { X, ArrowLeftRight, AlertCircle, Laptop, CheckCircle2 } from 'lucide-react';
import { User, Asset } from '../types';
import { api } from '../api';

interface SwapModalProps {
  user: User;
  userAssets: Asset[];
  availableAssets: Asset[];
  onClose: () => void;
  onSuccess: () => void;
}

export const SwapModal: React.FC<SwapModalProps> = ({
  user,
  userAssets,
  availableAssets,
  onClose,
  onSuccess,
}) => {
  const [oldAssetId, setOldAssetId] = useState<string>(
    userAssets.find((a) => a.category === 'LAPTOP')?.id || userAssets[0]?.id || ''
  );
  const [newAssetId, setNewAssetId] = useState<string>(availableAssets[0]?.id || '');
  const [oldAssetNextStatus, setOldAssetNextStatus] = useState<string>('MAINTENANCE');
  const [moveChildren, setMoveChildren] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');

  const [swapping, setSwapping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldAssetId || !newAssetId) {
      setError('Debes seleccionar el equipo actual a retirar y el equipo nuevo a entregar.');
      return;
    }

    try {
      setSwapping(true);
      setError(null);

      await api.swapAsset({
        user_id: user.id,
        old_asset_id: oldAssetId,
        new_asset_id: newAssetId,
        old_asset_next_status: oldAssetNextStatus,
        move_children_to_new_asset: moveChildren,
        notes: notes || 'Cambio preventivo / ciclo de renovación tecnológica',
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al ejecutar el Swap de equipo');
    } finally {
      setSwapping(false);
    }
  };

  const oldAssetObj = userAssets.find((a) => a.id === oldAssetId);
  const newAssetObj = availableAssets.find((a) => a.id === newAssetId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden my-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Cambio de Equipo (Swap Atómico)
              </h3>
              <p className="text-xs text-slate-500">
                Colaborador: <strong>{user.full_name}</strong> ({user.employee_code})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSwap} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Comparativa Visual del Reemplazo */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            {/* Equipo a Retirar */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-red-600 tracking-wider">
                1. Equipo a Retirar
              </span>
              <select
                value={oldAssetId}
                onChange={(e) => setOldAssetId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-800"
              >
                {userAssets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.asset_tag} - {a.model} ({a.category})
                  </option>
                ))}
              </select>
              {oldAssetObj && (
                <div className="text-[11px] text-slate-500 bg-white p-2 rounded border border-slate-200">
                  <p className="font-mono text-slate-700">S/N: {oldAssetObj.serial_number}</p>
                  <p className="text-slate-400">Estado actual: {oldAssetObj.status}</p>
                </div>
              )}
            </div>

            {/* Equipo Nuevo de Reemplazo */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-emerald-600 tracking-wider">
                2. Equipo Nuevo de Stock
              </span>
              <select
                value={newAssetId}
                onChange={(e) => setNewAssetId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-800"
              >
                {availableAssets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.asset_tag} - {a.model} ({a.category})
                  </option>
                ))}
              </select>
              {newAssetObj && (
                <div className="text-[11px] text-slate-500 bg-white p-2 rounded border border-slate-200">
                  <p className="font-mono text-slate-700">S/N: {newAssetObj.serial_number}</p>
                  <p className="text-slate-400">Ubicación: {newAssetObj.location}</p>
                </div>
              )}
            </div>
          </div>

          {/* Destino del Equipo Retirado */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Destino / Próximo Estado del Equipo Retirado:
            </label>
            <select
              value={oldAssetNextStatus}
              onChange={(e) => setOldAssetNextStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-slate-800"
            >
              <option value="MAINTENANCE">MAINTENANCE (Enviar a taller para revisión)</option>
              <option value="AVAILABLE">AVAILABLE (Retornar directamente a stock disponible)</option>
              <option value="RETIRED">RETIRED (Dar de baja definitiva por obsolescencia)</option>
            </select>
          </div>

          {/* Checkbox migrar hijos */}
          <div className="p-3 bg-sky-50/60 rounded-xl border border-sky-100 flex items-start gap-2.5">
            <input
              type="checkbox"
              id="moveChildren"
              checked={moveChildren}
              onChange={(e) => setMoveChildren(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
            />
            <label htmlFor="moveChildren" className="text-xs text-sky-950 font-medium cursor-pointer">
              <strong>Vincular periféricos asociados automáticamente:</strong> Reasignar docks,
              monitores y teclados vinculados a la nueva laptop en una sola transacción SQL.
            </label>
          </div>

          {/* Motivo o Notas */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Motivo del Swap / Observaciones para la Responsiva:
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Renovación de hardware por término de ciclo de 3 años."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800"
            />
          </div>

          {/* Footer Submit */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              Generará carta responsiva en estado PENDING
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="text-slate-700 bg-slate-100 hover:bg-slate-200 font-semibold px-4 py-2 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={swapping || availableAssets.length === 0}
                className="bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-sm"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span>{swapping ? 'Procesando Swap...' : 'Confirmar Swap'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
