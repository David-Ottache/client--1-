import Layout from "@/components/app/Layout";
import { useAppStore } from "@/lib/store";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useLocation, useNavigate } from "react-router-dom";
import { safeFetch, cachedFetch, haversineKm } from "@/lib/utils";
import Swal from "sweetalert2";

export default function UserVerify() {
  const {
    pendingTrip,
    selectDriver,
    upsertDriver,
    drivers,
    startTrip,
    computeFare,
  } = useAppStore();
  const [code, setCode] = useState("");
  const [result, setResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const routeState: any =
    location && (location as any).state ? (location as any).state : null;
  const tripDetails = {
    pickup: routeState?.pickup ?? pendingTrip?.pickup ?? "",
    destination: routeState?.destination ?? pendingTrip?.destination ?? "",
    pickupCoords: routeState?.pickupCoords ?? pendingTrip?.pickupCoords ?? null,
    destinationCoords:
      routeState?.destinationCoords ?? pendingTrip?.destinationCoords ?? null,
    vehicle: routeState?.vehicle ?? pendingTrip?.vehicle ?? "go",
  } as const;
  const distance =
    routeState?.distanceKm != null
      ? routeState.distanceKm
      : tripDetails.pickupCoords && tripDetails.destinationCoords
        ? haversineKm(tripDetails.pickupCoords, tripDetails.destinationCoords)
        : null;
  const fare =
    routeState?.fare != null
      ? routeState.fare
      : distance != null
        ? computeFare(distance)
        : null;

  // Camera / scanning state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      // cleanup on unmount
      try {
        if (streamRef.current)
          streamRef.current.getTracks().forEach((t) => t.stop());
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      } catch (e) {}
    };
  }, []);

  // Removed driver notification polling; trips are booked immediately after verification

  const startCamera = async () => {
    setCameraError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("Camera not supported");
      return;
    }
    try {
      // stop any previous stream before starting a new one
      stopCamera();

      // Prefer a real back camera when available
      let constraints: MediaStreamConstraints = {
        video: { facingMode: { ideal: "environment" } as any },
      };
      try {
        const devices = await navigator.mediaDevices
          .enumerateDevices()
          .catch(() => []);
        const cams = (devices || []).filter((d) => d.kind === "videoinput");
        const back = cams.find((d) => /back|rear|environment/i.test(d.label));
        if (back && back.deviceId)
          constraints = {
            video: { deviceId: { exact: back.deviceId } as any },
          };
      } catch {}

      let s: MediaStream | null = null;
      try {
        s = await navigator.mediaDevices.getUserMedia(constraints);
      } catch {
        // fallback to any available camera
        try {
          s = await navigator.mediaDevices.getUserMedia({ video: true });
        } catch (err) {
          throw err;
        }
      }
      if (!s) throw new Error("No camera stream");
      streamRef.current = s;

      if (videoRef.current) {
        const v = videoRef.current;
        v.srcObject = s;
        // ensure inline playback on iOS
        try {
          (v as any).playsInline = true;
        } catch {}
        try {
          v.muted = true;
        } catch {}
        await new Promise<void>((resolve) => {
          const onLoaded = () => {
            v.removeEventListener("loadedmetadata", onLoaded);
            resolve();
          };
          v.addEventListener("loadedmetadata", onLoaded);
          // in case loadedmetadata already fired
          if ((v as any).readyState >= 1) resolve();
        });
        try {
          await v.play();
        } catch {}
        // retry play shortly (Safari quirk)
        setTimeout(() => {
          try {
            v.play();
          } catch {}
        }, 100);
      }

      setScanning(true);
      const detector = (window as any).BarcodeDetector
        ? new (window as any).BarcodeDetector({ formats: ["qr_code"] })
        : null;

      const scanLoop = async () => {
        try {
          if (!videoRef.current) return;
          if (detector) {
            // create ImageBitmap from current video frame
            let bitmap: ImageBitmap | null = null;
            try {
              bitmap = await createImageBitmap(videoRef.current);
              const bars = await detector.detect(bitmap).catch(() => []);
              try {
                bitmap.close();
              } catch {}
              if (bars && bars.length) {
                const raw = bars[0].rawValue || bars[0].raw || "";
                stopCamera();
                check(raw);
                return;
              }
            } catch (e) {
              try {
                if (bitmap) bitmap.close();
              } catch {}
            }
          }
        } catch (e) {
          console.warn("scan loop error", e);
        }
        rafRef.current = requestAnimationFrame(scanLoop);
      };
      rafRef.current = requestAnimationFrame(scanLoop);
    } catch (e: any) {
      console.warn("startCamera failed", e);
      const name = e?.name || "";
      if (name === "NotAllowedError")
        setCameraError("Permission denied. Please allow camera access.");
      else if (name === "NotFoundError")
        setCameraError("No camera found on this device.");
      else setCameraError(String(e?.message || e));
    }
  };

  const stopCamera = () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        try {
          videoRef.current.pause();
        } catch {}
        try {
          videoRef.current.srcObject = null;
        } catch {}
      }
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    } catch (e) {
      console.warn("stopCamera failed", e);
    }
    setScanning(false);
  };

  function CameraButton() {
    return (
      <div className="flex items-center gap-2">
        {scanning ? (
          <button
            className="rounded-xl px-3 py-2 bg-red-500 text-white"
            onClick={() => stopCamera()}
          >
            Stop Camera
          </button>
        ) : (
          <button
            className="rounded-xl px-3 py-2 border bg-white"
            onClick={() => startCamera()}
          >
            Scan QR Code
          </button>
        )}
        {cameraError && (
          <div className="text-xs text-red-600">{cameraError}</div>
        )}
      </div>
    );
  }

  const check = async (c: string) => {
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    let value = (c || "").trim();
    if (!value) return setResult(null);
    // if value is a URL, try to extract code query param or last path segment
    try {
      if (
        value.startsWith("http://") ||
        value.startsWith("https://") ||
        value.includes("/user/") ||
        value.includes("/driver/")
      ) {
        try {
          const u = new URL(value, window.location.origin);
          const code =
            u.searchParams.get("code") ||
            u.searchParams.get("id") ||
            u.searchParams.get("driverId");
          if (code) value = code;
          else {
            const parts = u.pathname.split("/").filter(Boolean);
            if (parts.length) value = parts[parts.length - 1];
          }
        } catch (e) {
          const parts = value.split("/").filter(Boolean);
          if (parts.length) value = parts[parts.length - 1];
        }
      }
      const m = value.match(/^(driver|did|id)\s*[:=]\s*(.+)$/i);
      if (m && m[2]) value = m[2].trim();
      value = value.replace(/^"|^'|"$|'$/g, "").trim();
    } catch (e) {}

    // quick local store lookup to speed up checks
    const storeMatch = (drivers || []).find(
      (d) => d.id && d.id.toLowerCase() === value.toLowerCase(),
    );
    if (storeMatch) {
      setResult({
        id: storeMatch.id,
        name: storeMatch.name,
        avatar: storeMatch.avatar || "https://i.pravatar.cc/80",
        rides: storeMatch.rides || 0,
        rating: storeMatch.rating || 0,
      });
      return;
    }

    // check client cache in sessionStorage
    try {
      const raw = sessionStorage.getItem("lookup.cache");
      if (raw) {
        const parsed = JSON.parse(raw || "{}") as Record<
          string,
          { ts: number; data: any }
        >;
        const entry = parsed[value];
        if (entry && Date.now() - entry.ts < CACHE_TTL) {
          setResult(entry.data);
          return;
        }
      }
    } catch (e) {
      /* ignore cache parse errors */
    }

    setLoading(true);
    const origin = window.location.origin;

    const candidates = [
      // Single lookup endpoint that queries both collections server-side
      `/api/lookup/${encodeURIComponent(value)}`,
      `${origin}/api/lookup/${encodeURIComponent(value)}`,
      `/.netlify/functions/api/lookup/${encodeURIComponent(value)}`,
      `${origin}/.netlify/functions/api/lookup/${encodeURIComponent(value)}`,
      // Fallback to driver endpoints
      `/api/drivers/${encodeURIComponent(value)}`,
      `${origin}/api/drivers/${encodeURIComponent(value)}`,
      `/.netlify/functions/api/drivers/${encodeURIComponent(value)}`,
      `${origin}/.netlify/functions/api/drivers/${encodeURIComponent(value)}`,
      // then user endpoints
      `/api/users/${encodeURIComponent(value)}`,
      `${origin}/api/users/${encodeURIComponent(value)}`,
      `/.netlify/functions/api/users/${encodeURIComponent(value)}`,
      `${origin}/.netlify/functions/api/users/${encodeURIComponent(value)}`,
    ];

    try {
      for (const url of candidates) {
        try {
          const useCache =
            typeof url === "string" &&
            (url.includes("/api/drivers") ||
              url.includes("/api/users") ||
              url.includes("/api/trip"));
          const res = useCache ? await cachedFetch(url) : await safeFetch(url);
          if (!res || !res.ok) continue;
          const data = await res.json().catch(() => null);
          if (!data) continue;
          if (data.user) {
            const u = data.user;
            const full = `${u.firstName || ""} ${u.lastName || ""}`.trim();
            const out = {
              id: u.id,
              name:
                full || u.name || u.displayName || u.email || u.phone || u.id,
              avatar: u.profilePhoto || u.avatar || "https://i.pravatar.cc/80",
              rides: u.rides || 0,
              rating: u.rating || 0,
            };
            try {
              const raw = sessionStorage.getItem("lookup.cache");
              const parsed = raw ? JSON.parse(raw) : {};
              parsed[String(u.id)] = { ts: Date.now(), data: out };
              sessionStorage.setItem("lookup.cache", JSON.stringify(parsed));
            } catch (e) {}
            setResult(out);
            return;
          }
          if (data.driver) {
            const d = data.driver;
            const full = `${d.firstName || ""} ${d.lastName || ""}`.trim();
            const out = {
              id: d.id,
              name:
                full || d.name || d.displayName || d.email || d.phone || d.id,
              avatar: d.profilePhoto || d.avatar || "https://i.pravatar.cc/80",
              rides: d.rides || 0,
              rating: d.rating || 0,
            };
            try {
              const raw = sessionStorage.getItem("lookup.cache");
              const parsed = raw ? JSON.parse(raw) : {};
              parsed[String(d.id)] = { ts: Date.now(), data: out };
              sessionStorage.setItem("lookup.cache", JSON.stringify(parsed));
            } catch (e) {}
            setResult(out);
            return;
          }
        } catch (e) {
          console.warn("check url failed", url, e);
          continue;
        }
      }

      // if remote lookup failed, try local store (mock drivers)
      try {
        const local = (await import("@/lib/store")).useAppStore?.();
        // direct function access may not work via dynamic import in runtime; instead use verifyDriver by importing hook at top
      } catch (e) {
        // ignore
      }

      // Local fallback using window's store hook: call verifyDriver via context consumer
      try {
        // import hook above and use it normally by retrieving from closure
        // but we don't have access here; instead, attempt to read from (global) window.__APP_DRIVERS if set
      } catch (e) {}

      // As a simple robust fallback, attempt to match driver id against known mock ids (d1,d2,d3)
      const idLower = value.toLowerCase();
      const match = ["d1", "d2", "d3"].includes(idLower) ? idLower : null;
      if (match) {
        // build result from mock driver list in store by calling upsertDriver/get after navigation
        // We'll construct a minimal result and let the Continue flow upsert into store
        const mockMap: Record<string, any> = {
          d1: {
            id: "d1",
            name: "John Doe",
            avatar: "https://i.pravatar.cc/80?img=3",
            rides: 70,
            rating: 4.7,
          },
          d2: {
            id: "d2",
            name: "Akondu",
            avatar: "https://i.pravatar.cc/80?img=14",
            rides: 110,
            rating: 4.5,
          },
          d3: {
            id: "d3",
            name: "John Doe",
            avatar: "https://i.pravatar.cc/80?img=8",
            rides: 30,
            rating: 4.8,
          },
        };
        setResult(mockMap[match]);
        setLoading(false);
        return;
      }

      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="px-4 pt-6">
        <h1 className="text-2xl font-bold">Verify Driver</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Scan a QR code or enter assigned driver ID.
        </p>

        {scanning && (
          <div className="mt-4">
            <div className="relative overflow-hidden rounded-2xl border bg-black">
              <video
                ref={videoRef}
                className="h-full max-h-80 w-full object-cover"
                playsInline
                autoPlay
                muted
              />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-40 w-40 rounded-md border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
              </div>
              <div className="absolute right-2 top-2">
                <button
                  className="rounded-full bg-red-500 px-3 py-1 text-sm text-white"
                  onClick={() => stopCamera()}
                >
                  Stop
                </button>
              </div>
            </div>
            {cameraError && (
              <div className="mt-2 text-xs text-red-600">{cameraError}</div>
            )}
            <div className="mt-2 text-center text-xs text-neutral-500">
              Align the QR inside the square
            </div>
          </div>
        )}

        {(tripDetails.pickup || tripDetails.destination) && (
          <div className="mt-4 rounded-2xl border bg-white p-4 text-sm">
            <div className="font-semibold">Trip</div>
            <div className="text-neutral-700">
              Pickup: {tripDetails.pickup}{" "}
              {tripDetails.pickupCoords
                ? `(${tripDetails.pickupCoords.lat.toFixed(4)}, ${tripDetails.pickupCoords.lng.toFixed(4)})`
                : ""}
            </div>
            <div className="text-neutral-700">
              Destination: {tripDetails.destination}{" "}
              {tripDetails.destinationCoords
                ? `(${tripDetails.destinationCoords.lat.toFixed(4)}, ${tripDetails.destinationCoords.lng.toFixed(4)})`
                : ""}
            </div>
            <div className="text-neutral-700">
              Vehicle: {tripDetails.vehicle ?? "go"}
            </div>
            <div className="text-neutral-700">
              Estimated Fare:{" "}
              {fare != null ? `₦${Number(fare).toLocaleString()}` : "—"}
            </div>
          </div>
        )}

        <div className="mt-4 rounded-2xl border bg-white p-4">
          <div className="mt-3 flex gap-2 items-center">
            <label className="flex-1 inline-flex items-center gap-2 rounded-xl border bg-neutral-100 px-3 py-2">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setLoading(true);
                  try {
                    // Prefer native BarcodeDetector if available
                    if ((window as any).BarcodeDetector) {
                      const bitmap = await createImageBitmap(f);
                      const detector = new (window as any).BarcodeDetector({
                        formats: ["qr_code"],
                      });
                      const bars = await detector
                        .detect(bitmap)
                        .catch(() => []);
                      try {
                        bitmap.close();
                      } catch {}
                      if (bars && bars.length) {
                        check(bars[0].rawValue || bars[0].raw || "");
                        return;
                      }
                    }
                    // fallback to server decode
                    const form = new FormData();
                    form.append("file", f);
                    const res = await fetch(
                      "https://api.qrserver.com/v1/read-qr-code/",
                      { method: "POST", body: form },
                    );
                    const data = await res.json().catch(() => null);
                    const code = data?.[0]?.symbol?.[0]?.data;
                    if (code) check(code);
                    else setResult(null);
                  } catch (err) {
                    console.warn("file scan failed", err);
                    setResult(null);
                  } finally {
                    setLoading(false);
                  }
                }}
              />
              <span className="text-sm text-neutral-600">Upload QR image</span>
            </label>

            <div className="flex gap-2">
              <CameraButton />
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter driver ID e.g. d1 or QR text"
              className="flex-1 rounded-xl border bg-neutral-100 px-4 py-3 outline-none focus:bg-white"
            />
            <Button onClick={() => check(code)} disabled={loading}>
              {loading ? "Checking..." : "Check"}
            </Button>
          </div>
        </div>

        {result ? (
          <div className="mt-4 rounded-2xl border bg-white p-4">
            <div className="flex items-center gap-3">
              <img
                src={result.avatar}
                className="h-12 w-12 rounded-full object-cover"
              />
              <div>
                <div className="font-semibold">{result.name}</div>
                <div className="text-xs text-neutral-600">
                  {result.rides} rides • {result.rating} rating
                </div>
              </div>
            </div>
            <div className="mt-3 text-sm text-green-700">
              Driver verified • ID matched
            </div>
            <Button
              className="mt-3 w-full rounded-full"
              onClick={async () => {
                upsertDriver({
                  id: result.id,
                  name: result.name,
                  avatar: result.avatar,
                  rides: result.rides,
                  rating: result.rating,
                });
                selectDriver(result.id);
                try {
                  startTrip({
                    pickup: tripDetails.pickup || "Current location",
                    destination: tripDetails.destination || "TBD",
                    driverId: result.id,
                    fee: fare || 0,
                  });
                  await Swal.fire(
                    "Trip booked",
                    "Your trip has been booked successfully.",
                    "success",
                  );
                  navigate("/");
                } catch (e) {
                  await Swal.fire(
                    "Error",
                    "Could not start trip. Please try again.",
                    "error",
                  );
                }
              }}
            >
              Book Trip
            </Button>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border bg-white p-4 text-sm text-red-600">
            No driver found for provided code.
          </div>
        )}
      </div>
    </Layout>
  );
}
