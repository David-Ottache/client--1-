import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/app/Layout";
import MapView from "@/components/app/MapView";
import LocationInputs from "@/components/app/LocationInputs";
import { type VehicleId } from "@/components/app/VehicleSelector";
import { useAppStore } from "@/lib/store";
import Swal from "sweetalert2";
import { haversineKm } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function Index() {
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [vehicle] = useState<VehicleId>("go");
  const [destinationCoords, setDestinationCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [pickupCoords, setPickupCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [pickMode, setPickMode] = useState<"pickup" | "destination" | null>(
    null,
  );
  const navigate = useNavigate();
  const { setPendingTrip, user, computeFare, pendingTrip } = useAppStore();

  // seed pickup either from pendingTrip or device location
  useEffect(() => {
    if (pendingTrip?.pickupCoords) {
      setPickupCoords(pendingTrip.pickupCoords);
      setPickup(pendingTrip.pickup || "Current location");
      return;
    }
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPickupCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setPickup("Current location");
      },
      () => {},
      { enableHighAccuracy: false, timeout: 3000 },
    );
  }, [pendingTrip]);

  const distanceKm =
    pickupCoords && destinationCoords
      ? haversineKm(pickupCoords, destinationCoords)
      : null;
  const estimatedFare = distanceKm != null ? computeFare(distanceKm) : null;

  // if user picks a destination but pickup is unknown, try to fetch current location to enable estimate
  useEffect(() => {
    if (!destinationCoords || pickupCoords) return;
    if (pendingTrip?.pickupCoords) {
      setPickupCoords(pendingTrip.pickupCoords);
      if (!pickup) setPickup(pendingTrip.pickup || "Current location");
      return;
    }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPickupCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          if (!pickup) setPickup("Current location");
        },
        () => {
          /* ignore */
        },
        { enableHighAccuracy: false, timeout: 3000 },
      );
    }
  }, [destinationCoords, pickupCoords, pendingTrip, pickup]);

  // geocode destination text into coordinates
  useEffect(() => {
    if (!destination || destination.trim().length === 0) {
      setDestinationCoords(null);
      return;
    }

    let mounted = true;
    const timeout = setTimeout(async () => {
      try {
        const g = (window as any).google;
        if (!g || !g.maps || !g.maps.Geocoder) return;
        const geocoder = new g.maps.Geocoder();
        geocoder.geocode(
          { address: destination },
          (results: any, status: any) => {
            try {
              if (!mounted) return;
              if (
                status === "OK" &&
                results &&
                results[0] &&
                results[0].geometry &&
                results[0].geometry.location
              ) {
                const loc = results[0].geometry.location;
                setDestinationCoords({ lat: loc.lat(), lng: loc.lng() });
              }
            } catch (e) {}
          },
        );
      } catch (e) {}
    }, 600);

    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, [destination]);

  const handleStart = () => {
    if (!destination) {
      Swal.fire("Missing destination", "Please enter a destination", "warning");
      return;
    }
    if (!destinationCoords) {
      Swal.fire(
        "Missing destination",
        "Please tap the map to choose a destination",
        "warning",
      );
      return;
    }

    const hasPickup =
      !!pickupCoords ||
      pickup === "Current location" ||
      pickup === "Pinned location";
    if (!hasPickup && navigator.geolocation) {
      return Swal.fire({
        title: "Pickup missing",
        text: "Please allow access to your device location or pin a pickup on the map",
        icon: "warning",
        confirmButtonText: "Use Current Location",
      }).then((res) => {
        if (res.isConfirmed) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const pickup = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
              };
              setPendingTrip({
                pickup: "Current location",
                destination,
                pickupCoords: pickup,
                destinationCoords,
                vehicle,
              });
              const dist =
                pickup && destinationCoords
                  ? haversineKm(pickup, destinationCoords)
                  : null;
              const fare = dist != null ? computeFare(dist) : null;
              navigate("/user/verify", {
                state: {
                  pickup: "Current location",
                  destination,
                  pickupCoords: pickup,
                  destinationCoords,
                  distanceKm: dist,
                  fare,
                  vehicle,
                },
              });
            },
            () => {
              Swal.fire(
                "Location unavailable",
                "Unable to access current location. Please pick a location on the map.",
                "error",
              );
            },
            { enableHighAccuracy: true, timeout: 5000 },
          );
        }
      });
    }

    if (!navigator.geolocation) {
      setPendingTrip({
        pickup: "Unknown location",
        destination,
        destinationCoords,
        vehicle,
      });
      const dist =
        pickupCoords && destinationCoords
          ? haversineKm(pickupCoords, destinationCoords)
          : null;
      const fare = dist != null ? computeFare(dist) : null;
      navigate("/user/verify", {
        state: {
          pickup: "Unknown location",
          destination,
          pickupCoords,
          destinationCoords,
          distanceKm: dist,
          fare,
          vehicle,
        },
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const pickup = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPendingTrip({
          pickup: "Current location",
          destination,
          pickupCoords: pickup,
          destinationCoords,
          vehicle,
        });
        const dist =
          pickup && destinationCoords
            ? haversineKm(pickup, destinationCoords)
            : null;
        const fare = dist != null ? computeFare(dist) : null;
        navigate("/user/verify", {
          state: {
            pickup: "Current location",
            destination,
            pickupCoords: pickup,
            destinationCoords,
            distanceKm: dist,
            fare,
            vehicle,
          },
        });
      },
      () => {
        setPendingTrip({
          pickup: "Current location",
          destination,
          destinationCoords,
          vehicle,
        });
        const dist =
          pickupCoords && destinationCoords
            ? haversineKm(pickupCoords, destinationCoords)
            : null;
        const fare = dist != null ? computeFare(dist) : null;
        navigate("/user/verify", {
          state: {
            pickup: "Current location",
            destination,
            pickupCoords,
            destinationCoords,
            distanceKm: dist,
            fare,
            vehicle,
          },
        });
      },
      { enableHighAccuracy: true, timeout: 5000 },
    );
  };

  return (
    <Layout className="relative">
      <MapView
        pickupCoords={pickupCoords}
        destinationCoords={destinationCoords}
        hidePickupMarker={!pickupCoords}
        onPick={(c) => {
          if (pickMode === "pickup") {
            setPickupCoords(c);
            try {
              const g = (window as any).google;
              if (g && g.maps && g.maps.Geocoder) {
                const geocoder = new g.maps.Geocoder();
                geocoder.geocode(
                  { location: c },
                  (results: any, status: any) => {
                    try {
                      if (status === "OK" && results && results[0])
                        setPickup(
                          results[0].formatted_address || "Pinned location",
                        );
                    } catch (e) {}
                  },
                );
              } else {
                setPickup("Pinned location");
              }
            } catch (e) {
              setPickup("Pinned location");
            }
            setPickMode(null);
          } else if (pickMode === "destination") {
            setDestinationCoords(c);
            try {
              const g = (window as any).google;
              if (g && g.maps && g.maps.Geocoder) {
                const geocoder = new g.maps.Geocoder();
                geocoder.geocode(
                  { location: c },
                  (results: any, status: any) => {
                    try {
                      if (status === "OK" && results && results[0])
                        setDestination(
                          results[0].formatted_address || "Pinned location",
                        );
                    } catch (e) {}
                  },
                );
              } else {
                setDestination("Pinned location");
              }
            } catch (e) {
              setDestination("Pinned location");
            }
            setPickMode(null);
          } else {
            setDestinationCoords(c);
            setDestination("Pinned location");
          }
        }}
        pickMode={pickMode}
      />

      {user?.role !== "driver" && (
        <div className="pointer-events-none absolute inset-x-4 top-4 z-20">
          <LocationInputs
            pickup={pickup}
            destination={destination}
            setPickup={setPickup}
            setDestination={setDestination}
            onSwap={() => {
              setPickup(destination);
              setDestination(pickup);
            }}
            onPickDestination={() => setPickMode("destination")}
            onUseCurrentLocation={() => {
              if (!navigator.geolocation) {
                setPickup("Current location");
                return;
              }
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  setPickupCoords({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                  });
                  setPickup("Current location");
                },
                () => {
                  setPickup("Current location");
                },
              );
            }}
            className="pointer-events-auto"
          />
        </div>
      )}

      {user?.role !== "driver" && (
        <div className="absolute bottom-[5.5rem] left-0 right-0 z-20">
          <div className="mx-4 rounded-t-3xl border-t bg-white/95 p-4 pb-4 shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-white/75">
            <div className="mb-2 text-sm font-semibold text-neutral-600">
              Estimated Fare
            </div>
            <div className="text-2xl font-bold">
              {estimatedFare !== null
                ? `₦${estimatedFare.toLocaleString()}`
                : "Enter destination to see estimate"}
            </div>
            <Button
              className="mt-3 w-full rounded-full"
              onClick={handleStart}
              disabled={!destinationCoords}
            >
              Start Trip
            </Button>
          </div>
        </div>
      )}
    </Layout>
  );
}
