import Layout from "@/components/app/Layout";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Safety() {
  const { contacts, addContact, removeContact, sendSOS } = useAppStore();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [rel, setRel] = useState("");

  return (
    <Layout>
      <div className="px-4 pt-6">
        <h1 className="text-2xl font-bold">Safety</h1>
        <p className="mt-1 text-sm text-neutral-600">Add emergency contacts and test SOS.</p>

        <div className="mt-4 rounded-2xl border bg-white p-4">
          <div className="grid grid-cols-3 gap-2">
            <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Name" className="col-span-1 rounded-xl border bg-neutral-100 px-3 py-2 outline-none focus:bg-white" />
            <input value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="Phone" className="col-span-1 rounded-xl border bg-neutral-100 px-3 py-2 outline-none focus:bg-white" />
            <input value={rel} onChange={(e)=>setRel(e.target.value)} placeholder="Relationship" className="col-span-1 rounded-xl border bg-neutral-100 px-3 py-2 outline-none focus:bg-white" />
          </div>
          <Button className="mt-3 h-10 w-full rounded-full" onClick={()=>{ if(!name||!phone) return; addContact({name, phone, relationship: rel}); setName(""); setPhone(""); setRel(""); }}>Add Contact</Button>
        </div>

        <div className="mt-4 space-y-2">
          {contacts.map(c => (
            <div key={c.id} className="flex items-center justify-between rounded-2xl border bg-white p-3">
              <div>
                <div className="font-semibold">{c.name}</div>
                <div className="text-xs text-neutral-600">{c.phone} • {c.relationship || '—'}</div>
              </div>
              <button className="text-red-600" onClick={()=>removeContact(c.id)} aria-label="Remove"><Trash2 className="h-5 w-5"/></button>
            </div>
          ))}
          {contacts.length === 0 && (
            <div className="rounded-2xl border bg-white p-4 text-sm text-neutral-600">No contacts yet.</div>
          )}
        </div>

        <Button variant="destructive" className="mt-4 h-12 w-full rounded-full" onClick={()=>{ const n = sendSOS("Test SOS"); toast.success(`SOS sent to ${n} contact(s)`); }}>Send Test SOS</Button>
      </div>
    </Layout>
  );
}
