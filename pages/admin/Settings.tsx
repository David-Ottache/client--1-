import React, { useMemo, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';

export default function AdminSettings() {
  const { settings, updateSettings } = useAppStore();
  const [local, setLocal] = useState(()=> JSON.parse(JSON.stringify(settings)) as typeof settings);

  const onChange = (path: string, value: any) => {
    setLocal((prev) => {
      const next: any = { ...prev, ride: { ...prev.ride }, payments: { ...prev.payments } };
      const segs = path.split('.');
      let cur: any = next;
      for (let i=0;i<segs.length-1;i++) { const k = segs[i]; cur[k] = cur[k] ?? {}; cur = cur[k]; }
      cur[segs[segs.length-1]] = value;
      return next;
    });
  };

  const save = async () => { await updateSettings(local); };

  return (
    <div>
      <div className="mb-4 text-xl font-bold">Settings</div>

      {/* General */}
      <Section title="General Application Settings">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="App name"><input className="h-9 w-full rounded-lg border px-3 text-sm outline-none focus:border-primary" value={local.appName||''} onChange={(e)=>onChange('appName', e.target.value)} /></Field>
          <Field label="Time zone"><input className="h-9 w-full rounded-lg border px-3 text-sm outline-none focus:border-primary" value={local.timezone||''} onChange={(e)=>onChange('timezone', e.target.value)} /></Field>
          <Field label="Currency"><input className="h-9 w-full rounded-lg border px-3 text-sm outline-none focus:border-primary" value={local.currency||''} onChange={(e)=>onChange('currency', e.target.value)} /></Field>
        </div>
      </Section>

      {/* Ride */}
      <Section title="Ride Settings">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Base fare (₦)"><NumberInput value={local.ride.baseFare} onChange={(v)=>onChange('ride.baseFare', v)} /></Field>
          <Field label="Cost per km (₦)"><NumberInput value={local.ride.costPerKm} onChange={(v)=>onChange('ride.costPerKm', v)} /></Field>
          <Field label="Cost per minute (₦)"><NumberInput value={local.ride.costPerMinute||0} onChange={(v)=>onChange('ride.costPerMinute', v)} /></Field>
          <Field label="Surge enabled"><Toggle checked={!!local.ride.surgeEnabled} onChange={(v)=>onChange('ride.surgeEnabled', v)} /></Field>
          <Field label="Surge multiplier"><NumberInput value={local.ride.surgeMultiplier||1} onChange={(v)=>onChange('ride.surgeMultiplier', v)} step={0.1} /></Field>
          <Field label="Min distance (km)"><NumberInput value={local.ride.minDistanceKm||0} onChange={(v)=>onChange('ride.minDistanceKm', v)} /></Field>
          <Field label="Max distance (km)"><NumberInput value={local.ride.maxDistanceKm||0} onChange={(v)=>onChange('ride.maxDistanceKm', v)} /></Field>
          <Field label="Cancel fee (₦)"><NumberInput value={local.ride.cancelFee||0} onChange={(v)=>onChange('ride.cancelFee', v)} /></Field>
          <Field label="Waiting per minute (₦)"><NumberInput value={local.ride.waitingPerMinute||0} onChange={(v)=>onChange('ride.waitingPerMinute', v)} /></Field>
        </div>
      </Section>

      {/* Payments & Wallet */}
      <Section title="Payments & Wallet">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Commission %"><NumberInput value={local.payments?.commissionPercent||0} onChange={(v)=>onChange('payments.commissionPercent', v)} /></Field>
          <Field label="Withdrawal min (₦)"><NumberInput value={local.payments?.withdrawalMin||0} onChange={(v)=>onChange('payments.withdrawalMin', v)} /></Field>
          <Field label="Withdrawal fee (₦)"><NumberInput value={local.payments?.withdrawalFee||0} onChange={(v)=>onChange('payments.withdrawalFee', v)} /></Field>
          <Field label="Wallet top-up max (₦)"><NumberInput value={local.payments?.walletTopupMax||0} onChange={(v)=>onChange('payments.walletTopupMax', v)} /></Field>
          <Field label="Admin wallet user ID"><input className="h-9 w-full rounded-lg border px-3 text-sm outline-none focus:border-primary" value={local.payments?.adminUserId||''} onChange={(e)=>onChange('payments.adminUserId', e.target.value.trim())} placeholder="e.g. Firestore user document id" /></Field>
          <Field label="Default methods (comma-separated)"><input className="h-9 w-full rounded-lg border px-3 text-sm outline-none focus:border-primary" value={(local.payments?.defaultMethods||[]).join(', ')} onChange={(e)=>onChange('payments.defaultMethods', e.target.value.split(',').map(s=>s.trim()).filter(Boolean))} /></Field>
        </div>
      </Section>

      {/* Save */}
      <div className="mt-4 flex justify-end">
        <Button className="rounded-full" onClick={save}>Save Settings</Button>
      </div>

      {/* Guidance */}
      <Section title="Notes">
        <ul className="list-disc pl-6 text-sm text-neutral-600">
          <li>Fare estimation across the app uses Base fare + (Cost per km × distance) + (Cost per minute × duration), with optional surge.</li>
          <li>Changes apply immediately after saving.</li>
        </ul>
      </Section>
    </div>
  );
}

function Section({ title, children }:{ title: string; children: React.ReactNode }){
  return (
    <div className="mt-4 rounded-2xl border bg-white p-4">
      <div className="mb-2 text-sm font-semibold text-neutral-700">{title}</div>
      {children}
    </div>
  );
}

function Field({ label, children }:{ label: string; children: React.ReactNode }){
  return (
    <label className="block text-sm">
      <div className="mb-1 text-neutral-600">{label}</div>
      {children}
    </label>
  );
}

function NumberInput({ value, onChange, step=1 }:{ value: number; onChange: (v:number)=>void; step?: number }){
  return (
    <input type="number" className="h-9 w-full rounded-lg border px-3 text-sm outline-none focus:border-primary" value={Number(value)} step={step} onChange={(e)=>onChange(parseFloat(e.target.value || '0'))} />
  );
}

function Toggle({ checked, onChange }:{ checked: boolean; onChange:(v:boolean)=>void }){
  return (
    <button type="button" className={`h-9 w-16 rounded-full border transition ${checked?'bg-primary/10 border-primary':'bg-neutral-50'}`} onClick={()=>onChange(!checked)}>
      <div className={`m-1 h-7 w-7 rounded-full bg-white shadow transition ${checked?'translate-x-7':''}`} />
    </button>
  );
}
