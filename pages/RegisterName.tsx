import Layout from "@/components/app/Layout";
import { Button } from "@/components/ui/button";
import { useNavigate, Link } from "react-router-dom";
import { useAppStore } from "@/lib/store";
import { useState } from "react";
import Swal from 'sweetalert2';

export default function RegisterName() {
  const { onboarding, setOnboarding } = useAppStore();
  const [role, setRole] = useState<'driver'|'user'>(onboarding.role as any || 'driver');
  const [first, setFirst] = useState(onboarding.firstName || "");
  const [last, setLast] = useState(onboarding.lastName || "");
  const [password, setPassword] = useState(onboarding.password || "");
  const nav = useNavigate();

  const next = () => {
    if (!first || !first.trim()) return Swal.fire('Missing field', 'Please enter your first name', 'warning');
    if (!last || !last.trim()) return Swal.fire('Missing field', 'Please enter your last name', 'warning');
    if (!password || !password.trim()) return Swal.fire('Missing field', 'Please enter a password', 'warning');
    setOnboarding({ firstName:first, lastName:last, password, role } as any);
    nav(role === 'driver' ? "/register/contact" : "/user/register/contact");
  };

  return (
    <Layout hideTopBar hideBottomNav>
      <div className="mx-4 mt-4 rounded-3xl bg-white p-6 shadow-soft">
        <h1 className="text-3xl font-extrabold leading-tight">Lets Get Started</h1>
        <p className="mt-1 text-sm text-neutral-600">Become A {role === 'driver' ? 'Driver' : 'User'}</p>
        <div className="mt-4 mb-4 flex gap-2">
          <button onClick={()=>setRole('driver')} className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium ${role==='driver' ? 'bg-primary text-white' : 'border bg-neutral-100'}`}>Driver</button>
          <button onClick={()=>setRole('user')} className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium ${role==='user' ? 'bg-primary text-white' : 'border bg-neutral-100'}`}>User</button>
        </div>
        <div className="mt-6 space-y-3">
          <input value={first} onChange={(e)=>setFirst(e.target.value)} placeholder="First Name" className="w-full rounded-xl border bg-neutral-100 px-4 py-3 outline-none focus:bg-white" />
          <input value={last} onChange={(e)=>setLast(e.target.value)} placeholder="Last Name" className="w-full rounded-xl border bg-neutral-100 px-4 py-3 outline-none focus:bg-white" />
          <input value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Password" type="password" className="w-full rounded-xl border bg-neutral-100 px-4 py-3 outline-none focus:bg-white" />
          <Button className="h-12 w-full rounded-full" onClick={next}>Next</Button>
          <div className="my-3 flex items-center gap-3"><div className="h-px flex-1 bg-neutral-200"/><div className="text-xs text-neutral-500">or</div><div className="h-px flex-1 bg-neutral-200"/></div>
          <div className="grid grid-cols-1 gap-2">
            <button onClick={async ()=>{ await Swal.fire({ icon:'info', title:'Google sign-in not configured', text:'Connect authentication (e.g., Supabase or Firebase Auth) to enable Google login.' }); }} className="w-full rounded-xl border bg-white px-4 py-3 text-sm font-medium">Continue with Google</button>
            <button onClick={async ()=>{ await Swal.fire({ icon:'info', title:'Social sign-in not configured', text:'Connect an auth provider to enable social login.' }); }} className="w-full rounded-xl border bg-white px-4 py-3 text-sm font-medium">Continue with Facebook</button>
          </div>
          <div className="text-center text-sm">Already Have An Account? <Link to="/login" className="font-semibold">Sign In</Link></div>
        </div>
      </div>
    </Layout>
  );
}
