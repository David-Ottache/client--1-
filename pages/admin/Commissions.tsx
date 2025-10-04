import { useEffect, useMemo, useState } from "react";

import { apiFetch } from '@/lib/utils';

export default function AdminCommissions() {
  const [commissions, setCommissions] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{ (async()=>{
    try {
      const [cRes,uRes] = await Promise.all([
        apiFetch('/api/admin/commissions'),
        apiFetch('/api/admin/users'),
      ]);
      const c = await cRes?.json().catch(()=>({commissions:[]})) || {commissions:[]};
      const u = await uRes?.json().catch(()=>({users:[]})) || {users:[]};
      setCommissions(c.commissions||[]);
      setUsers(u.users||[]);
    } finally { setLoading(false); }
  })(); },[]);

  const userNameById = useMemo(()=> mapNames(users), [users]);

  return (
    <div>
      <div className="mb-4 text-xl font-bold">Commissions</div>
      {loading ? <div className="text-sm text-neutral-600">Loading…</div> : (
        <div className="rounded-2xl border bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold text-neutral-600">Total entries: {commissions.length.toLocaleString()}</div>
            <div className="text-sm font-semibold text-neutral-600">Total commission: ₦{commissions.reduce((s,c)=>s+Number(c.amount||0),0).toLocaleString()}</div>
          </div>
          <div className="overflow-x-auto rounded-xl border">
            <table className="min-w-[720px] w-full text-sm">
              <thead>
                <tr className="bg-neutral-50 text-left text-xs text-neutral-600">
                  <th className="p-2">Date</th>
                  <th className="p-2">Trip</th>
                  <th className="p-2">Rider</th>
                  <th className="p-2">Driver</th>
                  <th className="p-2">Commission (₦)</th>
                </tr>
              </thead>
              <tbody>
                {commissions.map((c,i)=>{
                  const dt = c.ts ? new Date(c.ts) : new Date();
                  const rider = userNameById[String(c.from||'')] || shortId(String(c.from||''));
                  const driver = c.driverId ? shortId(String(c.driverId)) : '—';
                  const trip = c.tripId ? shortId(String(c.tripId)) : '—';
                  return (
                    <tr key={c.id||i} className="border-t">
                      <td className="p-2 whitespace-nowrap">{dt.toLocaleString()}</td>
                      <td className="p-2">{trip}</td>
                      <td className="p-2">{rider}</td>
                      <td className="p-2">{driver}</td>
                      <td className="p-2 font-semibold">{Number(c.amount||0).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function mapNames(list:any[]){ const m:Record<string,string>={}; list.forEach((x:any)=>{ const id=String(x.id||x.uid||x.email||x.phone||''); const nm=((`${x.firstName||''} ${x.lastName||''}`).trim())||x.name||id; if(id) m[id]=nm; }); return m; }
function shortId(v:string){ return v?.slice(0,6) || '—'; }
