import { cn } from "@/lib/utils";
import { MapPin, Dot, LocateFixed, ArrowUpDown } from "lucide-react";

interface Props {
  pickup: string;
  destination: string;
  setPickup: (v: string) => void;
  setDestination: (v: string) => void;
  onSwap: () => void;
  className?: string;
  onPickPickup?: () => void;
  onPickDestination?: () => void;
  onUseCurrentLocation?: () => void;
}

export default function LocationInputs({
  pickup,
  destination,
  setPickup,
  setDestination,
  onSwap,
  className,
  onPickPickup,
  onPickDestination,
  onUseCurrentLocation,
}: Props) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-white p-3 shadow-lg ring-1 ring-black/5",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center pt-1 text-primary">
          <Dot className="h-5 w-5 -translate-y-1" />
          <div className="h-5 w-[2px] rounded bg-neutral-300" />
          <MapPin className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <input
            value={pickup}
            onChange={(e) => setPickup(e.target.value)}
            placeholder="Pickup location"
            className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-primary focus:bg-white"
          />
          <div className="h-2" />
          <input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Destination"
            className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-primary focus:bg-white"
          />
        </div>
        <div className="flex flex-col items-center gap-2 pl-2">
          <button
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border bg-white text-neutral-700 hover:text-primary"
            onClick={onSwap}
            aria-label="Swap pickup and destination"
          >
            <ArrowUpDown className="h-4 w-4" />
          </button>

          {onPickPickup && (
            <button
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border bg-white text-neutral-700 hover:text-primary"
              onClick={() => { if (onPickPickup) onPickPickup(); }}
              title="Pick pickup on map"
              aria-label="Pick pickup on map"
            >
              <MapPin className="h-4 w-4" />
            </button>
          )}

          {onPickDestination && (
            <button
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border bg-white text-neutral-700 hover:text-primary"
              onClick={() => { if (onPickDestination) onPickDestination(); }}
              title="Pick destination on map"
              aria-label="Pick destination on map"
            >
              <MapPin className="h-4 w-4" />
            </button>
          )}

          <button
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border bg-white text-neutral-700 hover:text-primary"
            onClick={() => { if (onUseCurrentLocation) onUseCurrentLocation(); else setPickup("Current location"); }}
            aria-label="Use current location"
          >
            <LocateFixed className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
