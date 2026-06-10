import type * as Leaflet from "leaflet";
import { useEffect, useRef, useState } from "react";
import type { GenUIComponentProps } from "../../types/public";
import styles from "./components.module.css";

interface Marker {
  lat: number;
  lng: number;
  label?: string;
}
interface MapProps {
  center?: [number, number];
  zoom?: number;
  markers?: Marker[];
  route?: [number, number][];
  /** Tile URL override (e.g. a Mapbox/Carto template). Defaults to OpenStreetMap. */
  tileUrl?: string;
}

const ICON = {
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41] as [number, number],
  iconAnchor: [12, 41] as [number, number],
};

/** Leaflet + OpenStreetMap map (lazy-loaded). props: { center, zoom, markers, route, tileUrl? } */
export function MapView({ props, data }: GenUIComponentProps) {
  const elRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const groupRef = useRef<Leaflet.LayerGroup | null>(null);
  const LRef = useRef<typeof Leaflet | null>(null);
  const [ready, setReady] = useState(false);

  const merged: MapProps = { ...((props as MapProps) ?? {}), ...((data as MapProps) ?? {}) };
  const key = JSON.stringify(merged);

  const draw = () => {
    const L = LRef.current;
    const map = mapRef.current;
    const group = groupRef.current;
    if (!L || !map || !group) return;
    group.clearLayers();
    const pts: [number, number][] = [];
    const icon = L.icon(ICON);
    for (const m of merged.markers ?? []) {
      L.marker([m.lat, m.lng], { icon }).addTo(group).bindPopup(m.label ?? "");
      pts.push([m.lat, m.lng]);
    }
    if (merged.route?.length) {
      L.polyline(merged.route, { color: "#5b58f0", weight: 4 }).addTo(group);
      pts.push(...merged.route);
    }
    if (pts.length) {
      try {
        map.fitBounds(L.latLngBounds(pts).pad(0.2));
      } catch {
        /* single point / invalid bounds */
      }
    } else if (merged.center) {
      map.setView(merged.center, merged.zoom ?? 12);
    }
  };

  useEffect(() => {
    let disposed = false;
    void (async () => {
      const mod = await import("leaflet");
      await import("leaflet/dist/leaflet.css");
      const L = (mod.default ?? mod) as typeof Leaflet;
      if (disposed || !elRef.current) return;
      LRef.current = L;
      const map = L.map(elRef.current).setView(merged.center ?? [37.62, -122.38], merged.zoom ?? 12);
      L.tileLayer(merged.tileUrl ?? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);
      mapRef.current = map;
      groupRef.current = L.layerGroup().addTo(map);
      setReady(true);
      draw();
      setTimeout(() => map.invalidateSize(), 0);
    })();
    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (ready) draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready]);

  return (
    <div className={styles.mapBox} style={{ position: "relative" }}>
      {!ready ? <div className={styles.skeleton}>Loading map…</div> : null}
      <div ref={elRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
