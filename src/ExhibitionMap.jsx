import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// 展場座標
const VENUES = [
  {
    id: 'A',
    name: '展場A',
    name_full: '客家文化園區\n1/F 驛站走廊',
    lat: 25.02765,
    lng: 121.55885,
    color: '#1C3D78',
  },
  {
    id: 'B',
    name: '展場B',
    name_full: '永春街299號外',
    lat: 25.02415,
    lng: 121.56820,
    color: '#E8873A',
  },
];

// 建立藍圖風格的 SVG 圖標
function createBpIcon(label, color) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
      <rect x="1" y="1" width="34" height="34" rx="4"
        fill="${color}" stroke="#C5BFAA" stroke-width="1.5"/>
      <line x1="1" y1="10" x2="35" y2="10" stroke="#C5BFAA" stroke-width="0.5" opacity="0.3"/>
      <line x1="10" y1="1" x2="10" y2="35" stroke="#C5BFAA" stroke-width="0.5" opacity="0.3"/>
      <text x="18" y="22" text-anchor="middle" dominant-baseline="middle"
        font-family="Space Mono, monospace" font-size="13" font-weight="700"
        fill="#D4CFBC">${label}</text>
      <polygon points="14,35 22,35 18,43" fill="${color}"/>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [36, 44],
    iconAnchor: [18, 43],
    popupAnchor: [0, -44],
  });
}

export default function ExhibitionMap() {
  const containerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (mapRef.current) return; // 防止重複初始化

    // Blueprint 風格的地圖 tile（灰階 CartoDB）
    const map = L.map(containerRef.current, {
      center: [25.026, 121.563],
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
    });
    mapRef.current = map;

    // CartoDB Positron — 接近灰白底圖，適合藍圖配色覆蓋
    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      { subdomains: 'abcd', maxZoom: 19 }
    ).addTo(map);

    // 小字 attribution
    L.control.attribution({ prefix: false })
      .addAttribution('© <a href="https://osm.org/copyright">OpenStreetMap</a>')
      .addTo(map);

    // 標記 + Popup
    VENUES.forEach((v) => {
      const marker = L.marker([v.lat, v.lng], {
        icon: createBpIcon(v.id, v.color),
      }).addTo(map);

      marker.bindPopup(
        `<div style="font-family:'Space Mono',monospace;font-size:11px;line-height:1.5;color:#1C3D78">
          <strong style="font-size:12px">展場${v.id}</strong><br/>
          <span style="white-space:pre-line;opacity:0.75">${v.name_full}</span>
        </div>`,
        { className: 'bp-popup', maxWidth: 160 }
      );
    });

    // 連線兩展場
    L.polyline(
      VENUES.map((v) => [v.lat, v.lng]),
      {
        color: '#2B5399',
        weight: 1.5,
        dashArray: '6 5',
        opacity: 0.5,
      }
    ).addTo(map);

    // 縮放到包含兩點的範圍
    const bounds = L.latLngBounds(VENUES.map((v) => [v.lat, v.lng]));
    map.fitBounds(bounds, { padding: [40, 40] });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div className="card-bp rounded-xl overflow-hidden">
      {/* 標題列 */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-[#1C3D78]/15">
        <div>
          <p className="text-[9px] font-mono uppercase tracking-[0.25em] text-[#1C3D78]/50">// VENUE_MAP</p>
          <p className="text-xs font-mono font-bold text-[#1C3D78]">展場位置 — TAIPEI CITY</p>
        </div>
        <div className="flex gap-3 text-[9px] font-mono">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: '#1C3D78' }} />
            <span className="text-[#1C3D78]/60">展場A</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: '#E8873A' }} />
            <span className="text-[#1C3D78]/60">展場B</span>
          </span>
        </div>
      </div>

      {/* 地圖本體（藍圖底色濾鏡） */}
      <div className="relative" style={{ height: '220px' }}>
        <div ref={containerRef} style={{ width: '100%', height: '100%', filter: 'sepia(0.3) hue-rotate(180deg) saturate(0.6) brightness(0.92)' }} />
        {/* 邊框覆蓋層（角落十字） */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'linear-gradient(to bottom, rgba(197,191,170,0.15) 0%, transparent 20%, transparent 80%, rgba(197,191,170,0.15) 100%)'
        }} />
      </div>

      {/* 底部地址列表 */}
      <div className="grid grid-cols-2 divide-x divide-[#1C3D78]/10">
        <div className="px-3 py-2.5">
          <p className="text-[9px] font-mono uppercase tracking-widest text-[#1C3D78]/40 mb-0.5">展場A</p>
          <p className="text-[10px] font-mono text-[#1C3D78] leading-snug">客家文化園區<br/>1/F 驛站走廊</p>
        </div>
        <div className="px-3 py-2.5">
          <p className="text-[9px] font-mono uppercase tracking-widest text-[#E8873A]/60 mb-0.5">展場B</p>
          <p className="text-[10px] font-mono text-[#1C3D78] leading-snug">永春街299號外<br/>實地聚落現場</p>
        </div>
      </div>
    </div>
  );
}
