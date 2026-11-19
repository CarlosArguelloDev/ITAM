import React, { useState } from 'react';
import { Plus, Minus, RotateCcw } from 'lucide-react';

interface SanJuanMapProps {
  opmCount: number;
  omexCount: number;
  selectedSite: 'ALL' | 'OPM' | 'OMEX';
  onSelectSite: (site: 'ALL' | 'OPM' | 'OMEX') => void;
}

export const SanJuanMap: React.FC<SanJuanMapProps> = ({
  opmCount,
  omexCount,
  selectedSite,
  onSelectSite,
}) => {
  const [zoom, setZoom] = useState(1);

  const handleZoomIn = () => setZoom((z) => Math.min(1.5, +(z + 0.15).toFixed(2)));
  const handleZoomOut = () => setZoom((z) => Math.max(0.9, +(z - 0.15).toFixed(2)));
  const handleReset = () => {
    setZoom(1);
    onSelectSite('ALL');
  };

  return (
    <div className="relative w-full h-[290px] rounded-2xl bg-[#F8FAFC] border border-[#E6E8F0] overflow-hidden select-none">
      <svg
        viewBox="0 0 460 360"
        className="w-full h-full transition-transform duration-300 ease-out"
        style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
        role="img"
        aria-label="Silueta municipal de San Juan del Río, Querétaro con las ubicaciones de OMEX y OPM"
      >
        <rect width="460" height="360" fill="#F8FAFC" />

        {/* Silueta exacta del municipio de San Juan del Río, Qro. */}
        <path
          d="M206 10 L232 20 L226 32 L254 44 L250 62 L274 78 L254 90 L282 82 L306 104 L334 94 L334 80 L414 72 L404 134 L394 186 L382 232 L360 238 L340 258 L314 252 L320 288 L314 344 L290 346 L290 314 L268 306 L212 308 L180 282 L176 248 L152 236 L150 214 L126 214 L104 198 L64 196 L38 174 L68 140 L94 136 L108 110 L136 98 L150 82 L194 64 L194 48 L174 42 L174 18 Z"
          fill="#E6E9F0"
          stroke="#CBD5E1"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Mancha urbana central de San Juan del Río */}
        <path
          d="M214 146 L252 136 L294 148 L302 174 L264 186 L220 176 Z"
          fill="#DDE2EC"
        />

        {/* Río San Juan / Cuerpos de agua sutiles */}
        <path
          d="M206 58 L224 72 L246 88 L250 124 L244 166 L256 232"
          stroke="#BFDBFE"
          strokeWidth="2"
          fill="none"
          opacity="0.85"
        />

        {/* Carretera 120 (Norte-Sur y Ramal Este hacia Cerro Gordo / Oeste hacia Galindo) */}
        <path
          d="M284 82 L264 128 L256 158 L222 166 L152 148 L104 156"
          stroke="#FDE68A"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M256 158 L338 170 L398 176"
          stroke="#FDE68A"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Autopista 57 / Carretera 45 (México - Querétaro) */}
        <path
          d="M142 96 L186 130 L222 166 L272 198 L308 226 L340 284"
          stroke="#FFFFFF"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M142 96 L186 130 L222 166 L272 198 L308 226 L340 284"
          stroke="#F59E0B"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="0.75"
        />

        {/* Libramiento / Ramal Sur */}
        <path
          d="M222 166 L214 190 L262 194 L308 226"
          stroke="#FFFFFF"
          strokeWidth="2.5"
          fill="none"
        />

        {/* Referencias minimalistas */}
        <g fontFamily="Inter, sans-serif" fill="#64748B" fontSize="8.5" fontWeight="600">
          <text x="260" y="148" textAnchor="middle" fill="#334155" fontSize="10" fontWeight="700">
            San Juan del Río
          </text>
          <text x="220" y="42" textAnchor="middle" fontSize="8">
            La Valla
          </text>
          <text x="172" y="122" textAnchor="middle" fontSize="7.5">
            La Estancia
          </text>
          <text x="352" y="164" textAnchor="middle" fontSize="7.5">
            Cerro Gordo
          </text>
          <text x="326" y="220" textAnchor="middle" fontSize="7.5">
            Palmillas
          </text>
        </g>

        {/* PIN 1: OMEX (Optibelt de México — Casa Blanca / Carr. 45-57) */}
        <g
          className="cursor-pointer"
          onClick={() => onSelectSite(selectedSite === 'OMEX' ? 'ALL' : 'OMEX')}
          role="button"
          tabIndex={0}
          aria-label={`Sede OMEX, ${omexCount} activos`}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectSite(selectedSite === 'OMEX' ? 'ALL' : 'OMEX');
            }
          }}
        >
          <circle
            cx="218"
            cy="165"
            r={selectedSite === 'OMEX' ? 17 : 12}
            fill="#5B4FE9"
            opacity="0.18"
            className="transition-all duration-200"
          />
          <circle
            cx="218"
            cy="165"
            r="6.5"
            fill={selectedSite === 'OMEX' ? '#4338CA' : '#5B4FE9'}
            stroke="#FFFFFF"
            strokeWidth="2.2"
          />
          <g transform="translate(118, 174)">
            <rect
              x="0"
              y="0"
              width="92"
              height="30"
              rx="8"
              fill="#FFFFFF"
              stroke={selectedSite === 'OMEX' ? '#5B4FE9' : '#CBD5E1'}
              strokeWidth={selectedSite === 'OMEX' ? '1.8' : '1'}
            />
            <text x="8" y="13" fontSize="9.5" fontWeight="800" fill="#1E293B">
              OMEX
            </text>
            <text x="8" y="23.5" fontSize="8" fontWeight="600" fill="#64748B">
              {omexCount} activos
            </text>
          </g>
        </g>

        {/* PIN 2: OPM (Optibelt Production Mexico — Zona Industrial Oriente) */}
        <g
          className="cursor-pointer"
          onClick={() => onSelectSite(selectedSite === 'OPM' ? 'ALL' : 'OPM')}
          role="button"
          tabIndex={0}
          aria-label={`Sede OPM, ${opmCount} activos`}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectSite(selectedSite === 'OPM' ? 'ALL' : 'OPM');
            }
          }}
        >
          <circle
            cx="296"
            cy="184"
            r={selectedSite === 'OPM' ? 18 : 13}
            fill="#0284C7"
            opacity="0.2"
            className="transition-all duration-200"
          />
          <circle
            cx="296"
            cy="184"
            r="7"
            fill={selectedSite === 'OPM' ? '#0369A1' : '#0284C7'}
            stroke="#FFFFFF"
            strokeWidth="2.2"
          />
          <g transform="translate(306, 178)">
            <rect
              x="0"
              y="0"
              width="92"
              height="30"
              rx="8"
              fill="#FFFFFF"
              stroke={selectedSite === 'OPM' ? '#0284C7' : '#CBD5E1'}
              strokeWidth={selectedSite === 'OPM' ? '1.8' : '1'}
            />
            <text x="8" y="13" fontSize="9.5" fontWeight="800" fill="#1E293B">
              OPM
            </text>
            <text x="8" y="23.5" fontSize="8" fontWeight="600" fill="#64748B">
              {opmCount} activos
            </text>
          </g>
        </g>
      </svg>

      {/* Controles de Zoom */}
      <div className="absolute left-3 bottom-3 flex flex-col bg-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={handleZoomIn}
          aria-label="Acercar mapa"
          className="p-1.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-b border-slate-100 transition"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          aria-label="Alejar mapa"
          className="p-1.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-b border-slate-100 transition"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={handleReset}
          aria-label="Restablecer vista del mapa"
          className="p-1.5 text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
