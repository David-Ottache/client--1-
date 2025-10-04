import React, { useEffect, useMemo, useState } from 'react';

export default function AdminTrips() {
  function exportCSV(rows:any[]){
    const header = ["ID","Pickup","Destination","Driver","User","Cost","When"];
    const lines = rows.map((t:any)=>{
      const id = t.id || '';
      const pickup = t.pickup || '';
      const dest = t.destination || '';
      const driver = String(t.driverId||'');
      const user = String(t.userId||'');
      const cost = Number(t.fee||0);
      const when = new Date(t.startedAt||t.ts||Date.now()).toLocaleString();
      const vals = [id,pickup,dest,driver,user,cost,when].map(v=>`"${String(v).replace(/"/g,'""')}"`);
      return vals.join(',');
    });
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download=`trips-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }
  function exportPDF(rows:any[]){
    const pageW=595, pageH=842; const margin=40; let y = pageH - margin; const lineH=14; const left=margin;
    const header = ['ID','Pickup','Destination','Driver','User','Cost','When'];
    function esc(s:string){ return String(s).split('(').join('\\(').split(')').join('\\)').split('\r').join(' ').split('\n').join(' '); }
    const allLines = [header, ...rows.map((t:any)=>{
      const id = t.id || '';
      const pickup = t.pickup || '';
      const dest = t.destination || '';
      const driver = String(t.driverId||'');
      const user = String(t.userId||'');
      const cost = String(Number(t.fee||0));
      const when = new Date(t.startedAt||t.ts||Date.now()).toLocaleString();
      return [id,pickup,dest,driver,user,cost,when];
    })];
    const colX = [left, left+70, left+180, left+320, left+400, left+460, left+500];
    let textStream = 'BT /F1 10 Tf';
    function addRow(cols:string[]){ cols.forEach((t,i)=>{ textStream += ` ${colX[i]||left} ${y} Td (${esc(t)}) Tj T*`; }); y -= lineH; textStream += ` 0 ${-lineH} Td`; }
    addRow(allLines[0]); y -= 6;
    for(let i=1;i<allLines.length;i++){ if (y < margin+40) break; addRow(allLines[i]); }
    textStream += ' ET';
    const objects: string[] = []; const o=(s:string)=>{ objects.push(s); };
    o('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
    o('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
    o(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n`);
    const stream = `<< /Length ${textStream.length} >>\nstream\n${textStream}\nendstream\n`; o(`4 0 obj\n${stream}endobj\n`);
    o('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');
    let pdf = '%PDF-1.4\n'; const xref:number[]=[0]; objects.forEach(s=>{ xref.push(pdf.length); pdf+=s; });
    const xrefStart = pdf.length; pdf += `xref\n0 ${objects.length+1}\n0000000000 65535 f \n`; for(let i=1;i<=objects.length;i++){ const off=String(xref[i]).padStart(10,'0'); pdf += `${off} 00000 n \n`; }
    pdf += `trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
    const blob = new Blob([pdf], { type: 'application/pdf' }); const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `trips-${new Date().toISOString().slice(0,10)}.pdf`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }
  const [trips, setTrips] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    (async()=>{
      try {
        const [u,d,t] = await Promise.all([
          fetch('/api/admin/users').then(r=>r.ok?r.json():{users:[]}).catch(()=>({users:[]})),
          fetch('/api/admin/drivers').then(r=>r.ok?r.json():{drivers:[]}).catch(()=>({drivers:[]})),
          fetch('/api/admin/trips').then(r=>r.ok?r.json():{trips:[]}).catch(()=>({trips:[]})),
        ]);
        setUsers(u.users||[]);
        setDrivers(d.drivers||[]);
        setTrips(t.trips||[]);
      } finally { setLoading(false); }
    })();
  },[]);

  const byDay = useMemo(()=> aggregateByDay(trips), [trips]);
  const topRoutes = useMemo(()=> routeCounts(trips).slice(0,5), [trips]);
  const costs = useMemo(()=> byDay.map(d=>d.value), [byDay]);
  const total = trips.reduce((s,t)=> s + Number(t.fee||0), 0);

  const userNameById = useMemo(()=>{
    const m: Record<string,string> = {};
    users.forEach((u:any)=>{
      const id = String(u.id || u.uid || u.email || u.phone || '');
      const name = (`${u.firstName||''} ${u.lastName||''}`.trim()) || u.name || id;
      if (id) m[id] = name;
    });
    return m;
  },[users]);
  const driverNameById = useMemo(()=>{
    const m: Record<string,string> = {};
    drivers.forEach((d:any)=>{
      const id = String(d.id || d.uid || d.email || d.phone || '');
      const name = (`${d.firstName||''} ${d.lastName||''}`.trim()) || d.name || id;
      if (id) m[id] = name;
    });
    return m;
  },[drivers]);

  return (
    <div>
      <div className="mb-4 text-xl font-bold">Trips</div>
      {loading ? (<div className="text-sm text-neutral-600">Loading…</div>) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border bg-white p-4 lg:col-span-2">
            <div className="mb-2 text-sm font-semibold text-neutral-600">Trips cost over time</div>
            <LineChart data={byDay} />
          </div>
          <div className="rounded-2xl border bg-white p-4">
            <div className="mb-1 text-xs text-neutral-600">Total revenue</div>
            <div className="text-2xl font-bold">₦{total.toLocaleString()}</div>
            <div className="mt-4 mb-2 text-sm font-semibold text-neutral-600">Top routes</div>
            <BarChart data={topRoutes} />
          </div>

          <div className="rounded-2xl border bg-white p-4 lg:col-span-3">
            <div className="mb-2 flex items-center justify-between text-sm font-semibold text-neutral-600">
              <span>All trips</span>
              <div className="flex items-center gap-2">
                <button onClick={() => exportPDF(trips)} className="hidden sm:inline-flex h-9 items-center rounded-lg border bg-white px-3 text-xs font-medium hover:bg-neutral-50">Export PDF</button>
                <button onClick={() => exportCSV(trips)} className="hidden sm:inline-flex h-9 items-center rounded-lg border bg-white px-3 text-xs font-medium hover:bg-neutral-50">Export CSV</button>
              </div>
            </div>
            <div className="overflow-x-auto rounded-xl border">
              <table className="min-w-full text-sm">
                <thead><tr className="bg-neutral-50"><th className="p-2 text-left">ID</th><th className="p-2 text-left">Pickup → Destination</th><th className="p-2 text-left">Driver</th><th className="p-2 text-left">User</th><th className="p-2 text-left">Cost (₦)</th><th className="p-2 text-left">When</th></tr></thead>
                <tbody>
                  {trips.map((t:any)=> (
                    <tr key={t.id} className="border-t">
                      <td className="p-2">{t.id}</td>
                      <td className="p-2">{t.pickup} → {t.destination}</td>
                      <td className="p-2">{driverNameById[String(t.driverId||'')] || t.driverName || String(t.driverId||'—')}</td>
                      <td className="p-2">{userNameById[String(t.userId||'')] || t.userName || String(t.userId||'—')}</td>
                      <td className="p-2">{Number(t.fee||0).toLocaleString()}</td>
                      <td className="p-2">{new Date(t.startedAt||t.ts||Date.now()).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function aggregateByDay(rows:any[]) {
  const map = new Map<string, number>();
  rows.forEach((r:any)=>{
    const d = new Date(r.startedAt || r.ts || Date.now());
    const key = `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
    map.set(key, (map.get(key)||0) + Number(r.fee||0));
  });
  const entries = Array.from(map.entries()).sort((a,b)=> new Date(a[0]).getTime()-new Date(b[0]).getTime());
  return entries.map(([k,v])=> ({ label: k, value: v }));
}

function routeCounts(rows:any[]){
  const map = new Map<string, number>();
  rows.forEach((r:any)=>{ const key = `${r.pickup||'—'} → ${r.destination||'—'}`; map.set(key,(map.get(key)||0)+1); });
  return Array.from(map.entries()).map(([label,value])=>({label,value})).sort((a,b)=>b.value-a.value);
}

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
      <polyline fill="none" stroke="#10b981" strokeWidth={3} points={points} />
    </svg>
  );
}

function BarChart({ data }:{ data:{label:string; value:number}[] }){
  const max=Math.max(1,...data.map(d=>d.value));
  return (
    <div className="space-y-2">
      {data.map((d)=> (
        <div key={d.label} className="flex items-center gap-2">
          <div className="w-40 text-xs text-neutral-600">{d.label}</div>
          <div className="h-2 flex-1 rounded bg-neutral-200">
            <div className="h-2 rounded bg-primary" style={{ width: `${(d.value/max)*100}%` }} />
          </div>
          <div className="w-10 text-right text-xs">{d.value}</div>
        </div>
      ))}
    </div>
  );
}
