import Layout from "@/components/app/Layout";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const { user, setUser } = useAppStore();
  const navigate = useNavigate();

  const logout = () => {
    setUser(null);
    try { sessionStorage.removeItem('session.user'); } catch {}
    navigate('/login');
  };

  return (
    <Layout>
      <div className="px-4 pt-6">
        <h1 className="text-2xl font-bold">Profile</h1>
        <div className="mt-3 space-y-3">
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="text-sm text-neutral-600">Name</div>
            <div className="mt-1 font-semibold">{user ? `${user.firstName} ${user.lastName}` : 'Guest'}</div>
          </div>
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="text-sm text-neutral-600">Email</div>
            <div className="mt-1 font-semibold">{user?.email || 'Not set'}</div>
          </div>
          <a href="/safety" className="block rounded-2xl border bg-white p-4 text-center font-semibold shadow-sm">Safety & Emergency Contacts</a>
          <div className="mt-4">
            <Button className="h-12 w-full" variant="destructive" onClick={logout}>Logout</Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
