import React, { useEffect, useMemo, useState } from 'react';

export default function AdminReports() {
  const [trips, setTrips] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(()=>{ (async()=>{ try { const [u,d,t] = await Promise.all([
    fetch('/api/admin/users').then(r=>r.ok?r.json():{users:[]}).catch(()=>({users:[]})),
    fetch('/api/admin/drivers').then(r=>r.ok?r.json():{drivers:[]}).catch(()=>({drivers:[]})),
    fetch('/api/admin/trips').then(r=>r.ok?r.json():{trips:[]}).catch(()=>({trips:[]})),
  ]); setUsers(u.users||[]); setDrivers(d.drivers||[]); setTrips(t.trips||[]); } finally { setLoading(false);} })(); },[]);
  const totals = useMemo(()=>({ revenue: trips.reduce((s,t)=> s+Number(t.fee||0),0), count: trips.length }),[trips]);

  const tripsByDay = useMemo(()=> aggregateByDay(trips), [trips]);
  const tripsByUser = useMemo(()=> countBy(trips,'userId'), [trips]);
  const tripsByDriver = useMemo(()=> countBy(trips,'driverId'), [trips]);
  const userNameById = useMemo(()=> mapNames(users), [users]);
  const driverNameById = useMemo(()=> mapNames(drivers), [drivers]);
  const daySeriesMonth = useMemo(()=> aggregateByMonthDay(trips, 'day'), [trips]);
  const nightSeriesMonth = useMemo(()=> aggregateByMonthDay(trips, 'night'), [trips]);

  return (
    <div>
      <div className="mb-4 text-xl font-bold">Reports</div>
      {loading ? <div className="text-sm text-neutral-600">Loading…</div> : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border bg-white p-4">
              <div className="text-xs text-neutral-600">Total trips</div>
              <div className="text-2xl font-bold">{totals.count.toLocaleString()}</div>
            </div>
            <div className="rounded-2xl border bg-white p-4">
              <div className="text-xs text-neutral-600">Total revenue</div>
              <div className="text-2xl font-bold">₦{totals.revenue.toLocaleString()}</div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border bg-white p-4 lg:col-span-2">
              <div className="mb-2 text-sm font-semibold text-neutral-600">Trips over time</div>
              <LineChart data={tripsByDay} />
            </div>
            <div className="rounded-2xl border bg-white p-4">
              <div className="mb-2 text-sm font-semibold text-neutral-600">Top users</div>
              <BarChart data={topN(tripsByUser, userNameById)} />
              <div className="mt-4 mb-2 text-sm font-semibold text-neutral-600">Top drivers</div>
              <BarChart data={topN(tripsByDriver, driverNameById)} />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border bg-white p-4">
              <div className="mb-2 text-sm font-semibold text-neutral-600">Day-time trips (this month by day)</div>
              <LineChart data={daySeriesMonth} />
            </div>
            <div className="rounded-2xl border bg-white p-4">
              <div className="mb-2 text-sm font-semibold text-neutral-600">Night-time trips (this month by day)</div>
              <LineChart data={nightSeriesMonth} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function aggregateByDay(rows:any[]) {
  const map = new Map<string, number>();
  rows.forEach((r:any)=>{ const d=new Date(r.startedAt||r.ts||Date.now()); const k=`${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`; map.set(k,(map.get(k)||0)+1); });
  return Array.from(map.entries()).sort((a,b)=> new Date(a[0]).getTime()-new Date(b[0]).getTime()).map(([label,value])=>({label,value}));
}
function countBy(rows:any[], key:string){ const m:Record<string,number>={}; rows.forEach(r=>{ const k=String(r[key]||'—'); m[k]=(m[k]||0)+1;}); return m; }
function mapNames(list:any[]){ const m:Record<string,string>={}; list.forEach((x:any)=>{ const id=String(x.id||x.uid||x.email||x.phone||''); const nm=((`${x.firstName||''} ${x.lastName||''}`).trim())||x.name||id; if(id) m[id]=nm; }); return m; }
function topN(counts:Record<string,number>, names:Record<string,string>){ return Object.entries(counts).map(([k,v])=>({label:names[String(k)]||String(k), value:v})).sort((a,b)=>b.value-a.value).slice(0,5); }
function aggregateByMonthDay(rows:any[], period:'day'|'night'){
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const keys = Array.from({ length: daysInMonth }, (_, i) => String(i + 1));
  const map = new Map(keys.map(k => [k, 0] as [string, number]));
  rows.forEach((r:any)=>{
    const dt = new Date(r.startedAt || r.ts || Date.now());
    if (dt.getFullYear() !== y || dt.getMonth() !== m) return;
    const hour = dt.getHours();
    const isDay = hour >= 6 && hour < 18;
    if ((period === 'day' && isDay) || (period === 'night' && !isDay)) {
      const k = String(dt.getDate());
      map.set(k, (map.get(k) || 0) + 1);
    }
  });
  return keys.map(k => ({ label: k, value: map.get(k) || 0 }));
}

function LineChart({ data }:{ data:{label:string; value:number}[] }){
  const w=500,h=160,pad=24; const max=Math.max(1,...data.map(d=>d.value));
  const points = data.map((d,i)=>{ const x = pad + (i*(w-2*pad))/Math.max(1,(data.length-1)); const y = h-pad - (d.value/max)*(h-2*pad); return `${x},${y}`; }).join(' ');
  return (<svg viewBox={`0 0 ${w} ${h}`} className="h-48 w-full"><rect x={0} y={0} width={w} height={h} fill="#f8fafc" rx={12} /><polyline fill="none" stroke="#6366f1" strokeWidth={3} points={points} /></svg>);
}
function BarChart({ data }:{ data:{label:string; value:number}[] }){
  const max=Math.max(1,...data.map(d=>d.value));
  return (<div className="space-y-2">{data.map((d,i)=>(<div key={`${String(d.label)}-${i}`} className="flex items-center gap-2"><div className="w-40 text-xs text-neutral-600">{d.label}</div><div className="h-2 flex-1 rounded bg-neutral-200"><div className="h-2 rounded bg-primary" style={{ width: `${(d.value/max)*100}%` }} /></div><div className="w-10 text-right text-xs">{d.value}</div></div>))}</div>);
}
