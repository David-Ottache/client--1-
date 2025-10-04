import Layout from "@/components/app/Layout";
import { Button } from "@/components/ui/button";
import { useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import { useAppStore } from "@/lib/store";

export default function VehicleChoice() {
  const [choice, setChoice] = useState<"car" | "bike" | null>("car");
  const { setOnboarding, mergeOnboardingToDriver } = useAppStore();
  const nav = useNavigate();
  return (
    <Layout hideTopBar hideBottomNav>
      <div className="mx-4 mt-4 rounded-3xl bg-white p-6 shadow-soft">
        <h1 className="text-3xl font-extrabold leading-tight">Choose Your
Prefered Vehicle</h1>
        <div className="mt-6 space-y-3">
          <button className={`w-full rounded-2xl border p-4 text-left ${choice==="car"?"border-primary bg-primary/5":""}`} onClick={()=>{ setChoice("car"); setOnboarding({ vehicleType: 'car' }); mergeOnboardingToDriver({ vehicleType: 'car' }); }}>
            <div className="flex items-center justify-between">
              <div><span className="mr-2 rounded bg-primary/10 px-2 py-1 text-xs font-bold text-primary">Take Trips</span> Drive A Car</div>
              <div className="h-12 w-20 rounded bg-neutral-200" />
            </div>
          </button>
          <button className={`w-full rounded-2xl border p-4 text-left ${choice==="bike"?"border-primary bg-primary/5":""}`} onClick={()=>{ setChoice("bike"); setOnboarding({ vehicleType: 'bike' }); mergeOnboardingToDriver({ vehicleType: 'bike' }); }}>
            <div className="flex items-center justify-between">
              <div><span className="mr-2 rounded bg-neutral-900/5 px-2 py-1 text-xs font-bold text-neutral-700">Take Trips</span> Drive A Auto Rickshaw</div>
              <div className="h-12 w-20 rounded bg-neutral-200" />
            </div>
          </button>
          <Link to="/" className="text-xs text-neutral-600 underline">Want To Book A Ride Instead?</Link>
          <Button className="h-12 w-full rounded-full" onClick={()=>nav("/register/details")}>Next</Button>
          <div className="text-center text-sm">Already Have An Account? <Link to="/login" className="font-semibold">Sign In</Link></div>
        </div>
      </div>
    </Layout>
  );
}
