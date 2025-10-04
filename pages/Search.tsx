import Layout from "@/components/app/Layout";
import MapView from "@/components/app/MapView";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { Link, useNavigate } from "react-router-dom";

export default function Search() {
  const { drivers, selectedDriverId, selectDriver } = useAppStore();
  const navigate = useNavigate();

  return (
    <Layout className="relative">
      <MapView />
      <div className="absolute bottom-[5.5rem] left-0 right-0 z-20 px-4">
        <div className="rounded-t-3xl border bg-white/95 p-3 shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-white/75">
          <div className="space-y-2">
            {drivers.map((d)=>{
              const active = selectedDriverId === d.id;
              return (
                <div key={d.id} className={`flex items-center justify-between rounded-2xl border p-3 ${active?"border-primary bg-primary/5":"bg-white"}`}>
                  <div className="flex items-center gap-3">
                    <img src={d.avatar} className="h-10 w-10 rounded-full object-cover" alt={d.name} />
                    <div>
                      <div className="font-semibold">{d.name}</div>
                      <div className="text-xs text-neutral-600">Time: {d.etaMin} Minutes • Price: ${d.price} • Distance: {d.distanceKm} Km • Passengers: {d.passengers}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant={active?"default":"secondary"} className="h-9 rounded-full px-4" onClick={()=>selectDriver(d.id)}>{active?"Selected":"Select"}</Button>
                    <Link to={`/driver/${d.id}`} className="inline-flex h-9 items-center rounded-full bg-yellow-300 px-3 font-semibold">→</Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Layout>
  );
}
