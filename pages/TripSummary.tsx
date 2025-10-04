import Layout from "@/components/app/Layout";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Swal from 'sweetalert2';

export default function TripSummary() {
  const { trip, drivers, endTrip, user } = useAppStore();
  const navigate = useNavigate();
  const driver = drivers.find(d=>d.id===trip?.driverId) || drivers[0];

  return (
    <Layout>
      <div className="px-4 pt-6">
        <div className="flex items-center gap-3">
          <img src={driver.avatar} className="h-16 w-16 rounded-full object-cover" alt={driver.name} />
          <div>
            <div className="text-xl font-bold">{driver.name}</div>
            <div className="text-sm text-neutral-600">{driver.rides} Trips Taken • {driver.rating} Rating</div>
          </div>
        </div>
        <div className="mt-4 rounded-2xl border bg-white p-4">
          <div className="font-semibold">Trip Details</div>
          <div className="mt-2 text-sm text-neutral-700">
            {(!user || user.role !== 'driver') && (<div>Pick Up Location: {trip?.pickup || 'Federal Housing, Kuje.'}</div>)}
            {(!user || user.role !== 'driver') && (<div>Destination: {trip?.destination || 'Transcorp Hilton'}</div>)}
            {(!user || user.role !== 'driver') && (
              <div className="mt-2">Fee <span className="font-bold">N{trip?.fee ?? driver.price}</span></div>
            )}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button variant="destructive" className="h-12 rounded-full" onClick={async ()=>{ const { isConfirmed, value } = await Swal.fire({ title: 'Enter trip price (₦)', input: 'number', inputLabel: 'Price', inputValue: '0', inputAttributes: { min: '0', step: '1' }, showCancelButton: true, confirmButtonText: 'End Trip' }) as any; if (!isConfirmed) return; const n = Math.round(Number(value)); if (!Number.isFinite(n) || n < 0) { await Swal.fire('Invalid amount', 'Please enter a valid non-negative number', 'warning'); return; } endTrip(n); navigate('/'); }}>End Trip</Button>
          <Button variant="outline" className="h-12 rounded-full" onClick={()=>navigate(-1)}>Back</Button>
        </div>
      </div>
    </Layout>
  );
}
