import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Province, Country } from '../types';

export interface LatLngGeo {
  lat: number;
  lng: number;
}

// Coordenadas geográficas reais correspondentes aos pontos do jogo
export const PROVINCE_GEO_COORDS: Record<string, LatLngGeo> = {
  // BRASIL
  'BR-SP': { lat: -23.5505, lng: -46.6333 },
  'BR-PR': { lat: -25.4284, lng: -49.2733 },
  'BR-MS': { lat: -20.4435, lng: -54.6464 },
  'BR-SC': { lat: -27.2423, lng: -50.2189 },
  'BR-RS': { lat: -30.0346, lng: -51.2177 },
  'BR-MG': { lat: -18.5122, lng: -44.5550 },
  'BR-GO': { lat: -15.8270, lng: -49.8378 }, 
  'BR-DF': { lat: -15.7801, lng: -47.9292 },
  'BR-MT': { lat: -12.6819, lng: -56.9248 },
  // PARAGUAI
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
  'PY-CEN': { lat: -25.4000, lng: -57.5000 }
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

  // Inicialização básica do mapa (apenas uma vez)
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Criar mapa centrado no coração do conflito (fronteira PR/MS/Paraguai)
    const map = L.map(containerRef.current, {
      center: [-23.5, -54.5],
      zoom: 5,
      minZoom: 4,
      maxZoom: 10,
      zoomControl: true,
      attributionControl: false
    });

    // Camada de Imagens de Satélite Reais (Esri World Imagery)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19
    }).addTo(map);

    // Camada com Rótulos de Cidades e Fronteiras para dar clareza no satélite
    L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
      opacity: 0.75,
      maxZoom: 19
    }).addTo(map);

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Atualizar camadas e elementos baseados no estado do jogo
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Remover apenas as camadas que não forem de azulejos (tiles)
    map.eachLayer((layer) => {
      if (!(layer instanceof L.TileLayer)) {
        map.removeLayer(layer);
      }
    });

    const activeProvinces = Object.values(provinces) as Province[];

    // 1. Desenhar corredores das rotas logísticas e de conexões táticas
    const drawnConnections = new Set<string>();
    activeProvinces.forEach((prov) => {
      const fromG = PROVINCE_GEO_COORDS[prov.id];
      if (!fromG) return;

      prov.connections.forEach((targetId) => {
        const targetProv = provinces[targetId];
        if (!targetProv) return;
        const toG = PROVINCE_GEO_COORDS[targetId];
        if (!toG) return;

        const key = [prov.id, targetId].sort().join('-');
        if (drawnConnections.has(key)) return;
        drawnConnections.add(key);

        // Polilinha pontilhada representando o canal de assalto / supply
        L.polyline([[fromG.lat, fromG.lng], [toG.lat, toG.lng]], {
          color: '#38bdf8',
          weight: 2,
          opacity: 0.4,
          dashArray: '4, 8'
        }).addTo(map);
      });
    });

    // 2. Desenhar as setas de ataque ativas se aplicável
    if (selectedProvinceId && targetProvinceId) {
      const parentG = PROVINCE_GEO_COORDS[selectedProvinceId];
      const targetG = PROVINCE_GEO_COORDS[targetProvinceId];
      if (parentG && targetG) {
        // Linha laranja vibrante militar conectando a origem ao alvo ativamente
        L.polyline([[parentG.lat, parentG.lng], [targetG.lat, targetG.lng]], {
          color: '#f59e0b',
          weight: 4,
          opacity: 0.9,
          dashArray: '1, 6'
        }).addTo(map);
      }
    }

    // 3. Desenhar círculos táticos e marcadores militares interativos
    activeProvinces.forEach((prov) => {
      const g = PROVINCE_GEO_COORDS[prov.id];
      if (!g) return;

      const isSelected = selectedProvinceId === prov.id;
      const isTarget = targetProvinceId === prov.id;
      const opacity = isSelected || isTarget ? 0.9 : 0.65;
      const weight = isSelected || isTarget ? 3.5 : 1.5;
      const radius = isSelected || isTarget ? 65000 : 45000; // diâmetro tático em metros

      const isOwned = prov.controller === playerCountry;
      const isBrazil = prov.controller === 'Brasil';

      // Definir cores de satélite correspondentes para facção
      let color = isBrazil ? '#10b981' : '#f59e0b';
      let fillColor = isBrazil ? '#064e3b' : '#78350f';

      if (isTarget) {
        color = '#ef4444'; // Vermelho Target para o alvo de ataque
        fillColor = '#7f1d1d';
      } else if (isSelected) {
        color = '#22c55e'; // Verde claro para selecionado
        fillColor = '#155e75'; // cyan-800 accent
      }

      const circle = L.circle([g.lat, g.lng], {
        color,
        fillColor,
        fillOpacity: isSelected || isTarget ? 0.45 : 0.25,
        opacity,
        weight,
        radius
      });

      // Tooltip informativo
      const totalArmies = prov.armies.infantry + prov.armies.artillery + prov.armies.tanks;
      const statusLabel = isOwned ? 'Aliado (Sua Linha)' : 'Fronte Oponente';
      
      const tooltipContent = `
        <div style="font-family: monospace; font-size: 11px; padding: 4px; border-radius: 4px; color: #fff;">
          <div style="font-weight: bold; font-size: 12px; margin-bottom: 2px; color: ${color};">${prov.name}</div>
          <div>País d'Origem: <strong>${prov.country}</strong></div>
          <div>Controlado por: <span style="font-weight: bold; color: ${isBrazil ? '#22c55e' : '#f59e0b'}">${prov.controller}</span> (${statusLabel})</div>
          <div style="margin-top: 4px; border-top: 1px solid #444; padding-top: 4px; color: #38bdf8">
            Poder de Fogo: <strong>${totalArmies} Divisões</strong>
          </div>
          <div style="font-size: 9px; opacity: 0.7; margin-top: 3px;">
            Clique para interagir via Painel Tático
          </div>
        </div>
      `;

      circle.bindTooltip(tooltipContent, {
        permanent: false,
        direction: 'top',
        className: 'custom-tactical-tooltip'
      });

      // Sincronizar clique
      circle.on('click', () => {
        onSelectProvince(prov.id);
      });

      circle.addTo(map);

      // Adicionar anel secundário decorativo de radar (estilo sonar militar)
      if (isSelected || isTarget) {
        L.circle([g.lat, g.lng], {
          color,
          fillColor: 'transparent',
          radius: radius * 1.5,
          weight: 1,
          opacity: 0.5,
          dashArray: '3, 6'
        }).addTo(map);
      }
    });

  }, [provinces, selectedProvinceId, targetProvinceId, playerCountry]);

  return (
    <div className="w-full h-full relative" id="leaflet_satellite_real_map">
      {/* Contêiner real do mapa Leaflet */}
      <div 
        ref={containerRef} 
        className="w-full h-full rounded-xl overflow-hidden border border-stone-800 shadow-2xl bg-stone-950"
        style={{ minHeight: '480px' }}
      />
      
      {/* HUD de Coordenadas em Tempo Real */}
      <div className="absolute bottom-4 left-4 bg-stone-900/95 border border-stone-800 rounded px-3 py-1.5 z-10 font-mono text-[9px] text-stone-400 select-none pointer-events-none shadow">
        🛰️ SAT-COM ASSINATURA: SENSOR GEOGRÁFICO DE ALTA PRECISÃO
      </div>
    </div>
  );
};
