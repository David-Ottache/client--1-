import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { haversineKm } from "@/lib/utils";
import Swal from "sweetalert2";
import { apiFetch } from "@/lib/utils";

// Relax Gender to accept any string to avoid strict mismatches across forms
export type Gender = string;

export interface UserProfile {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  countryCode: string;
  gender: Gender;
  location: string;
  profilePhoto?: string; // data URL
  driverLicenseNumber?: string;
  driverLicensePhoto?: string; // data URL
  identificationNumber?: string;
  identificationPhoto?: string; // data URL
  vehicleType?: string;
  password?: string;
  role?: "driver" | "user" | "admin";
  // optional wallet fields used in app
  walletBalance?: number;
  wallet?: { balance?: number } | null;
}

export interface DriverInfo {
  id: string;
  name: string;
  rating: number;
  rides: number;
  etaMin: number;
  distanceKm: number;
  price: number;
  passengers: number;
  avatar: string;
  // optional fields coming from onboarding
  driverLicenseNumber?: string;
  driverLicensePhoto?: string;
  vehicleType?: string;
}

export interface TripDetails {
  id?: string;
  pickup: string;
  destination: string;
  fee: number;
  driverId: string | null;
  userId?: string | null;
  status?: "ongoing" | "completed" | "cancelled";
  startedAt?: string;
  endedAt?: string;
  vehicle?: "go" | "comfort" | "xl" | "prestige";
  distanceKm?: number;
  rating?: number;
}

export interface Coords {
  lat: number;
  lng: number;
}
export interface PendingTrip {
  pickup: string;
  destination: string;
  pickupCoords?: Coords | null;
  destinationCoords?: Coords | null;
  vehicle?: "go" | "comfort" | "xl" | "prestige";
}

export interface AppSettings {
  appName?: string;
  timezone?: string;
  currency?: string;
  ride: {
    baseFare: number;
    costPerKm: number;
    costPerMinute?: number;
    surgeEnabled?: boolean;
    surgeMultiplier?: number;
    minDistanceKm?: number;
    maxDistanceKm?: number;
    cancelFee?: number;
    waitingPerMinute?: number;
  };
  payments?: {
    defaultMethods?: string[];
    commissionPercent?: number;
    withdrawalMin?: number;
    withdrawalFee?: number;
    walletTopupMax?: number;
    adminUserId?: string;
  };
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship?: string;
}

interface StoreState {
  user: UserProfile | null;
  setUser: (u: UserProfile | null) => void;
  onboarding: Partial<UserProfile>;
  setOnboarding: (updates: Partial<UserProfile>) => void;
  drivers: DriverInfo[];
  selectedDriverId: string | null;
  selectDriver: (id: string | null) => void;
  upsertDriver: (d: Partial<DriverInfo> & { id: string }) => void;
  mergeOnboardingToDriver: (updates?: Partial<UserProfile>) => void;
  trip: TripDetails | null;
  startTrip: (t: Omit<TripDetails, "fee"> & { fee?: number }) => void;
  endTrip: (fee?: number) => void;
  pendingTrip: PendingTrip | null;
  setPendingTrip: (p: PendingTrip | null) => void;
  contacts: EmergencyContact[];
  addContact: (c: Omit<EmergencyContact, "id">) => void;
  removeContact: (id: string) => void;
  sendSOS: (message?: string) => number;
  verifyDriver: (codeOrId: string) => DriverInfo | null;
  trips: TripDetails[];
  setTrips: (t: TripDetails[]) => void;
  // rating UI
  ratingPrompt: {
    open: boolean;
    driverId?: string | null;
    tripId?: string | null;
  };
  openRatingPrompt: (driverId: string | null, tripId?: string | null) => void;
  closeRatingPrompt: () => void;
  submitRating: (driverId: string, stars: number) => void;
  // app settings
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>;
  computeFare: (distanceKm: number, durationMin?: number) => number;
}

const AppStore = createContext<StoreState | null>(null);

