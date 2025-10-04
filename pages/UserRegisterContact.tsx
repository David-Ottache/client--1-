import Layout from "@/components/app/Layout";
import { Button } from "@/components/ui/button";
import { useNavigate, Link } from "react-router-dom";
import { useAppStore } from "@/lib/store";
import { useState } from "react";
import Swal from 'sweetalert2';

export default function UserRegisterContact() {
  const { onboarding, setOnboarding } = useAppStore();
  const [email, setEmail] = useState(onboarding.email || "");
  const [phone, setPhone] = useState(onboarding.phone || "");
  const [agree, setAgree] = useState(false);
  const nav = useNavigate();

  const continueToDetails = () => {
    if (!email || !email.trim()) return Swal.fire('Missing field', 'Please enter your email address', 'warning');
    if (!phone || !phone.trim()) return Swal.fire('Missing field', 'Please enter your mobile number', 'warning');
    if (!agree) return Swal.fire('Agreement required', 'You must agree to the terms to continue', 'warning');
    setOnboarding({ email, phone });
    nav("/user/register/details");
  };

  return (
    <Layout hideTopBar hideBottomNav>
      <div className="mx-4 mt-4 rounded-3xl bg-white p-6 shadow-soft">
        <h1 className="text-3xl font-extrabold leading-tight">Join reCab</h1>
        <p className="mt-1 text-sm text-neutral-600">Your Contact Information And Location</p>
        <div className="mt-6 space-y-3">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter Email Address"
            className="w-full rounded-xl border bg-neutral-100 px-4 py-3 outline-none focus:bg-white"
          />
          <div className="flex gap-2">
            <select
              className="w-28 rounded-xl border bg-neutral-100 px-3 py-3 outline-none focus:bg-white"
              defaultValue={onboarding.countryCode || "+234"}
              onChange={(e) => setOnboarding({ countryCode: e.target.value })}
            >
              <option value={"+234"}>+234</option>
              <option value={"+1"}>+1</option>
              <option value={"+44"}>+44</option>
            </select>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Mobile Number"
              className="flex-1 rounded-xl border bg-neutral-100 px-4 py-3 outline-none focus:bg-white"
            />
          </div>
          <label className="flex items-start gap-2 text-xs text-neutral-600">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              className="mt-1"
            />{" "}
            By Logging In, You Agree To Our (Terms Of Service) And (Privacy
            Policy). We May Collect And Use Your Data To Improve Your
            Experience, Provide Personalized Content, And Ensure Security.
            Continued Use Of The App Constitutes Acceptance Of Any Updates To
            These Terms.
          </label>
          <Button
            className="h-12 w-full rounded-full"
            disabled={!agree}
            onClick={continueToDetails}
          >
            Continue
          </Button>
          <div className="text-center text-sm">
            Already Have An Account? {" "}
            <Link to="/login" className="font-semibold">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
