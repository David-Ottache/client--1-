import Layout from "@/components/app/Layout";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppStore } from "@/lib/store";

import Swal from "sweetalert2";

export default function Login() {
  const [role, setRole] = useState<"driver" | "user">("driver");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { setUser, setPendingTrip } = useAppStore();
  const navigate = useNavigate();
  const [remember, setRemember] = useState(false);

  const doLogin = async () => {
    try {
      const endpoint =
        role === "driver" ? "/api/drivers/login" : "/api/users/login";
      const res = await (await import("@/lib/utils")).apiFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res || !res.ok) {
        const data = await res?.json().catch(() => ({}));
        // if account exists but no password set, prompt to choose password
        if (data.error === "no_password") {
          const { value: newPassword } = (await Swal.fire({
            title: "Set a password",
            input: "password",
            inputLabel: "Please set a password for your account",
            inputPlaceholder: "Enter a password",
            inputAttributes: {
              maxlength: "50",
              autocapitalize: "off",
              autocorrect: "off",
            },
            showCancelButton: true,
          })) as any;
          if (newPassword) {
            const pwEndpoint =
              role === "driver"
                ? "/api/drivers/set-password"
                : "/api/users/set-password";
            const r = await (await import("@/lib/utils")).apiFetch(pwEndpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email, password: newPassword }),
            });
            if (r && r.ok) {
              await Swal.fire({
                icon: "success",
                title: "Password set",
                text: "You can now log in with your password.",
              });
            } else {
              const dd = await r.json().catch(() => ({}));
              await Swal.fire({
                icon: "error",
                title: "Failed",
                text: dd.error || "Could not set password",
              });
            }
          }
        } else {
          await Swal.fire({
            icon: "error",
            title: "Login failed",
            text: data.error || "Invalid credentials",
          });
        }
        return;
      }
      const data = await res.json();
      const user = data.user;
      await Swal.fire({
        icon: "success",
        title: `Welcome ${user.firstName || ""}`,
        text: "You are now logged in.",
      });
      setUser(user);
      try {
        if (remember) localStorage.setItem("session.remember", "1");
        else localStorage.removeItem("session.remember");
      } catch {}
      // If rider, prefill pickup with current location
      if (user.role === "user" && navigator.geolocation) {
        try {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
              try {
                setPendingTrip({
                  pickup: "Current location",
                  destination: "",
                  pickupCoords: c,
                  destinationCoords: null,
                  vehicle: "go",
                });
              } catch {}
            },
            () => {},
            { enableHighAccuracy: false, timeout: 3000 },
          );
        } catch {}
      }
      // navigate to appropriate home by role
      if (user.role === "driver")
        navigate(`/driver/${encodeURIComponent(String(user.id || "me"))}`);
      else if (user.role === "admin") navigate("/admin");
      else navigate("/");
    } catch (e) {
      console.error("Login error", e);
      await Swal.fire({
        icon: "error",
        title: "Login failed",
        text: "An error occurred.",
      });
    }
  };

  return (
    <Layout hideTopBar hideBottomNav>
      <div className="mx-4 mt-4 rounded-3xl bg-white p-6 shadow-soft">
        <h1 className="mb-6 text-2xl font-bold">Welcome Back</h1>
        <div className="mb-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => setRole("driver")}
            className={`rounded-xl px-3 py-2 text-sm font-semibold ${role === "driver" ? "bg-primary text-white" : "border bg-neutral-100"}`}
          >
            Driver
          </button>
          <button
            onClick={() => setRole("user")}
            className={`rounded-xl px-3 py-2 text-sm font-semibold ${role === "user" ? "bg-primary text-white" : "border bg-neutral-100"}`}
          >
            Rider
          </button>
        </div>
        <div className="space-y-3">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-xl border bg-neutral-100 px-4 py-3 outline-none focus:bg-white"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-xl border bg-neutral-100 px-4 py-3 outline-none focus:bg-white"
          />
          <div className="flex items-center justify-between text-xs text-neutral-600">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                className="rounded"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />{" "}
              Remember Me
            </label>
            <button
              type="button"
              onClick={async () => {
                await Swal.fire({
                  icon: "info",
                  title: "Password reset",
                  text: "A password reset link has been sent to your email.",
                });
              }}
              className="font-semibold"
            >
              FORGOT PASSWORD?
            </button>
          </div>
          <Button className="h-12 w-full rounded-full" onClick={doLogin}>
            Login
          </Button>
          <div className="my-3 flex items-center gap-3">
            <div className="h-px flex-1 bg-neutral-200" />
            <div className="text-xs text-neutral-500">or</div>
            <div className="h-px flex-1 bg-neutral-200" />
          </div>
          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={async () => {
                await Swal.fire({
                  icon: "info",
                  title: "Google sign-in not configured",
                  text: "Connect authentication (e.g., Supabase or Firebase Auth) to enable Google login.",
                });
              }}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm font-medium"
            >
              Continue with Google
            </button>
            <button
              onClick={async () => {
                await Swal.fire({
                  icon: "info",
                  title: "Social sign-in not configured",
                  text: "Connect an auth provider to enable social login.",
                });
              }}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm font-medium"
            >
              Continue with Facebook
            </button>
          </div>
          <div className="text-center text-sm">
            Dont Have An Account?{" "}
            <Link
              to={role === "driver" ? "/register/name" : "/user/register/name"}
              className="font-semibold"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