const MOCK_DRIVERS: DriverInfo[] = [
  {
    id: "d1",
    name: "John Doe",
    rating: 4.7,
    rides: 70,
    etaMin: 10,
    distanceKm: 7,
    price: 50,
    passengers: 2,
    avatar: "https://i.pravatar.cc/80?img=3",
  },
  {
    id: "d2",
    name: "Akondu",
    rating: 4.5,
    rides: 110,
    etaMin: 7,
    distanceKm: 7,
    price: 30,
    passengers: 1,
    avatar: "https://i.pravatar.cc/80?img=14",
  },
  {
    id: "d3",
    name: "John Doe",
    rating: 4.8,
    rides: 30,
    etaMin: 15,
    distanceKm: 12,
    price: 25,
    passengers: 1,
    avatar: "https://i.pravatar.cc/80?img=8",
  },
];

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const DEFAULT_SETTINGS: AppSettings = {
    appName: "reCab",
    timezone: "Africa/Lagos",
    currency: "NGN",
    ride: {
      baseFare: 200,
      costPerKm: 50,
      costPerMinute: 0,
      surgeEnabled: false,
      surgeMultiplier: 1,
      minDistanceKm: 0,
      maxDistanceKm: 1000,
      cancelFee: 0,
      waitingPerMinute: 0,
    },
    payments: {
      defaultMethods: ["cash", "wallet"],
      commissionPercent: 5,
      withdrawalMin: 1000,
      withdrawalFee: 0,
      walletTopupMax: 200000,
      adminUserId: "",
    },
  };
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const raw =
        localStorage.getItem("session.user") ||
        sessionStorage.getItem("session.user");
      if (!raw) return null;
      const parsed = JSON.parse(raw) as any;
      if (
        parsed &&
        (parsed.walletBalance === undefined || parsed.walletBalance === null)
      ) {
        parsed.walletBalance = 10000;
        try {
          sessionStorage.setItem("session.user", JSON.stringify(parsed));
        } catch {}
      }
      return parsed as UserProfile;
    } catch {
      return null;
    }
  });
  const [onboarding, setOnboardingState] = useState<Partial<UserProfile>>({
    countryCode: "+234",
  });
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [selectedDriverId, selectDriver] = useState<string | null>(null);
  const [trip, setTrip] = useState<TripDetails | null>(null);
  const [trips, setTrips] = useState<TripDetails[]>(() => {
    try {
      const raw = localStorage.getItem("trips.history");
      return raw ? (JSON.parse(raw) as TripDetails[]) : [];
    } catch {
      return [];
    }
  });
  const _setTrips = (updates: TripDetails[]) => setTrips(updates);
  // rating prompt state for post-trip rating
  const [ratingPrompt, setRatingPrompt] = useState<{
    open: boolean;
    driverId?: string | null;
    tripId?: string | null;
  }>({ open: false });
  const [contacts, setContacts] = useState<EmergencyContact[]>(() => {
    try {
      const raw = localStorage.getItem("safety.contacts");
      return raw ? (JSON.parse(raw) as EmergencyContact[]) : [];
    } catch {
      return [];
    }
  });
  const [pendingTrip, setPendingTrip] = useState<PendingTrip | null>(() => {
    try {
      const raw = sessionStorage.getItem("ride.pending");
      return raw ? (JSON.parse(raw) as PendingTrip) : null;
    } catch {
      return null;
    }
  });

  // persist pending trip to sessionStorage so it survives navigation/refresh and is available
  React.useEffect(() => {
    try {
      if (pendingTrip)
        sessionStorage.setItem("ride.pending", JSON.stringify(pendingTrip));
      else sessionStorage.removeItem("ride.pending");
    } catch (e) {
      /* ignore */
    }
  }, [pendingTrip]);

  const [drivers, setDrivers] = useState<DriverInfo[]>(MOCK_DRIVERS);

  // fetch settings
  React.useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch("/api/settings");
        const data = await res?.json().catch(() => null);
        if (data?.settings)
          setSettings((prev) => ({
            ...prev,
            ...data.settings,
            ride: { ...prev.ride, ...(data.settings.ride || {}) },
            payments: { ...prev.payments, ...(data.settings.payments || {}) },
          }));
      } catch {}
    })();
  }, []);

  const updateSettings: StoreState["updateSettings"] = async (partial) => {
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partial),
      }).catch(() => null);
      const data = await res?.json().catch(() => null);
      if (res && res.ok && data?.settings) {
        setSettings(data.settings);
        try {
          await Swal.fire({ icon: "success", title: "Settings saved" });
        } catch {}
      } else {
        setSettings((prev) => ({
          ...prev,
          ...partial,
          ride: { ...prev.ride, ...(partial.ride || {}) },
          payments: { ...prev.payments, ...(partial.payments || {}) },
        }));
      }
    } catch {
      setSettings((prev) => ({
        ...prev,
        ...partial,
        ride: { ...prev.ride, ...(partial.ride || {}) },
        payments: { ...prev.payments, ...(partial.payments || {}) },
      }));
    }
  };

  const computeFare: StoreState["computeFare"] = (
    distanceKm: number,
    durationMin = 0,
  ) => {
    const r = settings.ride || DEFAULT_SETTINGS.ride;
    const base = Number(r.baseFare || 0);
    const perKm = Number(r.costPerKm || 0) * Math.max(0, distanceKm || 0);
    const perMin = Number(r.costPerMinute || 0) * Math.max(0, durationMin || 0);
    let total = base + perKm + perMin;
    if (r.surgeEnabled && Number(r.surgeMultiplier || 1) > 1)
      total *= Number(r.surgeMultiplier || 1);
    return Math.round(total);
  };

  const setOnboarding = (updates: Partial<UserProfile>) =>
    setOnboardingState((prev) => ({ ...prev, ...updates }));

  const upsertDriver: StoreState["upsertDriver"] = (d) => {
    setDrivers((prev) => {
      const exists = prev.find((p) => p.id === d.id);
      if (exists) {
        return prev.map((p) =>
          p.id === d.id ? ({ ...p, ...d } as DriverInfo) : p,
        );
      }
      // fill missing fields with defaults
      const newDriver: DriverInfo = {
        id: d.id,
        name: (d.name as string) || "Unknown",
        rating: (d.rating as number) || 0,
        rides: (d.rides as number) || 0,
        etaMin: (d.etaMin as number) || 0,
        distanceKm: (d.distanceKm as number) || 0,
        price: (d.price as number) || 0,
        passengers: (d.passengers as number) || 1,
        avatar: d.avatar || "https://i.pravatar.cc/80",
      };
      return [newDriver, ...prev];
    });
  };

  const mergeOnboardingToDriver: StoreState["mergeOnboardingToDriver"] = (
    updates,
  ) => {
    const payload = updates ? updates : onboarding;
    if (!payload) return;
    if (!selectedDriverId) return;

    setDrivers((prev) =>
      prev.map((d) => {
        if (d.id !== selectedDriverId) return d;
        const nameParts = [payload.firstName ?? "", payload.lastName ?? ""]
          .map((s) => s.trim())
          .filter(Boolean);
        const newName = nameParts.length ? nameParts.join(" ") : d.name;
        const newAvatar = (payload.profilePhoto as string) || d.avatar;
        const newLicenseNumber =
          (payload.driverLicenseNumber as string) || d.driverLicenseNumber;
        const newLicensePhoto =
          (payload.driverLicensePhoto as string) || d.driverLicensePhoto;
        const newVehicleType =
          (payload.vehicleType as string) || (d as any).vehicleType;
        return {
          ...d,
          name: newName,
          avatar: newAvatar,
          driverLicenseNumber: newLicenseNumber,
          driverLicensePhoto: newLicensePhoto,
          vehicleType: newVehicleType,
        };
      }),
    );
  };

  const startTrip: StoreState["startTrip"] = ({
    pickup,
    destination,
    driverId,
    fee,
  }) => {
    const driver = drivers.find((d) => d.id === driverId) || drivers[0];
    const distanceKm =
      pendingTrip && pendingTrip.pickupCoords && pendingTrip.destinationCoords
        ? haversineKm(pendingTrip.pickupCoords, pendingTrip.destinationCoords)
        : undefined;
    const computedFee =
      typeof fee === "number"
        ? Math.max(0, Math.round(fee))
        : typeof distanceKm === "number"
          ? computeFare(distanceKm)
          : 0;
    const id = `t_${Date.now()}`;
    const startedAt = new Date().toISOString();
    const vehicle = pendingTrip?.vehicle;
    const record: TripDetails = {
      id,
      pickup,
      destination,
      fee: computedFee,
      driverId: driver.id,
      status: "ongoing",
      startedAt,
      vehicle,
      distanceKm,
    };

    // optimistic local update
    setTrip(record);
    setTrips((prev) => [record, ...prev]);

    // persist to server if user available
    (async () => {
      try {
        if (!user) return;
        const payload = {
          userId: user.id,
          pickup,
          destination,
          fee: computedFee,
          driverId: driver.id,
          vehicle,
          distanceKm,
          status: "ongoing",
          startedAt,
        };
        const res = await fetch("/api/trips", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          console.warn(
            "Failed persisting trip to server",
            await res.text().catch(() => ""),
          );
          return;
        }
        const data = await res.json().catch(() => null);
        if (data?.id) {
          // replace local temporary id with server id
          setTrips((prev) =>
            prev.map((t) => (t.id === id ? { ...t, id: data.id } : t)),
          );
          setTrip((prev) =>
            prev && prev.id === id ? { ...prev, id: data.id } : prev,
          );
        }
      } catch (e) {
        console.warn("persist trip error", e);
      }
    })();
  };

  const endTrip = (feeInput?: number) => {
    if (!trip) return;
    const endedAt = new Date().toISOString();
    const amount =
      typeof feeInput === "number" && isFinite(feeInput) && feeInput >= 0
        ? Math.round(feeInput)
        : 0;
    // update trip history
    setTrips((prev) =>
      prev.map((t) =>
        t.id === trip.id
          ? { ...t, status: "completed", endedAt, fee: amount }
          : t,
      ),
    );
    // capture driver id and trip id for rating
    const driverIdForRating = trip.driverId || null;
    const tripIdForRating = trip.id || null;
    // clear current trip
    setTrip(null);

    // rider payment choice — show rating popup only after payment flow completes
    try {
      if (user && user.role === "user" && amount > 0) {
        try {
          void Swal.fire({
            title: "Trip completed",
            text: `Total ₦${amount.toLocaleString()}`,
            icon: "info",
            showCancelButton: true,
            confirmButtonText: "Pay with wallet",
            cancelButtonText: "Pay cash",
          }).then(async (res) => {
            if (res.isConfirmed) {
              try {
                const r = await (
                  await import("@/lib/utils")
                ).apiFetch("/api/wallet/deduct", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    userId: user.id,
                    amount,
                    tripId: tripIdForRating,
                    driverId: driverIdForRating || undefined,
                    note: driverIdForRating
                      ? `driver:${driverIdForRating}`
                      : undefined,
                  }),
                });
                if (r && r.ok) {
                  try {
                    setUser({
                      ...user,
                      walletBalance: Math.max(
                        0,
                        Number(user.walletBalance ?? 0) - amount,
                      ),
                    });
                  } catch {}
                  try {
                    await (
                      await import("@/lib/utils")
                    ).apiFetch(
                      `/api/trips/${encodeURIComponent(String(tripIdForRating || ""))}/end`,
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          fee: amount,
                          paymentMethod: "wallet",
                        }),
                      },
                    );
                  } catch {}
                  try {
                    await Swal.fire({
                      icon: "success",
                      title: "Payment successful",
                      text: "Wallet charged and driver credited.",
                    });
                  } catch {}
                  if (driverIdForRating)
                    setRatingPrompt({
                      open: true,
                      driverId: driverIdForRating,
                      tripId: tripIdForRating,
                    });
                } else {
                  const localBal = Number(user.walletBalance ?? 0);
                  if (localBal >= amount) {
                    try {
                      setUser({ ...user, walletBalance: localBal - amount });
                    } catch {}
                    try {
                      await (
                        await import("@/lib/utils")
                      ).apiFetch(
                        `/api/trips/${encodeURIComponent(String(tripIdForRating || ""))}/end`,
                        {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            fee: amount,
                            paymentMethod: "wallet",
                          }),
                        },
                      );
                    } catch {}
                    // create a pending wallet request visible to both rider and driver
                    try {
                      if (driverIdForRating) {
                        await (
                          await import("@/lib/utils")
                        ).apiFetch("/api/wallet/request", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            fromId: user.id,
                            toId: driverIdForRating,
                            amount,
                            note: "wallet processing",
                            tripId: tripIdForRating,
                          }),
                        });
                      }
                    } catch {}
                    try {
                      await Swal.fire({
                        icon: "success",
                        title: "Payment processing",
                        text: "Recorded and marked as processing.",
                      });
                    } catch {}
                    if (driverIdForRating)
                      setRatingPrompt({
                        open: true,
                        driverId: driverIdForRating,
                        tripId: tripIdForRating,
                      });
                  } else {
                    try {
                      await Swal.fire({
                        icon: "error",
                        title: "Wallet payment failed",
                        text: "Please pay cash.",
                      });
                    } catch {}
                    if (driverIdForRating)
                      setRatingPrompt({
                        open: true,
                        driverId: driverIdForRating,
                        tripId: tripIdForRating,
                      });
                  }
                }
              } catch {
                try {
                  await Swal.fire({
                    icon: "error",
                    title: "Network error",
                    text: "Could not reach server. Please pay cash.",
                  });
                } catch {}
                if (driverIdForRating)
                  setRatingPrompt({
                    open: true,
                    driverId: driverIdForRating,
                    tripId: tripIdForRating,
                  });
              }
            } else {
              try {
                await (
                  await import("@/lib/utils")
                ).apiFetch(
                  `/api/trips/${encodeURIComponent(String(tripIdForRating || ""))}/end`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      fee: amount,
                      paymentMethod: "cash",
                    }),
                  },
                );
              } catch {}
              try {
                await Swal.fire({
                  icon: "info",
                  title: "Pay cash",
                  text: "Please pay cash to the driver.",
                });
              } catch {}
              if (driverIdForRating)
                setRatingPrompt({
                  open: true,
                  driverId: driverIdForRating,
                  tripId: tripIdForRating,
                });
            }
          });
        } catch {}
      } else {
        // No payment required or non-user role: directly show rating if driver exists
        if (driverIdForRating)
          setRatingPrompt({
            open: true,
            driverId: driverIdForRating,
            tripId: tripIdForRating,
          });
      }
    } catch {}

    // persist end to server in background
    (async () => {
      try {
        if (!user) return;
        const origin = window.location.origin;
        const primary = `${origin}/api/trips/${encodeURIComponent(String(tripIdForRating))}/end`;
        const fallback = `${origin}/.netlify/functions/api/trips/${encodeURIComponent(String(tripIdForRating))}/end`;
        const body = JSON.stringify({ fee: amount });
        const headers = { "Content-Type": "application/json" } as any;
        try {
          await fetch(primary, { method: "POST", headers, body }).catch(
            async () => {
              await fetch(fallback, { method: "POST", headers, body }).catch(
                () => null,
              );
            },
          );
        } catch (e) {}
      } catch (e) {}
    })();
  };

  const openRatingPrompt: StoreState["openRatingPrompt"] = (
    driverId,
    tripId,
  ) => {
    setRatingPrompt({ open: true, driverId, tripId });
  };

  const closeRatingPrompt: StoreState["closeRatingPrompt"] = () => {
    setRatingPrompt({ open: false });
  };

  const submitRating: StoreState["submitRating"] = (driverId, stars) => {
    // optimistic local update
    setDrivers((prev) =>
      prev.map((d) => {
        if (d.id !== driverId) return d;
        const prevRides = d.rides || 0;
        const prevRating = typeof d.rating === "number" ? d.rating : 0;
        const newRides = prevRides + 1;
        const newRating = (prevRating * prevRides + stars) / newRides;
        return {
          ...d,
          rides: newRides,
          rating: Math.round((newRating + Number.EPSILON) * 10) / 10,
        };
      }),
    );

    // attach rating to trip history if present
    setTrips((prev) =>
      prev.map((t) =>
        t.id === ratingPrompt.tripId ? { ...t, rating: stars } : t,
      ),
    );

    // close prompt immediately for UX
    const tripIdToClose = ratingPrompt.tripId;
    setRatingPrompt({ open: false });

    // persist to server in background
    (async () => {
      try {
        // update driver aggregates
        const res = await fetch(
          `/api/drivers/${encodeURIComponent(driverId)}/rate`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ stars }),
          },
        );
        if (!res.ok) {
          console.warn(
            "Failed posting rating to server",
            await res.text().catch(() => ""),
          );
        } else {
          const data = await res.json().catch(() => null);
          if (data && (data.rides !== undefined || data.rating !== undefined)) {
            // synchronize local driver with server computed aggregates
            setDrivers((prev) =>
              prev.map((d) =>
                d.id === driverId
                  ? {
                      ...d,
                      rides: data.rides ?? d.rides,
                      rating: data.rating ?? d.rating,
                    }
                  : d,
              ),
            );
          }
        }

        // also attach rating to trip record on server when tripId is available
        const tripId = ratingPrompt.tripId;
        if (tripId) {
          try {
            await fetch(
              `/api/trips/${encodeURIComponent(String(tripId))}/rate`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ stars }),
              },
            ).catch(() => {});
          } catch (e) {
            /* ignore */
          }
        }
      } catch (e) {
        console.warn("persist rating failed", e);
      }
    })();
  };

  const addContact: StoreState["addContact"] = (c) => {
    const id = `c_${Date.now()}`;
    // optimistic update
    setContacts((prev) => [...prev, { id, ...c }]);

    // persist to server if user available
    (async () => {
      try {
        if (!user) return;
        const origin = window.location.origin;
        const primary = `${origin}/api/users/${user.id}/contacts`;
        const fallback = `${origin}/.netlify/functions/api/users/${user.id}/contacts`;
        let res: Response | null = null;
        try {
          res = await fetch(primary, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(c),
          });
        } catch (e) {
          try {
            res = await fetch(fallback, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(c),
            });
          } catch {
            res = null;
          }
        }
        if (!res) return console.warn("Could not persist contact to server");
        if (!res.ok)
          return console.warn(
            "Server failed persisting contact",
            await res.text().catch(() => ""),
          );
        const data = await res.json().catch(() => null);
        const serverId = data?.id;
        if (serverId) {
          setContacts((prev) =>
            prev.map((item) =>
              item.id === id
                ? { id: serverId, ...(data.contact || item) }
                : item,
            ),
          );
        }
      } catch (e) {
        console.warn("addContact persistence error", e);
      }
    })();
  };
  const removeContact: StoreState["removeContact"] = (id) => {
    // optimistic
    setContacts((prev) => prev.filter((c) => c.id !== id));
    (async () => {
      try {
        if (!user) return;
        const origin = window.location.origin;
        const primary = `${origin}/api/users/${user.id}/contacts/${id}`;
        const fallback = `${origin}/.netlify/functions/api/users/${user.id}/contacts/${id}`;
        try {
          await fetch(primary, { method: "DELETE" }).catch(async () => {
            await fetch(fallback, { method: "DELETE" }).catch(() => null);
          });
        } catch (e) {
          console.warn("removeContact persistence error", e);
        }
      } catch (e) {
        console.warn("removeContact error", e);
      }
    })();
  };

  const sendSOS: StoreState["sendSOS"] = (message) => {
    const count = contacts.length;
    // Fire-and-forget async workflow so UI isn't blocked
    (async () => {
      try {
        // Gather user, trip, driver, and location
        const fullName = user
          ? `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
            user.email ||
            "Passenger"
          : "Passenger";
        // Try browser geolocation
        const coords = await new Promise<{ lat: number; lng: number } | null>(
          (resolve) => {
            try {
              navigator.geolocation.getCurrentPosition(
                (pos) =>
                  resolve({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                  }),
                () => resolve(null),
                { enableHighAccuracy: true, timeout: 3000 },
              );
            } catch {
              resolve(null);
            }
          },
        );
        const locText = coords
          ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
          : "Unavailable";

        // Determine current driver and current trip
        let driverId: string | null = null;
        let currentTripId: string | null = null;
        if (trip && trip.driverId) { driverId = trip.driverId; currentTripId = trip.id || null; }
        else {
          const ongoing = trips.find(
            (t) => t.status === "ongoing" && t.driverId,
          );
          if (ongoing) { driverId = ongoing.driverId as string; currentTripId = ongoing.id || null; }
        }
        let driverName = "Unknown";
        let driverPhone = "Unknown";
        let vehicleText = "Unknown";
        let plate = "Unknown";
        if (driverId) {
          try {
            const res = await apiFetch(
              `/api/drivers/${encodeURIComponent(driverId)}`,
            );
            const data = await res?.json().catch(() => null);
            const d = data?.driver || null;
            if (d) {
              driverName =
                `${d.firstName || ""} ${d.lastName || ""}`.trim() ||
                d.name ||
                "Unknown";
              driverPhone = d.phone || "Unknown";
              const make = (d.vehicleMake || d.vehicleBrand || "").toString();
              const model = (d.vehicleModel || "").toString();
              vehicleText =
                [make, model].filter(Boolean).join(" ").trim() || "Unknown";
              plate = (d.plateNumber || d.plate || "").toString() || "Unknown";
            }
          } catch {}
        }

        // Generate shareable live tracking link
        let trackUrl = '';
        try {
          if (currentTripId) {
            const r = await apiFetch(`/api/trips/${encodeURIComponent(String(currentTripId))}/share`, { method: 'POST' });
            const d = await r?.json().catch(()=>null);
            if (d?.url) trackUrl = d.url as string;
          }
        } catch {}

        const body =
          message && message.trim().length
            ? message
            : `🚨 EMERGENCY ALERT 🚨\n\n${fullName} has triggered an SOS alert on reCab.\n\n📍 Last Known Location: ${locText}\n🚗 Driver Details:\n- Name: ${driverName}\n- Phone: ${driverPhone}\n- Vehicle: ${vehicleText}, Plate No: ${plate}\n${trackUrl ? `\n📡 Live tracking: ${trackUrl}\n` : ''}\n⚠️ Please check on ${fullName} immediately. If in danger, contact local emergency services.\n\n— reCab Safety System`;

        // Send to each contact
        for (const c of contacts) {
          try {
            await apiFetch("/api/safety", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ to: c.phone, message: body }),
            });
          } catch {}
        }
      } catch {}
    })();

    return count;
  };

  const verifyDriver: StoreState["verifyDriver"] = (codeOrId) => {
    if (!codeOrId) return null;
    const normalized = codeOrId.trim();
    const matchId = normalized.match(/d\d+/i)?.[0]?.toLowerCase();
    const id = matchId || normalized.toLowerCase();
    const found = drivers.find((d) => d.id.toLowerCase() === id);
    return found || null;
  };

  React.useEffect(() => {
    try {
      localStorage.setItem("safety.contacts", JSON.stringify(contacts));
    } catch {}
  }, [contacts]);

  React.useEffect(() => {
    try {
      if (pendingTrip)
        sessionStorage.setItem("ride.pending", JSON.stringify(pendingTrip));
      else sessionStorage.removeItem("ride.pending");
    } catch {}
  }, [pendingTrip]);

  React.useEffect(() => {
    try {
      localStorage.setItem("trips.history", JSON.stringify(trips));
    } catch {}
  }, [trips]);

  // persist session user
  React.useEffect(() => {
    try {
      if (user) sessionStorage.setItem("session.user", JSON.stringify(user));
      else sessionStorage.removeItem("session.user");
      const remember = localStorage.getItem("session.remember") === "1";
      if (remember && user)
        localStorage.setItem("session.user", JSON.stringify(user));
      else if (!remember) localStorage.removeItem("session.user");
    } catch {}
  }, [user]);

  // fetch contacts from server when user is present
  React.useEffect(() => {
    (async () => {
      try {
        if (!user) return;
        const origin = window.location.origin;
        const primary = `${origin}/api/users/${user.id}/contacts`;
        const fallback = `${origin}/.netlify/functions/api/users/${user.id}/contacts`;
        let res: Response | null = null;
        try {
          res = await fetch(primary);
        } catch (e) {
          try {
            res = await fetch(fallback);
          } catch {
            res = null;
          }
        }
        if (!res || !res.ok) return;
        const data = await res.json().catch(() => null);
        if (data?.contacts) {
          setContacts(
            data.contacts.map((c: any) => ({
              id: c.id,
              name: c.name,
              phone: c.phone,
              relationship: c.relationship,
            })) as EmergencyContact[],
          );
        }
      } catch (e) {
        console.warn("Failed fetching contacts for user", e);
      }
    })();
  }, [user]);

  // Driver: while a trip is ongoing, send GPS updates periodically
  React.useEffect(() => {
    let watchId: number | null = null;
    let lastSent = 0;
    const send = async (lat: number, lng: number, speed?: number) => {
      try {
        if (!trip || !trip.id) return;
        const now = Date.now();
        if (now - lastSent < 2500) return; // throttle
        lastSent = now;
        await apiFetch(`/api/trips/${encodeURIComponent(String(trip.id))}/loc`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat, lng, speed: speed || 0 })
        });
      } catch {}
    };
    if (user && user.role === 'driver' && trip && trip.id) {
      try {
        if ('geolocation' in navigator) {
          watchId = navigator.geolocation.watchPosition((pos)=>{
            send(pos.coords.latitude, pos.coords.longitude, pos.coords.speed || 0);
          }, ()=>{}, { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 });
        }
      } catch {}
    }
    return () => { try { if (watchId != null) navigator.geolocation.clearWatch(watchId); } catch {} };
  }, [user?.role, trip?.id]);

  const value: StoreState = {
    user,
    setUser,
    onboarding,
    setOnboarding,
    drivers,
    selectedDriverId,
    selectDriver,
    upsertDriver,
    mergeOnboardingToDriver,
    trip,
    startTrip,
    endTrip,
    pendingTrip,
    setPendingTrip,
    contacts,
    addContact,
    removeContact,
    sendSOS,
    verifyDriver,
    trips,
    setTrips: _setTrips,
    ratingPrompt,
    openRatingPrompt,
    closeRatingPrompt,
    submitRating,
    settings,
    updateSettings,
    computeFare,
  };

  return <AppStore.Provider value={value}>{children}</AppStore.Provider>;
}

// Safe fallback store to avoid crashes during transient HMR/mount timing when Provider isn't yet attached
const __FALLBACK_STORE__: StoreState = {
  user: null,
  setUser: () => {},
  onboarding: { countryCode: '+234' },
  setOnboarding: () => {},
  drivers: [],
  selectedDriverId: null,
  selectDriver: () => {},
  upsertDriver: () => {},
  mergeOnboardingToDriver: () => {},
  trip: null,
  startTrip: () => {},
  endTrip: () => {},
  pendingTrip: null,
  setPendingTrip: () => {},
  contacts: [],
  addContact: () => {},
  removeContact: () => {},
  sendSOS: () => 0,
  verifyDriver: () => null,
  trips: [],
  setTrips: () => {},
  ratingPrompt: { open: false },
  openRatingPrompt: () => {},
  closeRatingPrompt: () => {},
  submitRating: () => {},
  settings: { appName: 'reCab', timezone: 'Africa/Lagos', currency: 'NGN', ride: { baseFare: 200, costPerKm: 50 }, payments: { defaultMethods: ['cash','wallet'], commissionPercent: 5, walletTopupMax: 200000, withdrawalMin: 1000, withdrawalFee: 0, adminUserId: '' } },
  updateSettings: async () => {},
  computeFare: (km: number) => Math.round(200 + 50 * Math.max(0, km || 0)),
};

export function useAppStore() {
  const ctx = useContext(AppStore);
  return ctx || __FALLBACK_STORE__;
}
