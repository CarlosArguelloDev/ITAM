import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Plus, Minus, ArrowCounterClockwise } from '@phosphor-icons/react';

interface SanJuanMapProps {
  opmCount: number;
  omexCount: number;
  selectedSite: 'ALL' | 'OPM' | 'OMEX';
  onSelectSite: (site: 'ALL' | 'OPM' | 'OMEX') => void;
}

const OMEX_COORDS: [number, number] = [20.38155724476992, -100.0136474587008];
const OPM_COORDS: [number, number] = [20.365194929781495, -99.94332076358829];

export const SanJuanMap: React.FC<SanJuanMapProps> = ({
  opmCount,
  omexCount,
  selectedSite,
  onSelectSite,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const omexMarkerRef = useRef<L.Marker | null>(null);
  const opmMarkerRef = useRef<L.Marker | null>(null);

  const createMarkerIcon = (label: string, count: number, color: string, active: boolean) =>
    L.divIcon({
      className: 'custom-opti-marker',
      html: `
        <div style="display:flex;align-items:center;gap:6px;transform:translate(-10px,-50%);cursor:pointer;">
          <span style="
            width:${active ? 16 : 13}px;
            height:${active ? 16 : 13}px;
            border-radius:9999px;
            background:${color};
            border:2.5px solid #ffffff;
            box-shadow:0 0 0 ${active ? 6 : 4}px ${color}33, 0 2px 6px rgba(15,23,42,0.22);
            display:inline-block;
            flex-shrink:0;
          "></span>
          <div style="
            background:#ffffff;
            border:${active ? `2px solid ${color}` : '1px solid #CBD5E1'};
            border-radius:10px;
            padding:3px 8px;
            box-shadow:0 2px 8px rgba(15,23,42,0.10);
            white-space:nowrap;
            font-family:Inter,sans-serif;
          ">
            <div style="font-size:10px;font-weight:800;color:#0F172A;line-height:1.15;">${label}</div>
            <div style="font-size:9px;font-weight:600;color:#64748B;line-height:1.15;">${count} activos</div>
          </div>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
    });

    // Mapa real de OpenStreetMap con estilo minimalista claro (sin API key)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    const omexMarker = L.marker(OMEX_COORDS, {
      icon: createMarkerIcon('OMEX', omexCount, '#5B4FE9', selectedSite === 'OMEX'),
    }).addTo(map);
    omexMarker.on('click', () => {
      onSelectSite(selectedSite === 'OMEX' ? 'ALL' : 'OMEX');
    });

    const opmMarker = L.marker(OPM_COORDS, {
      icon: createMarkerIcon('OPM', opmCount, '#0284C7', selectedSite === 'OPM'),
    }).addTo(map);
    opmMarker.on('click', () => {
      onSelectSite(selectedSite === 'OPM' ? 'ALL' : 'OPM');
    });

    map.fitBounds([OMEX_COORDS, OPM_COORDS], { padding: [55, 65] });

    mapRef.current = map;
    omexMarkerRef.current = omexMarker;
    opmMarkerRef.current = opmMarker;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Actualizar iconos y enfoque cuando cambien conteos o selección
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    omexMarkerRef.current?.setIcon(
      createMarkerIcon('OMEX', omexCount, '#5B4FE9', selectedSite === 'OMEX')
    );
    opmMarkerRef.current?.setIcon(
      createMarkerIcon('OPM', opmCount, '#0284C7', selectedSite === 'OPM')
    );

    if (selectedSite === 'OMEX') {
      map.flyTo(OMEX_COORDS, 15, { duration: 0.6 });
    } else if (selectedSite === 'OPM') {
      map.flyTo(OPM_COORDS, 15, { duration: 0.6 });
    } else {
      map.fitBounds([OMEX_COORDS, OPM_COORDS], { padding: [55, 65] });
    }
  }, [opmCount, omexCount, selectedSite]);

  return (
    <div className="relative w-full h-[290px] rounded-2xl bg-[#F4F6FA] border border-[#E6E8F0] overflow-hidden opti-minimal-map">
      <div
        ref={containerRef}
        className="w-full h-full z-0"
        aria-label="Mapa real minimalista de San Juan del Río con ubicaciones OMEX y OPM"
      />

      {/* Controles de Zoom */}
      <div className="absolute left-3 bottom-3 z-[400] flex flex-col bg-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => mapRef.current?.zoomIn()}
          aria-label="Acercar mapa"
          className="p-1.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-b border-slate-100 transition"
        >
          <Plus weight="bold" className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => mapRef.current?.zoomOut()}
          aria-label="Alejar mapa"
          className="p-1.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-b border-slate-100 transition"
        >
          <Minus weight="bold" className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => {
            onSelectSite('ALL');
            mapRef.current?.fitBounds([OMEX_COORDS, OPM_COORDS], { padding: [55, 65] });
          }}
          aria-label="Ver ambas sedes"
          className="p-1.5 text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition"
        >
          <ArrowCounterClockwise weight="bold" className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
