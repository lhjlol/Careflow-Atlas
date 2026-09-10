import { useEffect, useRef, useState } from 'react';
import { Map as LibreMap, Marker, MercatorCoordinate, NavigationControl, ScaleControl, type GeoJSONSource, type MapMouseEvent } from 'maplibre-gl';
import { Compass, Layers3, Minus, Plus, RotateCcw, WifiOff } from 'lucide-react';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { FeatureCollection, Polygon } from 'geojson';
import { buildingFeatures, DISTRICT_CAMERA, floorFeatures, footprintOf, FLOOR_HEIGHT, FLOOR_GAP, type MapBuilding } from './mapModel';
import './map.css';

interface MapSceneProps {
  buildings: MapBuilding[];
  selectedBuildingId?: string;
  selectedFloorId?: string;
  expanded: boolean;
  onSelectBuilding: (id: string) => void;
  onSelectFloor: (id: string) => void;
  onToggleExpanded: () => void;
  onOverview: () => void;
}

export default function MapScene(props: MapSceneProps) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LibreMap | null>(null);
  const current = useRef(props);
  const separation = useRef(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [notice, setNotice] = useState('');
  const [hover, setHover] = useState<{ x: number; y: number; title: string; subtitle: string }>();
  const [is3D, setIs3D] = useState(false);
  const markers = useRef<Marker[]>([]);
  const floorLabelElements = useRef(new Map<string, HTMLButtonElement>());
  const active = props.buildings.find(b => b.id === props.selectedBuildingId);

  useEffect(() => { current.current = props; });

  useEffect(() => {
    if (!container.current) return;
    let map: LibreMap;
    let disposed = false;
    let loaded = false;
    const timeout = window.setTimeout(() => { if (!loaded) setFailed(true); }, 18000);
    try {
      map = new LibreMap({
        container: container.current,
        style: import.meta.env.VITE_MAP_STYLE_URL || 'https://tiles.openfreemap.org/styles/positron',
        ...DISTRICT_CAMERA, maxPitch: 68,
        canvasContextAttributes: { antialias: true },
        attributionControl: { compact: true },
      });
      mapRef.current = map;
      map.addControl(new ScaleControl({ maxWidth: 90, unit: 'metric' }), 'bottom-left');
      map.addControl(new NavigationControl({ showCompass: false, showZoom: false }), 'bottom-right');
      map.on('error', () => { if (!loaded) setNotice('正在連接底圖；可先從大廈清單查看及記錄。'); });
      map.on('webglcontextlost', () => setFailed(true));
      map.on('webglcontextrestored', () => { setFailed(false); map.triggerRepaint(); });
      map.on('load', () => {
        if (disposed) return;
        loaded = true;
        window.clearTimeout(timeout);
        setFailed(false);
        setNotice('');
        const firstLabel = map.getStyle().layers.find(layer => layer.type === 'symbol')?.id;
        if (map.getSource('openmaptiles')) {
          map.addLayer({
            id: 'city-depth', source: 'openmaptiles', 'source-layer': 'building', type: 'fill-extrusion', minzoom: 15,
            paint: {
              'fill-extrusion-color': '#c4cfcc',
              'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 6],
              'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
              'fill-extrusion-opacity': 0,
            },
          }, firstLabel);
        }
        map.addSource('outreach-buildings', { type: 'geojson', data: buildingFeatures(current.current.buildings) });
        map.addSource('focused-city', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        map.addLayer({ id: 'focused-city', source: 'focused-city', type: 'fill-extrusion', paint: {
          'fill-extrusion-color': '#c7d1cb', 'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-base': ['get', 'base'], 'fill-extrusion-opacity': 0.52,
        } }, firstLabel);
        map.addLayer({ id: 'outreach-buildings', source: 'outreach-buildings', type: 'fill-extrusion', paint: {
          'fill-extrusion-color': ['get', 'color'], 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-opacity': 0.88,
        } });
        map.addSource('outreach-floors', { type: 'geojson', data: floorFeatures(undefined, 0) });
        map.addLayer({ id: 'outreach-floors', source: 'outreach-floors', type: 'fill-extrusion', paint: {
          'fill-extrusion-color': ['get', 'color'], 'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-base': ['get', 'base'], 'fill-extrusion-opacity': 0.97, 'fill-extrusion-vertical-gradient': true,
        } });
        map.addLayer({
          id: 'floor-label-projection', type: 'custom', renderingMode: '3d',
          render: (_gl, options) => {
            const p = current.current;
            const building = p.buildings.find(b => b.id === p.selectedBuildingId);
            if (!building) return;
            const matrix = options.defaultProjectionData.mainMatrix;
            const canvas = map.getCanvas();
            building.floors.forEach((floor, index) => {
              const element = floorLabelElements.current.get(floor.id);
              if (!element) return;
              const local = Math.max(0, Math.min(1, (separation.current - index * .018) / (1 - index * .018)));
              const altitude = index * (FLOOR_HEIGHT + local * FLOOR_GAP) + FLOOR_HEIGHT / 2;
              const point = MercatorCoordinate.fromLngLat([building.longitude + 20 / (111320 * Math.cos(building.latitude * Math.PI / 180)), building.latitude], altitude);
              const x = matrix[0] * point.x + matrix[4] * point.y + matrix[8] * point.z + matrix[12];
              const y = matrix[1] * point.x + matrix[5] * point.y + matrix[9] * point.z + matrix[13];
              const w = matrix[3] * point.x + matrix[7] * point.y + matrix[11] * point.z + matrix[15];
              element.style.transform = `translate(${(x / w + 1) * canvas.clientWidth / 2}px,${(1 - y / w) * canvas.clientHeight / 2}px) translateY(-50%)`;
              element.style.opacity = p.expanded && map.getPitch() > 25 && w > 0 ? '1' : '0';
              element.style.pointerEvents = p.expanded && map.getPitch() > 25 ? 'auto' : 'none';
            });
          },
        });
        map.setLight({ anchor: 'viewport', color: '#ffffff', intensity: 0.4, position: [1.5, 160, 40] });
        setReady(true);
      });
      const onClick = (e: MapMouseEvent) => {
        if (!loaded) return;
        const hits = map.queryRenderedFeatures(e.point, { layers: ['outreach-floors', 'outreach-buildings'] });
        if (hits[0]?.layer.id === 'outreach-floors') {
          current.current.onSelectFloor(String(hits[0].properties.id));
          return;
        }
        if (hits[0]) { current.current.onSelectBuilding(String(hits[0].properties.id)); return; }
        if (map.getLayer('building') && map.queryRenderedFeatures(e.point, { layers: ['building'] }).length) {
          setNotice('這幢大廈暫無示範記錄。請選擇有標記的大廈。');
        }
      };
      map.on('click', onClick);
      map.on('mousemove', e => {
        if (!loaded) return;
        const hit = map.queryRenderedFeatures(e.point, { layers: ['outreach-floors', 'outreach-buildings'] })[0];
        map.getCanvas().style.cursor = hit ? 'pointer' : '';
        if (!hit) { setHover(undefined); return; }
        const p = current.current;
        const selected = p.buildings.find(b => b.id === p.selectedBuildingId);
        const floor = selected?.floors.find(f => f.id === hit.properties.id);
        const building = p.buildings.find(b => b.id === hit.properties.id);
        setHover({ x: e.point.x, y: e.point.y, title: floor ? `${selected?.name} · ${floor.label}` : building?.name ?? '', subtitle: floor ? `${floor.recorded}/${floor.total} 個單位有記錄${floor.hasFollowUp ? ' · 有待跟進' : ''}` : building?.status ?? '' });
      });
      map.on('mouseout', () => setHover(undefined));
      map.on('pitchend', () => setIs3D(map.getPitch() > 10));
      map.on('pitch', () => { if (map.getLayer('city-depth')) map.setPaintProperty('city-depth', 'fill-extrusion-opacity', .48 * Math.min(1, map.getPitch() / 45)); });
      const observer = new ResizeObserver(() => map.resize());
      observer.observe(container.current);
      return () => {
        disposed = true; observer.disconnect(); window.clearTimeout(timeout);
        markers.current.forEach(m => m.remove()); markers.current = [];
        map.remove(); mapRef.current = null;
      };
    } catch {
      window.clearTimeout(timeout); setFailed(true);
    }
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    (map.getSource('outreach-buildings') as GeoJSONSource).setData(buildingFeatures(props.buildings, active?.floors.length ? props.selectedBuildingId : undefined));
    markers.current.forEach(m => m.remove());
    markers.current = props.buildings.filter(b => b.id !== props.selectedBuildingId).map(building => {
      const button = document.createElement('button');
      button.className = 'building-map-marker';
      button.setAttribute('aria-label', `在地圖選擇${building.name}`);
      const dot = document.createElement('span'); dot.style.background = building.color;
      const name = document.createElement('strong'); name.textContent = building.name;
      button.append(dot, name);
      button.addEventListener('click', e => { e.stopPropagation(); current.current.onSelectBuilding(building.id); });
      return new Marker({ element: button, anchor: 'bottom', offset: [0, -6] }).setLngLat([building.longitude, building.latitude]).addTo(map);
    });
    if (map.getLayer('city-depth')) {
      map.setLayoutProperty('city-depth', 'visibility', active ? 'none' : 'visible');
    }
    if (!active) (map.getSource('focused-city') as GeoJSONSource).setData({ type: 'FeatureCollection', features: [] });
  }, [props.buildings, props.selectedBuildingId, active, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    map.resize();
    setHover(undefined);
    setNotice('');
    if (active) {
      map.flyTo({ center: [active.longitude, active.latitude], zoom: window.innerWidth < 760 ? 18.15 : 18.7, pitch: 58, bearing: -24,
        offset: [0, window.innerWidth < 760 ? 85 : 110],
        duration: reduced ? 0 : 1700, essential: false });
    } else {
      map.flyTo({ ...DISTRICT_CAMERA, offset: [0, 0], duration: reduced ? 0 : 1300 });
    }
  // Camera changes follow selection, not observation edits.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.selectedBuildingId, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !active || !map.getSource('openmaptiles')) return;
    let previous = '';
    const refresh = () => {
      const collection: FeatureCollection<Polygon> = { type: 'FeatureCollection', features: [] };
      const envelope = footprintOf(active, 34);
      const seen = new Set<string>();
      for (const feature of map.querySourceFeatures('openmaptiles', { sourceLayer: 'building' })) {
        const polygons = feature.geometry.type === 'MultiPolygon' ? feature.geometry.coordinates : feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : [];
        for (const polygon of polygons) {
          const ring = polygon[0];
          const xs = ring.map(p => p[0]), ys = ring.map(p => p[1]);
          const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
          if (maxX >= envelope[0][0] && minX <= envelope[2][0] && maxY >= envelope[0][1] && minY <= envelope[2][1]) continue;
          if (Math.abs((minX + maxX) / 2 - active.longitude) > .004 || Math.abs((minY + maxY) / 2 - active.latitude) > .003) continue;
          const key = `${feature.id}:${JSON.stringify(ring)}`;
          if (seen.has(key)) continue;
          seen.add(key);
          collection.features.push({ type: 'Feature', geometry: { type: 'Polygon', coordinates: polygon }, properties: { height: Number(feature.properties.render_height) || 6, base: Number(feature.properties.render_min_height) || 0 } });
        }
      }
      const signature = JSON.stringify(collection);
      if (signature !== previous) { previous = signature; (map.getSource('focused-city') as GeoJSONSource).setData(collection); }
    };
    map.on('idle', refresh);
    refresh();
    return () => { map.off('idle', refresh); };
  }, [active, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const source = map.getSource('outreach-floors') as GeoJSONSource;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const from = separation.current;
    const to = props.expanded ? 1 : 0;
    const started = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = reduced ? 1 : Math.min(1, (now - started) / 850);
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      separation.current = from + (to - from) * eased;
      source.setData(floorFeatures(active, separation.current, props.selectedFloorId));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, props.expanded, props.selectedFloorId, ready]);

  const toggle3D = () => {
    const map = mapRef.current;
    if (!map) return;
    map.easeTo({ pitch: is3D ? 0 : 61, duration: 800 });
  };

  return <div className="map-scene" aria-label="西營盤外展地圖">
    <div ref={container} className="map-canvas" data-testid="map-canvas" />
    <div className="floor-map-labels" aria-hidden={!props.expanded || !is3D}>{active?.floors.map(floor => <button key={floor.id} ref={element => { if (element) floorLabelElements.current.set(floor.id, element); else floorLabelElements.current.delete(floor.id); }}
      className={`floor-map-label ${floor.hasFollowUp ? 'needs-followup' : ''} ${props.selectedFloorId === floor.id ? 'selected' : ''}`}
      aria-label={`在立體地圖選擇 ${floor.label}${floor.hasFollowUp ? ' 待跟進' : ''}`} tabIndex={props.expanded && is3D ? 0 : -1}
      onClick={() => props.onSelectFloor(floor.id)}><strong>{floor.label}</strong>{floor.hasFollowUp && <span>待跟進</span>}</button>)}</div>
    {!ready && !failed && <div className="map-loading"><span className="loading-orbit" />正在載入西營盤地圖</div>}
    {failed && <div className="map-failure" role="status"><WifiOff size={22} /><strong>底圖暫時無法顯示</strong><span>你仍可從大廈清單查看樓層、記錄結果。</span></div>}
    <div className="map-location"><span>香港 · 中西區</span><strong>西營盤 <small>Sai Ying Pun</small></strong></div>
    <div className="map-tools">
      <button className="map-tool" onClick={toggle3D} aria-label={is3D ? '切換平面地圖' : '切換立體地圖'} disabled={!ready}>{is3D ? '2D' : '3D'}</button>
      <button className="map-tool" aria-label="放大地圖" onClick={() => mapRef.current?.zoomIn()} disabled={!ready}><Plus size={19} /></button>
      <button className="map-tool" aria-label="縮小地圖" onClick={() => mapRef.current?.zoomOut()} disabled={!ready}><Minus size={19} /></button>
      <button className="map-tool compass" aria-label="地圖朝北" onClick={() => mapRef.current?.easeTo({ bearing: 0 })} disabled={!ready}><Compass size={20} /><span>N</span></button>
    </div>
    {active && <div className="building-focus-bar">
      <div><span className="eyebrow">正在查看 · 示意結構</span><strong>{active.name}<small>{active.floors.length ? `${active.floors.length} 層` : '樓層待確認'}</small></strong></div>
      <button className={`primary-button ${props.expanded ? 'is-active' : ''}`} onClick={props.onToggleExpanded} disabled={!active.floors.length}><Layers3 size={17} />{props.expanded ? '合攏樓層' : '展開樓層'}</button>
      <button className="icon-button" aria-label="返回街區總覽" onClick={props.onOverview}><RotateCcw size={18} /></button>
    </div>}
    {hover && <div className="map-hover" style={{ left: hover.x, top: hover.y }}><strong>{hover.title}</strong><span>{hover.subtitle}</span></div>}
    {notice && <button className="map-notice" onClick={() => setNotice('')} role="status">{notice}<span>×</span></button>}
    <div className="map-legend"><span><i className="legend-swatch teal" />有外展記錄</span><span><i className="legend-swatch amber" />待跟進</span><span><i className="legend-swatch gray" />尚待了解</span></div>
    <div className="geometry-note">真實底圖 · 業務地點及樓層為合成示意</div>
  </div>;
}
