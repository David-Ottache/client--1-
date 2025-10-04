import Layout from "@/components/app/Layout";
import { useAppStore } from "@/lib/store";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { safeFetch } from "@/lib/utils";
import { useParams, useNavigate } from "react-router-dom";

export default function UserDetails() {
  const { id } = useParams();
  const { startTrip, selectedDriverId, selectDriver, drivers, pendingTrip } = useAppStore();
  const navigate = useNavigate();
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!id) return;
      setLoading(true);
      // check store first
      const storeDriver = (drivers || []).find((d:any)=>d.id === id);
      if (storeDriver) {
        setUser(storeDriver as any);
        setLoading(false);
        return;
      }

      const origin = window.location.origin;
      const candidates = [
        `/api/users/${id}`,
        `${origin}/api/users/${id}`,
        `/api/drivers/${id}`,
        `${origin}/api/drivers/${id}`,
        `/.netlify/functions/api/users/${id}`,
        `${origin}/.netlify/functions/api/users/${id}`,
        `/.netlify/functions/api/drivers/${id}`,
        `${origin}/.netlify/functions/api/drivers/${id}`,
      ];

      try {
        let found = null as any;
        for (const url of candidates) {
          try {
            console.debug('Attempting fetch', url);
            const res = await safeFetch(url);
            if (!res || !res.ok) continue;
            const data = await res.json().catch(()=>null);
            if (!data) continue;
            found = data.user ?? data.driver ?? null;
            if (found) {
              setUser(found);
              break;
            }
          } catch (inner) {
            console.warn('fetch candidate failed', url, inner);
            continue;
          }
        }
        if (!found) {
          console.warn('No user/driver found at any candidate URL');
          setUser(null);
        }
      } catch (e) {
        console.error('Failed fetching user (outer)', e);
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, drivers]);

  if (loading) return (
    <Layout>
      <div className="px-4 pt-6 text-sm text-neutral-600">Loading user...</div>
    </Layout>
  );

  if (!user) return (
    <Layout>
      <div className="px-4 pt-6">
        <div className="text-xl font-bold">User not found</div>
        <div className="mt-2 text-sm text-neutral-600">Could not find user with id {id}</div>
      </div>
    </Layout>
  );

  const displayName = (user.name && String(user.name).trim()) || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || user.phone || 'User';
  const avatar = (user.avatar || user.profilePhoto || user.photo || 'https://i.pravatar.cc/80');
  const rides = user.rides ?? 0;
  const rating = user.rating ?? 0;

  return (
    <Layout>
      <div className="px-4 pt-6">
        <div className="flex items-center gap-3">
          <img src={avatar} className="h-16 w-16 rounded-full object-cover" alt={displayName} />
          <div>
            <div className="text-xl font-bold">{displayName}</div>
            <div className="text-sm text-neutral-600">{user.email || user.phone}</div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border bg-white p-4">
          <div className="font-semibold">Trip Details</div>
          <div className="mt-2 text-sm text-neutral-700">
            <div>Pick Up Location: {pendingTrip?.pickup ?? 'Current location'}</div>
            <div>Destination: {pendingTrip?.destination ?? 'TBD'}</div>
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <Button className="h-12 flex-1 rounded-full" onClick={async () => {
            if (!selectedDriverId) selectDriver(user.id);
            startTrip({ pickup: pendingTrip?.pickup ?? 'Current location', destination: pendingTrip?.destination ?? 'TBD', driverId: user.id, fee: 0 });
            navigate('/');
          }}>Start Trip</Button>
        </div>
      </div>
    </Layout>
  );
}
