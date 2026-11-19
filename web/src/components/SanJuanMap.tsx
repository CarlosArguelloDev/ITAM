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

  const handleZoomIn = () => setZoom((z) => Math.min(1.45, +(z + 0.15).toFixed(2)));
  const handleZoomOut = () => setZoom((z) => Math.max(0.9, +(z - 0.15).toFixed(2)));
  const handleReset = () => {
    setZoom(1);
    onSelectSite('ALL');
  };

  return (
    <div className="relative w-full h-[270px] rounded-2xl bg-[#F4F6FA] border border-[#E6E8F0] overflow-hidden select-none">
      {/* Mapa Vectorial Minimalista de San Juan del Río, Qro. */}
      <svg
        viewBox="0 0 460 300"
        className="w-full h-full transition-transform duration-300 ease-out"
        style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
        role="img"
        aria-label="Mapa minimalista de San Juan del Río mostrando las sedes OMEX y OPM"
      >
        {/* Fondo sutil y mancha urbana minimalista de San Juan del Río */}
        <rect width="460" height="300" fill="#F4F6FA" />

        {/* Zonas verdes / periferia sur */}
        <path
          d="M0 190 Q90 175 160 220 T340 245 T460 230 L460 300 L0 300 Z"
          fill="#EBF3EE"
          opacity="0.7"
        />

        {/* Mancha urbana principal de San Juan del Río */}
        <path
          d="M128 78 L195 62 L248 80 L306 108 L348 145 L335 190 L265 198 L210 182 L152 178 L118 148 Z"
          fill="#E4E8F1"
        />
        {/* Zona Industrial Oriente (OPM) */}
        <path
          d="M278 182 L365 186 L384 228 L335 248 L280 230 Z"
          fill="#E6EBF4"
        />
        {/* Zona Poniente / Loma Linda (OMEX) */}
        <path
          d="M68 128 L128 136 L142 182 L82 186 L58 156 Z"
          fill="#E6EBF4"
        />

        {/* Calles secundarias sutiles */}
        <g stroke="#FFFFFF" strokeWidth="2" fill="none" opacity="0.9">
          <path d="M135 120 L295 142" />
          <path d="M162 95 L235 168" />
          <path d="M210 112 L315 170" />
          <path d="M180 142 L340 218" />
        </g>

        {/* Carretera 120 (Norte - Sur por el centro) */}
        <path
          d="M235 0 L204 82 L192 152 L196 190"
          stroke="#CBD5E1"
          strokeWidth="4.5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M235 0 L204 82 L192 152 L196 190"
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />

        {/* Carretera 45 / Autopista México-Querétaro */}
        <path
          d="M0 78 L92 146 L124 176 L196 190 L282 224 L350 300"
          stroke="#CBD5E1"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M0 78 L92 146 L124 176 L196 190 L282 224 L350 300"
          stroke="#93C5FD"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Etiquetas minimalistas de referencia geográfica */}
        <g fontFamily="Inter, sans-serif" fill="#64748B" fontSize="9.5" fontWeight="600">
          <text x="195" y="128" textAnchor="middle" fill="#475569" fontSize="11" fontWeight="700">
            San Juan del Río
          </text>
          <text x="58" y="118" textAnchor="middle" fontSize="8.5">
            Loma Linda
          </text>
          <text x="278" y="114" textAnchor="middle" fontSize="8.5">
            El Rocío
          </text>
          <text x="312" y="162" textAnchor="middle" fontSize="8.5">
            Granjas Banthí
          </text>
          <text x="242" y="206" textAnchor="middle" fontSize="8">
            Nuevo San Juan
          </text>
          <text x="390" y="274" textAnchor="middle" fontSize="8.5">
            Paso de Mata
          </text>
        </g>

        {/* Escudos pequeños de carretera */}
        <g fontFamily="Inter, sans-serif" fontSize="7" fontWeight="700" textAnchor="middle">
          <rect x="200" y="72" width="18" height="12" rx="3" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="1" />
          <text x="209" y="80.5" fill="#475569">120</text>
          <rect x="256" y="216" width="16" height="12" rx="3" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="1" />
          <text x="264" y="224.5" fill="#475569">45</text>
        </g>

        {/* PIN 1: OMEX (Optibelt de México) */}
        <g
          className="cursor-pointer group"
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
            cx="114"
            cy="170"
            r={selectedSite === 'OMEX' ? 18 : 13}
            fill="#5B4FE9"
            opacity="0.16"
            className="transition-all duration-200"
          />
          <circle
            cx="114"
            cy="170"
            r="7"
            fill={selectedSite === 'OMEX' ? '#4338CA' : '#5B4FE9'}
            stroke="#FFFFFF"
            strokeWidth="2.5"
          />
          <g transform="translate(125, 152)">
            <rect
              x="0"
              y="0"
              width="98"
              height="32"
              rx="8"
              fill="#FFFFFF"
              stroke={selectedSite === 'OMEX' ? '#5B4FE9' : '#E2E8F0'}
              strokeWidth={selectedSite === 'OMEX' ? '1.8' : '1'}
            />
            <text x="8" y="13" fontSize="9.5" fontWeight="800" fill="#1E293B">
              OMEX
            </text>
            <text x="8" y="24" fontSize="8" fontWeight="600" fill="#64748B">
              {omexCount} activos
            </text>
          </g>
        </g>

        {/* PIN 2: OPM (Optibelt Production Mexico) */}
        <g
          className="cursor-pointer group"
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
            cx="326"
            cy="218"
            r={selectedSite === 'OPM' ? 20 : 14}
            fill="#0284C7"
            opacity="0.18"
            className="transition-all duration-200"
          />
          <circle
            cx="326"
            cy="218"
            r="7.5"
            fill={selectedSite === 'OPM' ? '#0369A1' : '#0284C7'}
            stroke="#FFFFFF"
            strokeWidth="2.5"
          />
          <g transform="translate(337, 198)">
            <rect
              x="0"
              y="0"
              width="98"
              height="32"
              rx="8"
              fill="#FFFFFF"
              stroke={selectedSite === 'OPM' ? '#0284C7' : '#E2E8F0'}
              strokeWidth={selectedSite === 'OPM' ? '1.8' : '1'}
            />
            <text x="8" y="13" fontSize="9.5" fontWeight="800" fill="#1E293B">
              OPM
            </text>
            <text x="8" y="24" fontSize="8" fontWeight="600" fill="#64748B">
              {opmCount} activos
            </text>
          </g>
        </g>
      </svg>

      {/* Controles de Zoom estilo ZoBox */}
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
