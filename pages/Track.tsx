import React from 'react';
import Layout from '@/components/app/Layout';
import { apiFetch } from '@/lib/utils';
import { useParams, useSearchParams } from 'react-router-dom';

export default function TrackPage(){
  const { id } = useParams();
  const [search] = useSearchParams();
  const token = search.get('t') || '';
  const mapRef = React.useRef<HTMLDivElement | null>(null);
  const mapObj = React.useRef<any>(null);
  const markerRef = React.useRef<any>(null);
  const polyRef = React.useRef<any>(null);

  const ensureMap = React.useCallback((center: google.maps.LatLngLiteral)=>{
    if (!mapRef.current) return;
    if (mapObj.current) return;
    mapObj.current = new google.maps.Map(mapRef.current, { center, zoom: 14, disableDefaultUI: false });
    markerRef.current = new google.maps.Marker({ position: center, map: mapObj.current, title: 'Driver' });
    polyRef.current = new google.maps.Polyline({ map: mapObj.current, path: [center], strokeColor: '#0ea5a5', strokeOpacity: 0.9, strokeWeight: 4 });
  },[]);

  React.useEffect(()=>{
    let timer: any = null;
    let cancelled = false;
    const load = async () => {
      try {
        if (!id) return;
        const r = await apiFetch(`/api/trips/${encodeURIComponent(String(id))}/track`);
        const d = await r?.json().catch(()=>null);
        const path = (d?.path || []) as { lat:number; lng:number }[];
        const last = d?.last || null;
        if (!path.length && !last) return;
        const center = last ? { lat: Number(last.lat), lng: Number(last.lng) } : path[path.length-1];
        if (window.google && (google as any).maps) ensureMap(center);
        if (mapObj.current) {
          try {
            markerRef.current?.setPosition(center);
            const p = (polyRef.current?.getPath && polyRef.current.getPath()) || null;
            if (p) { p.clear(); path.forEach(pt=>p.push(pt)); }
            mapObj.current.panTo(center);
          } catch {}
        }
      } catch {}
    };
    load();
    timer = setInterval(load, 4000);
    return ()=>{ cancelled = true; if (timer) clearInterval(timer); };
  }, [id, token, ensureMap]);

  return (
    <Layout hideBottomNav>
      <div className="px-4 pt-6">
        <h1 className="text-2xl font-bold">Live Tracking</h1>
        <div className="mt-3 h-[60vh] w-full rounded-2xl border bg-white overflow-hidden">
          <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
        </div>
        <p className="mt-2 text-sm text-neutral-600">Share this page with your contacts to follow your ride in real-time.</p>
      </div>
    </Layout>
  );
}
