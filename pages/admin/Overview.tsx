import React, { useEffect, useState } from 'react';

import { apiFetch } from '@/lib/utils';

export default function AdminOverview() {
  const [users, setUsers] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    (async()=>{
      try {
        const [uRes,dRes,tRes] = await Promise.all([
          apiFetch('/api/admin/users'),
          apiFetch('/api/admin/drivers'),
          apiFetch('/api/admin/trips'),
        ]);
        const u = await uRes?.json().catch(()=>({users:[]})) || {users:[]};
        const d = await dRes?.json().catch(()=>({drivers:[]})) || {drivers:[]};
        const t = await tRes?.json().catch(()=>({trips:[]})) || {trips:[]};
        setUsers(u.users||[]); setDrivers(d.drivers||[]); setTrips(t.trips||[]);
      } finally { setLoading(false); }
    })();
  },[]);

  const totalRevenue = trips.reduce((s:any,t:any)=> s + Number(t.fee||0), 0);

  return (
    <div>
      <div className="rounded-2xl border bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xl font-bold">Admin Dashboard</div>
            <div className="text-sm text-neutral-600">Overview</div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat title="Users" value={users.length.toLocaleString()} />
          <Stat title="Drivers" value={drivers.length.toLocaleString()} />
          <Stat title="Trips" value={trips.length.toLocaleString()} />
          <Stat title="Revenue" value={`₦${totalRevenue.toLocaleString()}`} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border bg-white p-4 lg:col-span-2">
          <div className="mb-2 text-sm font-semibold text-neutral-600">Trips over time</div>
          <LineChart data={aggregateByDay(trips.map((t:any)=>({ ts: t.startedAt || t.ts || new Date().toISOString() })))} />
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <div className="mb-2 text-sm font-semibold text-neutral-600">Top Drivers by trips</div>
          <BarChart data={topCounts(trips,'driverId').slice(0,5)} labelFormatter={(id)=>shortId(id)} />
        </div>
      </div>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border bg-neutral-50 p-4">
      <div className="text-xs text-neutral-600">{title}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}

function aggregateByDay(rows: { ts: string }[]) {
  const map = new Map<string, number>();
  rows.forEach(r=>{
    const d = new Date(r.ts);
    const key = `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
    map.set(key, (map.get(key)||0)+1);
  });
  const entries = Array.from(map.entries()).sort((a,b)=> new Date(a[0]).getTime()-new Date(b[0]).getTime());
  return entries.map(([k,v])=> ({ label: k, value: v }));
}

function topCounts(rows:any[], field:string) {
  const map = new Map<string, number>();
  rows.forEach(r=>{ const k = String(r[field]||'unknown'); map.set(k,(map.get(k)||0)+1); });
  return Array.from(map.entries()).map(([label,value])=>({ label, value })).sort((a,b)=>b.value-a.value);
}

function shortId(v:string){ return v?.slice(0,6) || '—'; }

function LineChart({ data }:{ data:{label:string; value:number}[] }){
  const w=500,h=160,pad=24; const max=Math.max(1,...data.map(d=>d.value));
  const points = data.map((d,i)=>{
    const x = pad + (i*(w-2*pad))/Math.max(1,(data.length-1));
    const y = h-pad - (d.value/max)*(h-2*pad);
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-48 w-full">
      <rect x={0} y={0} width={w} height={h} fill="#f8fafc" rx={12} />
      <polyline fill="none" stroke="#3b82f6" strokeWidth={3} points={points} />
    </svg>
  );
}

function BarChart({ data, labelFormatter }:{ data:{label:string; value:number}[]; labelFormatter?:(s:string)=>string }){
  const max=Math.max(1,...data.map(d=>d.value));
  return (
    <div className="space-y-2">
      {data.map((d,i)=> (
        <div key={`${String(d.label)}-${i}`} className="flex items-center gap-2">
          <div className="w-20 text-xs text-neutral-600">{labelFormatter?labelFormatter(d.label):d.label}</div>
          <div className="h-2 flex-1 rounded bg-neutral-200">
            <div className="h-2 rounded bg-primary" style={{ width: `${(d.value/max)*100}%` }} />
          </div>
          <div className="w-10 text-right text-xs">{d.value}</div>
        </div>
      ))}
    </div>
  );
}
