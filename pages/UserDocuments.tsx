import Layout from "@/components/app/Layout";
import { Button } from "@/components/ui/button";
import { useNavigate, Link } from "react-router-dom";
import { useAppStore } from "@/lib/store";
import { useState } from "react";
import Swal from 'sweetalert2';

function toDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}

export default function UserDocuments() {
  const { onboarding, setOnboarding, mergeOnboardingToDriver } = useAppStore();
  const [idNumber, setIdNumber] = useState(onboarding.identificationNumber || "");
  const [profilePhoto, setProfilePhoto] = useState<string | undefined>(onboarding.profilePhoto);
  const [idPhoto, setIdPhoto] = useState<string | undefined>(onboarding.identificationPhoto);
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);

  return (
    <Layout hideTopBar hideBottomNav>
      <div className="mx-4 mt-4 rounded-3xl bg-white p-6 shadow-soft">
        <h1 className="text-3xl font-extrabold">Almost There!</h1>
        <p className="mt-1 text-sm text-neutral-600">This Is What Is Needed To Set Up An Account</p>
        <div className="mt-6 space-y-5">
          <div>
            <div className="text-sm font-semibold">Your Profile Photo</div>
            <p className="mb-2 text-xs text-neutral-600">Please Provide A Clear Image Of Yourself(From The Neck Up)</p>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm">
              <input type="file" accept="image/*" className="hidden" onChange={async (e)=>{ const f=e.target.files?.[0]; if(!f) return; const url=await toDataUrl(f); setProfilePhoto(url); }} />
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-neutral-100">+</span>
              Upload File
            </label>
            {profilePhoto && <img src={profilePhoto} alt="Profile preview" className="mt-2 h-16 w-16 rounded-full object-cover" />}
          </div>
          <div>
            <div className="text-sm font-semibold">Identification Number</div>
            <p className="mb-2 text-xs text-neutral-600">Please Add Your Identification Number Below</p>
            <input value={idNumber} onChange={(e)=>setIdNumber(e.target.value)} placeholder="Identification Number" className="w-full rounded-xl border bg-neutral-100 px-4 py-3 outline-none focus:bg-white" />
          </div>
          <div>
            <div className="text-sm font-semibold">Identification Card</div>
            <p className="mb-2 text-xs text-neutral-600">Please Provide A Clear Image Of Your Identification Card</p>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm">
              <input type="file" accept="image/*" className="hidden" onChange={async (e)=>{ const f=e.target.files?.[0]; if(!f) return; const url=await toDataUrl(f); setIdPhoto(url); }} />
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-neutral-100">+</span>
              Upload File
            </label>
            {idPhoto && <img src={idPhoto} alt="ID preview" className="mt-2 h-16 w-24 rounded object-cover" />}
          </div>
          <Button className="h-12 w-full rounded-full" disabled={loading} onClick={async () => {
            setLoading(true);
            const updates = { identificationNumber: idNumber, profilePhoto, identificationPhoto: idPhoto };
            setOnboarding(updates);
            mergeOnboardingToDriver(updates);
            let redirected = false;
            try {
              // Use relative endpoints so requests go through the current site/proxy and avoid cross-origin failures
              const primary = `/api/users/register`;
              const fallback = `/.netlify/functions/api/users/register`;

              // helper to avoid synchronous fetch wrapper issues (e.g., FullStory) by deferring call into Promise chain
              const deferFetch = (input: RequestInfo, init?: RequestInit) => new Promise<Response>((resolve, reject) => {
                try {
                  // schedule in macrotask to avoid sync instrumentation issues
                  setTimeout(() => {
                    try {
                      fetch(input, init).then(resolve).catch(reject);
                    } catch (e) { reject(e); }
                  }, 0);
                } catch (e) { reject(e); }
              });

              // quick connectivity check (GET /api/ping) using relative paths
              console.log('User register: checking connectivity');
              const pingPrimary = await deferFetch(`/api/ping`).catch((err)=>{ console.warn('pingPrimary err', err); return null; });
              const pingFallback = await deferFetch(`/.netlify/functions/api/ping`).catch((err)=>{ console.warn('pingFallback err', err); return null; });
              console.log('User register: ping results', !!pingPrimary, !!pingFallback);
              if (!pingPrimary && !pingFallback) {
                await Swal.fire({ icon: 'error', title: 'Network error', text: `Could not reach API endpoints. Tried relative paths to the current origin.` });
                throw new Error('API unreachable');
              }

              // Build payload but omit images to avoid large POST failures in the preview environment
              const payload: any = {
                firstName: onboarding.firstName ?? undefined,
                lastName: onboarding.lastName ?? undefined,
                email: onboarding.email ?? undefined,
                phone: onboarding.phone ?? undefined,
                countryCode: onboarding.countryCode ?? undefined,
                gender: onboarding.gender ?? undefined,
                location: onboarding.location ?? undefined,
                identificationNumber: idNumber ?? onboarding.identificationNumber ?? undefined,
                password: onboarding.password ?? undefined,
                omittedImages: true, // always omit images in preview to keep payload small
              };

              console.log('User register payload (images omitted in preview)', payload);

              let res: Response | null = null;

              // helper to run fetch with timeout
              const fetchWithTimeout = (input: RequestInfo, init: RequestInit | undefined, ms = 12000) => new Promise<Response>(async (resolve, reject) => {
                let timedOut = false;
                const t = setTimeout(() => {
                  timedOut = true;
                  reject(new Error('timeout'));
                }, ms);
                try {
                  const r = await deferFetch(input, init).catch((e)=>{ throw e; });
                  if (timedOut) return; // already rejected
                  clearTimeout(t);
                  resolve(r as Response);
                } catch (e) {
                  if (timedOut) return;
                  clearTimeout(t);
                  reject(e);
                }
              });

              try {
                console.log('User register: attempting POST to', primary);
                const bodyStr = JSON.stringify(payload);
                // increase timeout to 20000ms for primary
                res = await fetchWithTimeout(primary, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: bodyStr,
                }, 20000);
              } catch (err) {
                console.error('Primary POST failed or timed out', err);
                // show a clear error and stop; do not attempt fallback to avoid duplicate/partial creates
                await Swal.fire({ icon: 'error', title: 'Registration failed', text: 'Could not reach server or request timed out. Please check your network or try again. Error: ' + String(err?.message || err) });
                throw err;
              }

              if (!res) {
                await Swal.fire({ icon: 'error', title: 'Registration failed', text: 'No response from server.' });
                throw new Error('No response');
              }

              const text = await res.text().catch(() => '');
              let data: any = {};
              try { data = text ? JSON.parse(text) : {}; } catch { data = { text }; }

              console.log('User register response', res ? res.status : 'no-res', data);

              if (!res.ok) {
                const errMsg = data.error || data.message || data.text || 'Could not register your account. Please try again.';
                console.warn('User register failed', res.status, errMsg);
                await Swal.fire({ icon: 'error', title: 'Registration failed', text: errMsg });
              } else {
                const successMsg = data.message || 'Your account has been created. Please log in with your email and password.';
                if (payload.omittedImages) {
                  await Swal.fire({ icon: 'warning', title: 'Registration complete (images omitted)', text: successMsg + ' (Images were omitted due to size in this environment.)' });
                } else {
                  await Swal.fire({ icon: 'success', title: 'Registration complete', text: successMsg });
                }
                try { nav('/login'); redirected = true; } catch (e) { console.error('Navigation failed', e); }
              }
            } catch (e) {
              console.error('Error registering user', e);
              if (!(e instanceof Error && e.message === 'API unreachable')) {
                await Swal.fire({ icon: 'error', title: 'Registration failed', text: (e as Error).message || 'An error occurred. Please try again.' });
              }
            } finally {
              setLoading(false);
              // Do not navigate automatically on failure — only navigate when we explicitly redirected after success
            }
          }}>Next</Button>
          <div className="text-center text-sm">Already Have An Account? <Link to="/login" className="font-semibold">Sign In</Link></div>
        </div>
      </div>
    </Layout>
  );
}
