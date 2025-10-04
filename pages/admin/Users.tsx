import React, { useEffect, useMemo, useState } from 'react';

import { apiFetch } from '@/lib/utils';

export default function AdminUsers() {
  function exportCSV(rows:any[], tripsByUser:Record<string,number>, spendByUser:Record<string,number>){
    const header = ["ID","Name","Phone","Email","Trips","Spend (NGN)"];
    const lines = rows.map((u:any)=>{
      const id = u.id || u.uid || u.email || u.phone || '';
      const name = ((`${u.firstName||''} ${u.lastName||''}`).trim()) || u.name || '';
      const phone = u.phone || '';
      const email = u.email || '';
      const trips = tripsByUser[id] || 0;
      const spend = spendByUser[id] || 0;
      const vals = [id,name,phone,email,trips,spend].map(v=>`"${String(v).replace(/"/g,'""')}"`);
      return vals.join(',');
    });
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `users-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }
  function exportPDF(rows:any[], tripsByUser:Record<string,number>, spendByUser:Record<string,number>){
    const pageW=595, pageH=842; const margin=40; let y = pageH - margin; const lineH=14; const left=margin;
    const header = ['ID','Name','Phone','Email','Trips','Spend'];
    function esc(s:string){ return String(s).split('(').join('\\(').split(')').join('\\)').split('\r').join(' ').split('\n').join(' '); }
    const allLines = [header, ...rows.map((u:any)=>{
      const id = u.id || u.uid || u.email || u.phone || '';
      const name = ((`${u.firstName||''} ${u.lastName||''}`).trim()) || u.name || '';
      const phone = u.phone || '';
      const email = u.email || '';
      const trips = String(tripsByUser[id] || 0);
      const spend = String(spendByUser[id] || 0);
      return [id,name,phone,email,trips,spend];
    })];
    const colX = [left, left+80, left+220, left+320, left+440, left+500];
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
    const a = document.createElement('a'); a.href = url; a.download = `users-${new Date().toISOString().slice(0,10)}.pdf`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }
  const [users, setUsers] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(()=>{
    (async()=>{
      try {
        const [uRes,tRes] = await Promise.all([
          apiFetch('/api/admin/users'),
          apiFetch('/api/admin/trips'),
        ]);
        const u = await uRes?.json().catch(()=>({users:[]})) || {users:[]};
        const t = await tRes?.json().catch(()=>({trips:[]})) || {trips:[]};
        setUsers(u.users||[]); setTrips(t.trips||[]);
      } finally { setLoading(false); }
    })();
  },[]);

  const tripsByUser = useMemo(()=>countBy(trips,'userId'),[trips]);
  const spendByUser = useMemo(()=>sumBy(trips,'userId','fee'),[trips]);
  const nameById = useMemo(()=>{ const m:Record<string,string>={}; users.forEach((u:any)=>{ const id=String(u.id||u.uid||u.email||u.phone||''); const nm=((`${u.firstName||''} ${u.lastName||''}`).trim())||u.name||id; if(id) m[id]=nm; }); return m; },[users]);
  const topUsers = useMemo(()=> Object.entries(tripsByUser).map(([k,v])=>({label:nameById[String(k)]||String(k),value:v as number})).sort((a,b)=>b.value-a.value).slice(0,5),[tripsByUser,nameById]);
  const topSpend = useMemo(()=> Object.entries(spendByUser).map(([k,v])=>({label:nameById[String(k)]||String(k),value:Number(v)})).sort((a,b)=>b.value-a.value).slice(0,5),[spendByUser,nameById]);
  const filtered = useMemo(()=>{
    const query = q.trim().toLowerCase();
    if (!query) return users;
    return users.filter((u:any)=>{
      const name = ((`${u.firstName||''} ${u.lastName||''}`).trim()) || u.name || '';
      return [name, u.email, u.phone].some(v=> String(v||'').toLowerCase().includes(query));
    });
  },[users,q]);

  return (
    <div>
      <div className="mb-4 text-xl font-bold">Users</div>
      {loading ? (<div className="text-sm text-neutral-600">Loading…</div>) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border bg-white p-4 lg:col-span-2">
            <div className="mb-2 flex items-center justify-between text-sm font-semibold text-neutral-600">
              <span>All users</span>
              <div className="flex items-center gap-2">
                <button onClick={() => exportPDF(filtered, tripsByUser, spendByUser)} className="hidden sm:inline-flex h-9 items-center rounded-lg border bg-white px-3 text-xs font-medium hover:bg-neutral-50">Export PDF</button>
                <button onClick={() => exportCSV(filtered, tripsByUser, spendByUser)} className="hidden sm:inline-flex h-9 items-center rounded-lg border bg-white px-3 text-xs font-medium hover:bg-neutral-50">Export CSV</button>
                <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search users" className="h-9 w-56 rounded-lg border px-3 text-xs font-normal outline-none" />
              </div>
            </div>
            <div className="overflow-x-auto rounded-xl border">
              <table className="min-w-full text-sm">
                <thead><tr className="bg-neutral-50"><th className="p-2 text-left">Name</th><th className="p-2 text-left">Phone</th><th className="p-2 text-left">Email</th><th className="p-2 text-left">Trips</th><th className="p-2 text-left">Spend (₦)</th></tr></thead>
                <tbody>
                  {filtered.map((u:any)=>{
                    const id = u.id || u.uid || u.email || u.phone;
                    const tripsCount = tripsByUser[id] || 0;
                    const spend = spendByUser[id] || 0;
                    const name = (`${u.firstName||''} ${u.lastName||''}`.trim()) || u.name || id;
                    return (
                      <tr key={id} className="border-t">
                        <td className="p-2">{name}</td>
                        <td className="p-2">{u.phone||'—'}</td>
                        <td className="p-2">{u.email||'—'}</td>
                        <td className="p-2">{tripsCount}</td>
                        <td className="p-2">{Number(spend).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div className="rounded-2xl border bg-white p-4">
            <div className="mb-2 text-sm font-semibold text-neutral-600">Top users by trips</div>
            <BarChart data={topUsers} />
            <div className="mt-4 mb-2 text-sm font-semibold text-neutral-600">Top spenders</div>
            <BarChart data={topSpend} />
          </div>
        </div>
      )}
    </div>
  );
}

function countBy(rows:any[], key:string){ const m:Record<string,number>={}; rows.forEach(r=>{ const k=String(r[key]||'—'); m[k]=(m[k]||0)+1;}); return m; }
function sumBy(rows:any[], key:string, val:string){ const m:Record<string,number>={}; rows.forEach(r=>{ const k=String(r[key]||'—'); m[k]=(m[k]||0)+Number(r[val]||0);}); return m; }
function short(v:string){ return v?.slice(0,6) || '—'; }
function BarChart({ data, labelFormatter }:{ data:{label:string; value:number}[]; labelFormatter?:(s:string)=>string }){
  const max=Math.max(1,...data.map(d=>d.value));
  return (
    <div className="space-y-2">
      {data.map((d, i)=> (
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
