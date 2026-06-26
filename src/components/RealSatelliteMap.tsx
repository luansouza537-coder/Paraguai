import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Province, Country } from '../types';

export interface LatLngGeo {
  lat: number;
  lng: number;
}

export const PROVINCE_GEO_COORDS: Record<string, LatLngGeo> = {
  'BR-SP': { lat: -23.5505, lng: -46.6333 },
  'BR-PR': { lat: -25.4284, lng: -49.2733 },
  'BR-MS': { lat: -20.4435, lng: -54.6464 },
  'BR-SC': { lat: -27.2423, lng: -50.2189 },
  'BR-RS': { lat: -30.0346, lng: -51.2177 },
  'BR-MG': { lat: -18.5122, lng: -44.5550 },
  'BR-GO': { lat: -15.8270, lng: -49.8378 },
  'BR-DF': { lat: -15.7801, lng: -47.9292 },
  'BR-MT': { lat: -12.6819, lng: -56.9248 },
  'PY-ASU': { lat: -25.2637, lng: -57.5759 },
  'PY-PHY': { lat: -23.5000, lng: -58.5000 },
  'PY-ALR': { lat: -25.5000, lng: -54.6333 },
  'PY-AMA': { lat: -22.5667, lng: -55.7167 },
  'PY-CON': { lat: -23.4000, lng: -57.3000 },
  'PY-CAN': { lat: -24.0600, lng: -54.3000 },
  'PY-BOQ': { lat: -21.8000, lng: -60.8000 },
  'PY-APY': { lat: -20.0000, lng: -58.8000 },
  'PY-SAP': { lat: -24.1000, lng: -56.6000 },
  'PY-CAA': { lat: -25.3000, lng: -56.2000 },
  'PY-ITA': { lat: -27.3300, lng: -55.8500 },
  'PY-MIS': { lat: -26.6333, lng: -57.1500 },
  'PY-NEE': { lat: -26.8667, lng: -57.9000 },
  'PY-CEN': { lat: -25.4000, lng: -57.5000 },
};

type MapStyle = 'dark' | 'voy' | 'light' | 'sat' | 'topo';

const MAP_STYLES: Record<MapStyle, { label: string; short: string; url: string; extra?: string }> = {
  dark: {
    label: 'CartoDB Dark Matter',
    short: 'ESC',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  },
  voy: {
    label: 'CartoDB Voyager',
    short: 'VOY',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  },
  light: {
    label: 'CartoDB Positron',
    short: 'CLA',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  },
  sat: {
    label: 'Esri World Imagery',
    short: 'SAT',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    extra: 'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
  },
  topo: {
    label: 'OpenTopoMap',
    short: 'REL',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
  },
};

interface RealSatelliteMapProps {
  provinces: Record<string, Province>;
  selectedProvinceId: string | null;
  targetProvinceId: string | null;
  playerCountry: Country;
  onSelectProvince: (id: string) => void;
}

