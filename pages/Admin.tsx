import Layout from "@/components/app/Layout";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Menu, Users, Car, Route, BarChart3, Settings, Percent } from "lucide-react";
import { useAppStore } from "@/lib/store";

export default function Admin() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useAppStore();
  const logout = () => {
    try { setUser(null); } catch {}
    try {
      sessionStorage.removeItem('session.user');
      sessionStorage.removeItem('session.lastActivity');
      localStorage.removeItem('session.user');
      localStorage.removeItem('session.remember');
    } catch {}
    setOpen(false);
    navigate('/admin/login');
  };
  const tabs = [
    { to: "/admin", label: "Dashboard", exact: true },
    { to: "/admin/users", label: "Users" },
    { to: "/admin/drivers", label: "Drivers" },
    { to: "/admin/trips", label: "Trips" },
    { to: "/admin/reports", label: "Reports" },
    { to: "/admin/commissions", label: "Commissions" },
    { to: "/admin/settings", label: "Settings" },
  ];
  const bottom = [
    { to: "/admin/users", label: "Riders", Icon: Users },
    { to: "/admin/drivers", label: "Drivers", Icon: Car },
    { to: "/admin/trips", label: "Trips", Icon: Route },
    { to: "/admin/reports", label: "Reports", Icon: BarChart3 },
    { to: "/admin/commissions", label: "Comms", Icon: Percent },
    { to: "/admin/settings", label: "Settings", Icon: Settings },
  ];
  return (
    <Layout hideBottomNav>
      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden w-56 shrink-0 border-r bg-white/80 p-4 md:block">
          <div className="text-lg font-extrabold tracking-tight">Admin</div>
          <nav className="mt-4 space-y-1">
            {tabs.map(t => (
              <NavLink key={t.to} to={t.to} end={t.exact as any} className={({ isActive }) => `block rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-primary/10 text-primary' : 'text-neutral-700 hover:bg-neutral-50'}`}>
                {t.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-4 border-t pt-3">
            <button onClick={logout} className="w-full rounded-lg border px-3 py-2 text-sm font-medium hover:bg-neutral-50">Log out</button>
          </div>
        </aside>

        {/* Mobile hamburger */}
        <button aria-label="Open menu" className="md:hidden fixed left-3 top-16 z-40 inline-flex h-9 w-9 items-center justify-center rounded-xl border bg-white/90 shadow" onClick={()=>setOpen(true)}>
          <Menu className="h-4 w-4" />
        </button>
        {/* Mobile drawer */}
        <div className={`fixed inset-0 z-40 md:hidden ${open ? '' : 'pointer-events-none'}`}>
          <div className={`absolute inset-0 bg-black/30 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`} onClick={()=>setOpen(false)} />
          <aside className={`absolute left-0 top-0 h-full w-64 bg-white p-4 transition-transform ${open ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="text-lg font-extrabold tracking-tight">Admin</div>
            <nav className="mt-4 space-y-1">
              {tabs.map(t => (
                <NavLink key={t.to} to={t.to} end={t.exact as any} onClick={()=>setOpen(false)} className={({ isActive }) => `block rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-primary/10 text-primary' : 'text-neutral-700 hover:bg-neutral-50'}`}>
                  {t.label}
                </NavLink>
              ))}
            </nav>
            <div className="mt-4 border-t pt-3">
              <button onClick={logout} className="w-full rounded-lg border px-3 py-2 text-sm font-medium hover:bg-neutral-50">Log out</button>
            </div>
          </aside>
        </div>

        <main className="min-h-[calc(100vh-3.5rem)] flex-1 px-4 pb-20 pt-6">
          <Outlet />
        </main>
      </div>

      {/* Admin bottom nav (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 px-3 py-2 backdrop-blur md:hidden">
        <div className="grid grid-cols-6 gap-1">
          {bottom.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `flex flex-col items-center gap-1 rounded-lg px-2 py-1 text-xs ${isActive ? 'text-primary' : 'text-neutral-600'}`}>
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </Layout>
  );
}
