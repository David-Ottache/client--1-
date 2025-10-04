import { cn } from "@/lib/utils";

export type VehicleId = "go" | "comfort" | "xl" | "prestige";

export const RATES_PER_KM: Record<VehicleId, number> = { go: 200, comfort: 400, xl: 600, prestige: 800 };

export function computeFare(distanceKm: number | null | undefined, vehicleId: VehicleId) {
  const d = Number(distanceKm ?? 0) || 0;
  const rate = RATES_PER_KM[vehicleId] ?? 200;
  const raw = Math.round(rate * d);
  // Ensure minimum fare equals the per-km rate (charge at least 1 km)
  const minFare = Math.max(1, Math.round(rate * 1));
  return Math.max(minFare, raw);
}

interface Props {
  selected: VehicleId;
  onSelect: (id: VehicleId) => void;
  distanceKm?: number | null;
}

export default function VehicleSelector({ selected, onSelect, distanceKm }: Props) {
  const distance = Number(distanceKm ?? 0);
  return (
    <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 pt-1">
      {(Object.keys(RATES_PER_KM) as VehicleId[]).map((id) => {
        const active = selected === id;
        const price = computeFare(distance, id);
        return (
          <button
            key={id}
            onClick={() => onSelect(id)}
            className={cn(
              "min-w-[140px] flex-1 rounded-2xl border p-3 text-left shadow-sm",
              active
                ? "border-primary bg-primary/5"
                : "border-neutral-200 bg-white hover:bg-neutral-50",
            )}
          >
            <div className="flex items-center justify-between text-sm">
              <div className="font-semibold">{id === 'go' ? 'Go' : id === 'comfort' ? 'Comfort' : id === 'xl' ? 'XL' : 'Prestige'}</div>
              <div className="text-xs text-neutral-500">{id === 'go' ? '3 min' : id === 'comfort' ? '5 min' : id === 'xl' ? '6 min' : '8 min'}</div>
            </div>
            <div className="mt-2 flex items-end justify-between">
              <div className="text-2xl font-bold">N{price}</div>
              <div className="h-10 w-14 rounded bg-gradient-to-br from-primary/20 to-primary/40" />
            </div>
          </button>
        );
      })}
    </div>
  );
}
