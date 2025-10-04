import { cn } from "@/lib/utils";
import TopBar from "./TopBar";
import BottomNav from "./BottomNav";
import SOS from "./SOS";
import RatingModal from "./RatingModal";
import { ReactNode } from "react";
import { useAppStore } from "@/lib/store";
import Swal from "sweetalert2";

interface Props {
  children: ReactNode;
  className?: string;
  hideTopBar?: boolean;
  hideBottomNav?: boolean;
}

export default function Layout({
  children,
  className,
  hideTopBar,
  hideBottomNav,
}: Props) {
  const { trip, endTrip } = useAppStore();
  return (
    <div className="min-h-screen w-full bg-[linear-gradient(120deg,hsl(152_60%_96%),white_40%,white)]">
      <div className="relative mx-auto min-h-screen w-full max-w-md overflow-hidden">
        {!hideTopBar && (
          <TopBar className="bg-gradient-to-b from-white/90 to-transparent backdrop-blur" />
        )}
        <main
          className={cn(
            hideTopBar ? "pt-4" : "pt-14",
            hideBottomNav ? "pb-4" : "pb-24",
            className,
          )}
        >
          {children}
        </main>
        {/* Floating End Trip button above bottom nav */}
        {trip && (
          <button
            onClick={async () => {
              try {
                const { isConfirmed, value } = (await Swal.fire({
                  title: "Enter trip price (₦)",
                  input: "number",
                  inputLabel: "Price",
                  inputValue: String(trip.fee || 0),
                  inputAttributes: { min: "0", step: "1" },
                  showCancelButton: true,
                  confirmButtonText: "End Trip",
                })) as any;
                if (!isConfirmed) return;
                const n = Math.round(Number(value));
                if (!Number.isFinite(n) || n < 0) {
                  await Swal.fire(
                    "Invalid amount",
                    "Please enter a valid non-negative number",
                    "warning",
                  );
                  return;
                }
                endTrip(n);
              } catch (e) {
                console.warn("failed ending trip", e);
              }
            }}
            className="fixed bottom-28 left-4 z-40 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-lg"
          >
            End Trip
          </button>
        )}
        {!hideBottomNav && (
          <>
            <BottomNav />
            {/* Floating SOS */}
            <SOS />
          </>
        )}
        {/* Global rating modal */}
        <RatingModal />
      </div>
    </div>
  );
}
