import React from "react";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";
import { cachedFetch } from "@/lib/utils";

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill={filled ? "#f59e0b" : "none"}
      stroke={filled ? "#f59e0b" : "#d1d5db"}
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 .587l3.668 7.431L23.4 9.75l-5.7 5.56L19.336 24 12 19.897 4.664 24l1.636-8.69L.6 9.75l7.732-1.732z" />
    </svg>
  );
}

export default function RatingModal() {
  const { ratingPrompt, closeRatingPrompt, submitRating, drivers } =
    useAppStore();
  const [stars, setStars] = React.useState<number>(5);
  const [fetchedDriver, setFetchedDriver] = React.useState<any>(null);

  React.useEffect(() => {
    if (ratingPrompt.open) setStars(5);
  }, [ratingPrompt.open]);

  React.useEffect(() => {
    (async () => {
      if (!ratingPrompt.open) return;
      // Prefer driver from the specific trip to avoid mismatches
      let driverId = ratingPrompt.driverId || null;
      try {
        if (ratingPrompt.tripId) {
          const tr = await cachedFetch(
            `/api/trip/${encodeURIComponent(String(ratingPrompt.tripId))}`,
          );
          if (tr && tr.ok) {
            const td = await tr.json().catch(() => null);
            const trip = td?.trip || null;
            if (trip && trip.driverId) driverId = trip.driverId;
          }
        }
      } catch {}
      if (!driverId) return;

      const local = drivers.find((d) => d.id === driverId) || null;
      if (local) {
        setFetchedDriver({
          id: local.id,
          name: local.name,
          avatar: local.avatar,
          rides: local.rides ?? 0,
          rating: local.rating ?? 0,
        });
        return;
      }
      try {
        const r = await cachedFetch(
          `/api/drivers/${encodeURIComponent(String(driverId))}`,
        );
        if (r && r.ok) {
          const d = await r.json().catch(() => null);
          const driver = d?.driver || null;
          if (driver) {
            const name =
              `${driver.firstName || ""} ${driver.lastName || ""}`.trim() ||
              driver.name ||
              "Driver";
            const avatar =
              driver.avatar ||
              driver.profilePhoto ||
              "https://i.pravatar.cc/80";
            const rides = driver.rides ?? 0;
            const rating = driver.rating ?? 0;
            const phone = driver.phone || "";
            const vehicleMake = driver.vehicleMake || driver.vehicleBrand || "";
            const vehicleModel = driver.vehicleModel || "";
            const plate = driver.plateNumber || driver.plate || "";
            const vehicleText = [vehicleMake, vehicleModel]
              .filter(Boolean)
              .join(" ")
              .trim();
            setFetchedDriver({
              id: driver.id || driverId,
              name,
              avatar,
              rides,
              rating,
              phone,
              vehicleText,
              plate,
            });
          }
        }
      } catch {}
    })();
  }, [ratingPrompt.open, ratingPrompt.tripId, ratingPrompt.driverId, drivers]);

  if (!ratingPrompt.open) return null;
  const driver =
    fetchedDriver ||
    (drivers.find((d) => d.id === ratingPrompt.driverId) as any);

  const onSubmit = () => {
    if (!ratingPrompt.driverId) return;
    submitRating(ratingPrompt.driverId, stars);
    toast.success("Thanks for rating the driver");
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
        }}
        onClick={() => closeRatingPrompt()}
      />
      <div
        style={{
          background: "white",
          borderRadius: 12,
          padding: 20,
          minWidth: 320,
          maxWidth: 420,
          zIndex: 10000,
        }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <img
            src={driver?.avatar || "https://i.pravatar.cc/80"}
            style={{ width: 56, height: 56, borderRadius: 999 }}
          />
          <div>
            <div style={{ fontWeight: 700 }}>{driver?.name || "Driver"}</div>
            <div style={{ fontSize: 12, color: "#666" }}>
              {driver?.rides ?? 0} trips • {driver?.rating ?? 0} avg
            </div>
            {driver?.phone ? (
              <div style={{ fontSize: 11, color: "#6b7280" }}>
                Phone: {driver.phone}
              </div>
            ) : null}
            {driver?.vehicleText || driver?.plate ? (
              <div style={{ fontSize: 11, color: "#6b7280" }}>
                {[
                  driver?.vehicleText,
                  driver?.plate ? `Plate: ${driver.plate}` : "",
                ]
                  .filter(Boolean)
                  .join(" • ")}
              </div>
            ) : null}
            {ratingPrompt.tripId ? (
              <div style={{ fontSize: 11, color: "#6b7280" }}>
                Trip {ratingPrompt.tripId}
              </div>
            ) : null}
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Rate your ride</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                onClick={() => setStars(s)}
                style={{
                  background: "transparent",
                  border: "none",
                  padding: 4,
                  borderRadius: 6,
                }}
                aria-label={`Rate ${s} star`}
              >
                <StarIcon filled={s <= stars} />
              </button>
            ))}
          </div>
          <div
            style={{
              marginTop: 12,
              display: "flex",
              gap: 8,
              justifyContent: "flex-end",
            }}
          >
            <button
              onClick={() => {
                closeRatingPrompt();
              }}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #ddd",
                background: "white",
              }}
            >
              Skip
            </button>
            <button
              onClick={onSubmit}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "none",
                background: "#0ea5a5",
                color: "white",
              }}
            >
              Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