export const RealSatelliteMap: React.FC<RealSatelliteMapProps> = ({
  provinces,
  selectedProvinceId,
  targetProvinceId,
  playerCountry,
  onSelectProvince,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayersRef = useRef<L.TileLayer[]>([]);
  const [activeStyle, setActiveStyle] = useState<MapStyle>('dark');

  // Inicializa o mapa uma única vez
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [-23.5, -56.0],
      zoom: 5,
      minZoom: 4,
      maxZoom: 12,
      zoomControl: true,
      attributionControl: false,
    });

    mapRef.current = map;

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Troca o tile layer quando o estilo muda
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Remove tile layers anteriores
    tileLayersRef.current.forEach(l => map.removeLayer(l));
    tileLayersRef.current = [];

    const style = MAP_STYLES[activeStyle];
    const main = L.tileLayer(style.url, { maxZoom: 19 });
    main.addTo(map);
    tileLayersRef.current.push(main);

    if (style.extra) {
      const extra = L.tileLayer(style.extra, { maxZoom: 19, opacity: 0.75 });
      extra.addTo(map);
      tileLayersRef.current.push(extra);
    }
  }, [activeStyle]);

  // Atualiza marcadores/conexões quando o estado do jogo muda
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Remove apenas camadas não-tile
    map.eachLayer(layer => {
      if (!(layer instanceof L.TileLayer)) map.removeLayer(layer);
    });

    const activeProvinces = Object.values(provinces) as Province[];

    // Conexões logísticas
    const drawn = new Set<string>();
    activeProvinces.forEach(prov => {
      const from = PROVINCE_GEO_COORDS[prov.id];
      if (!from) return;
      prov.connections.forEach(targetId => {
        const to = PROVINCE_GEO_COORDS[targetId];
        if (!to) return;
        const key = [prov.id, targetId].sort().join('-');
        if (drawn.has(key)) return;
        drawn.add(key);
        L.polyline([[from.lat, from.lng], [to.lat, to.lng]], {
          color: '#38bdf8',
          weight: 1.5,
          opacity: 0.3,
          dashArray: '4, 8',
        }).addTo(map);
      });
    });

    // Linha de ataque ativa
    if (selectedProvinceId && targetProvinceId) {
      const from = PROVINCE_GEO_COORDS[selectedProvinceId];
      const to = PROVINCE_GEO_COORDS[targetProvinceId];
      if (from && to) {
        L.polyline([[from.lat, from.lng], [to.lat, to.lng]], {
          color: '#f59e0b',
          weight: 4,
          opacity: 0.9,
          dashArray: '1, 6',
        }).addTo(map);
      }
    }

    // Marcadores de províncias
    activeProvinces.forEach(prov => {
      const g = PROVINCE_GEO_COORDS[prov.id];
      if (!g) return;

      const isSelected = selectedProvinceId === prov.id;
      const isTarget = targetProvinceId === prov.id;
      const isBrazil = prov.controller === 'Brasil';
      const isOwned = prov.controller === playerCountry;

      let color = isBrazil ? '#10b981' : '#f59e0b';
      let fillColor = isBrazil ? '#064e3b' : '#78350f';
      if (isTarget)   { color = '#ef4444'; fillColor = '#7f1d1d'; }
      if (isSelected) { color = '#22c55e'; fillColor = '#155e75'; }

      const radius = isSelected || isTarget ? 65000 : 45000;

      const circle = L.circle([g.lat, g.lng], {
        color,
        fillColor,
        fillOpacity: isSelected || isTarget ? 0.45 : 0.25,
        opacity: isSelected || isTarget ? 0.9 : 0.65,
        weight: isSelected || isTarget ? 3.5 : 1.5,
        radius,
      });

      const totalArmies = prov.armies.infantry + prov.armies.artillery + prov.armies.tanks;
      const terrainLabel =
        prov.terrain === 'jungle' ? '🌿 Selva' :
        prov.terrain === 'chaco'  ? '🏜️ Chaco' :
        prov.terrain === 'urban'  ? '🏙️ Urbano' : '🌾 Planície';
      const extras = `${prov.hasRiver ? ' 🌊' : ''}${prov.onAquifer ? ' 💧' : ''}`;

      circle.bindTooltip(`
        <div style="font-family:monospace;font-size:11px;padding:4px;color:#fff;">
          <div style="font-weight:bold;font-size:12px;margin-bottom:2px;color:${color};">${prov.name}</div>
          <div>Controlado: <span style="color:${isBrazil ? '#22c55e' : '#f59e0b'};font-weight:bold">${prov.controller}</span> ${isOwned ? '(Aliado)' : '(Inimigo)'}</div>
          <div style="color:#a3a3a3;font-size:10px;margin-top:2px;">${terrainLabel}${extras}</div>
          <div style="margin-top:4px;border-top:1px solid #444;padding-top:4px;color:#38bdf8;">
            ⚔️ <strong>${totalArmies} Divisões</strong>
          </div>
          <div style="font-size:9px;opacity:0.6;margin-top:2px;">Clique para gerenciar</div>
        </div>
      `, { permanent: false, direction: 'top', className: 'custom-tactical-tooltip' });

      circle.on('click', () => onSelectProvince(prov.id));
      circle.addTo(map);

      if (isSelected || isTarget) {
        L.circle([g.lat, g.lng], {
          color,
          fillColor: 'transparent',
          radius: radius * 1.5,
          weight: 1,
          opacity: 0.4,
          dashArray: '3, 6',
        }).addTo(map);
      }
    });
  }, [provinces, selectedProvinceId, targetProvinceId, playerCountry]);

  return (
    <div className="w-full h-full relative" id="strategic_map">
      {/* Seletor de estilo */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-1">
        {(Object.entries(MAP_STYLES) as [MapStyle, typeof MAP_STYLES[MapStyle]][]).map(([key, s]) => (
          <button
            key={key}
            onClick={() => setActiveStyle(key)}
            title={s.label}
            className={`w-10 h-8 rounded text-[10px] font-black font-mono border transition cursor-pointer
              ${activeStyle === key
                ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-lg'
                : 'bg-stone-900/90 text-stone-300 border-stone-700 hover:border-amber-500 hover:text-amber-400'
              }`}
          >
            {s.short}
          </button>
        ))}
      </div>

      {/* Contêiner Leaflet */}
      <div
        ref={containerRef}
        className="w-full h-full rounded-xl overflow-hidden border border-stone-800 shadow-2xl bg-stone-950"
        style={{ minHeight: '480px' }}
      />

      {/* HUD inferior */}
      <div className="absolute bottom-3 left-3 bg-stone-900/90 border border-stone-800 rounded px-2.5 py-1 z-[1000] font-mono text-[9px] text-stone-400 select-none pointer-events-none">
        🛰️ {MAP_STYLES[activeStyle].label}
      </div>
    </div>
  );
};
