import Layout from "@/components/app/Layout";
import { Button } from "@/components/ui/button";
import { useNavigate, Link } from "react-router-dom";
import { useAppStore } from "@/lib/store";
import { useState } from "react";

export default function PersonalDetails() {
  const { onboarding, setOnboarding, mergeOnboardingToDriver } = useAppStore();
  const [first, setFirst] = useState(onboarding.firstName || "");
  const [last, setLast] = useState(onboarding.lastName || "");
  const [gender, setGender] = useState<import("@/lib/store").Gender>(onboarding.gender || "");
  const [location, setLocation] = useState(onboarding.location || "");
  const nav = useNavigate();

  return (
    <Layout hideTopBar hideBottomNav>
      <div className="mx-4 mt-4 rounded-3xl bg-white p-6 shadow-soft">
        <h1 className="text-3xl font-extrabold">Personal Details</h1>
        <p className="mt-1 text-sm text-neutral-600">Your Details Are Safe With Us, Only Your First Name And Vehicle Info Are Shared With Clients.</p>
        <div className="mt-6 space-y-3">
          <input value={first} onChange={(e)=>setFirst(e.target.value)} placeholder="First Name" className="w-full rounded-xl border bg-neutral-100 px-4 py-3 outline-none focus:bg-white" />
          <input value={last} onChange={(e)=>setLast(e.target.value)} placeholder="Last Name" className="w-full rounded-xl border bg-neutral-100 px-4 py-3 outline-none focus:bg-white" />
          <select value={gender as string} onChange={(e)=>setGender(e.target.value as any)} className="w-full rounded-xl border bg-neutral-100 px-4 py-3 outline-none focus:bg-white">
            <option value="">Gender</option>
            <option>Male</option>
            <option>Female</option>
            <option>Other</option>
          </select>
          <input value={location} onChange={(e)=>setLocation(e.target.value)} placeholder="Location" className="w-full rounded-xl border bg-neutral-100 px-4 py-3 outline-none focus:bg-white" />
          <Button className="h-12 w-full rounded-full" onClick={()=>{ const updates = { firstName: first, lastName: last, gender, location }; setOnboarding(updates); mergeOnboardingToDriver(updates); nav("/register/documents"); }}>Next</Button>
          <div className="text-center text-sm">Already Have An Account? <Link to="/login" className="font-semibold">Sign In</Link></div>
        </div>
      </div>
    </Layout>
  );
}
