// Leaflet CSS 必須靜態 import，否則地圖容器無法渲染
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';
import L from 'leaflet';

// 展場座標
const VENUES = [
  {
    id: 'A',
    label: '展場A',
    desc: '客家文化園區 1/F 驛站走廊',
    lat: 25.02765,
    lng: 121.55885,
    color: '#1C3D78',
  },
  {
    id: 'B',
    label: '展場B',
    desc: '永春街299號外',
    lat: 25.02415,
    lng: 121.56820,
    color: '#E8873A',
  },
];

function makeIcon(id, color) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="34" height="42" viewBox="0 0 34 42">
      <rect x="1" y="1" width="32" height="32" rx="4"
        fill="${color}" stroke="white" stroke-width="2"/>
      <line x1="1"  y1="9"  x2="33" y2="9"  stroke="white" stroke-width="0.5" opacity="0.25"/>
      <line x1="1"  y1="17" x2="33" y2="17" stroke="white" stroke-width="0.5" opacity="0.25"/>
      <line x1="1"  y1="25" x2="33" y2="25" stroke="white" stroke-width="0.5" opacity="0.25"/>
      <line x1="9"  y1="1"  x2="9"  y2="33" stroke="white" stroke-width="0.5" opacity="0.25"/>
      <line x1="17" y1="1"  x2="17" y2="33" stroke="white" stroke-width="0.5" opacity="0.25"/>
      <line x1="25" y1="1"  x2="25" y2="33" stroke="white" stroke-width="0.5" opacity="0.25"/>
      <text x="17" y="21" text-anchor="middle" dominant-baseline="middle"
        font-family="Space Mono,monospace" font-size="14" font-weight="700" fill="white">${id}</text>
      <polygon points="12,33 22,33 17,41" fill="${color}"/>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: '',        // 清空預設白色背景 class
    iconSize:   [34, 42],
    iconAnchor: [17, 41], // 箭頭尖端對準座標
    popupAnchor:[0, -42],
  });
}

export default function ExhibitionMap() {
  const containerRef = useRef(null);
  const mapRef      = useRef(null);

  useEffect(() => {
    // StrictMode 雙重呼叫防護
    if (mapRef.current || !containerRef.current) return;

    const map = L.map(containerRef.current, {
      center: [25.026, 121.563],
      zoom: 15,
      zoomControl:       false,
      scrollWheelZoom:   false,
      attributionControl: false,
    });
    mapRef.current = map;

    // CartoDB Positron — 乾淨淺色底圖
    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      { subdomains: 'abcd', maxZoom: 19 }
    ).addTo(map);

    L.control.attribution({ prefix: false })
      .addAttribution('© <a href="https://osm.org/copyright" target="_blank">OSM</a>')
      .addTo(map);

    // Markers
    VENUES.forEach((v) => {
      L.marker([v.lat, v.lng], { icon: makeIcon(v.id, v.color) })
        .addTo(map)
        .bindPopup(
          `<div style="font-family:'Space Mono',monospace;font-size:11px;color:#1C3D78;line-height:1.6">
             <b style="font-size:12px">展場${v.id}</b><br/>
             <span style="opacity:.7">${v.desc}</span>
           </div>`,
          { maxWidth: 160 }
        );
    });

    // 虛線連接兩展場
    L.polyline(
      VENUES.map((v) => [v.lat, v.lng]),
      { color: '#2B5399', weight: 1.5, dashArray: '6 5', opacity: 0.55 }
    ).addTo(map);

    // 自動縮放至兩點範圍
    const bounds = L.latLngBounds(VENUES.map((v) => [v.lat, v.lng]));
    map.fitBounds(bounds, { padding: [44, 44] });

    // ── 關鍵：只對 tilePane 套用色調 filter ──────────────
    // 不能套用在父容器，否則 Leaflet 的 stacking context 會導致 marker 偏移
    const tilePaneEl = map.getPanes().tilePane;
    if (tilePaneEl) {
      tilePaneEl.style.filter =
        'sepia(0.3) hue-rotate(190deg) saturate(0.5) brightness(0.88)';
    }

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
          {VENUES.map((v) => (
            <span key={v.id} className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: v.color }} />
              <span className="text-[#1C3D78]/60">{v.label}</span>
            </span>
          ))}
        </div>
      </div>

      {/* 地圖容器 — 不加任何 filter/transform，由 JS 直接操作 tilePane */}
      <div ref={containerRef} style={{ height: '240px', width: '100%' }} />

      {/* 底部地址 */}
      <div className="grid grid-cols-2 divide-x divide-[#1C3D78]/10">
        {VENUES.map((v) => (
          <div key={v.id} className="px-3 py-2.5">
            <p className="text-[9px] font-mono uppercase tracking-widest mb-0.5"
               style={{ color: v.color, opacity: 0.75 }}>
              {v.label}
            </p>
            <p className="text-[10px] font-mono text-[#1C3D78] leading-snug">{v.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
