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

export default function Documents() {
  const { onboarding, setOnboarding, mergeOnboardingToDriver } = useAppStore();
  const [license, setLicense] = useState(onboarding.driverLicenseNumber || "");
  const [profilePhoto, setProfilePhoto] = useState<string | undefined>(onboarding.profilePhoto);
  const [licensePhoto, setLicensePhoto] = useState<string | undefined>(onboarding.driverLicensePhoto);
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
            <div className="text-sm font-semibold">Drivers License Number</div>
            <p className="mb-2 text-xs text-neutral-600">Please Add Your Drivers License Number Below</p>
            <input value={license} onChange={(e)=>setLicense(e.target.value)} placeholder="License Number" className="w-full rounded-xl border bg-neutral-100 px-4 py-3 outline-none focus:bg-white" />
          </div>
          <div>
            <div className="text-sm font-semibold">Drivers License</div>
            <p className="mb-2 text-xs text-neutral-600">Please Provide A Clear Drivers License</p>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm">
              <input type="file" accept="image/*" className="hidden" onChange={async (e)=>{ const f=e.target.files?.[0]; if(!f) return; const url=await toDataUrl(f); setLicensePhoto(url); }} />
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-neutral-100">+</span>
              Upload File
            </label>
            {licensePhoto && <img src={licensePhoto} alt="License preview" className="mt-2 h-16 w-24 rounded object-cover" />}
          </div>
          <Button className="h-12 w-full rounded-full" disabled={loading} onClick={async ()=>{
            console.log('Documents Next clicked');
            setLoading(true);
            const updates = { driverLicenseNumber: license, profilePhoto, driverLicensePhoto: licensePhoto };
            setOnboarding(updates);
            mergeOnboardingToDriver(updates);
            let redirected = false;

            try {
              // Build explicit payload from onboarding and current local values to avoid stale/undefined fields
              const payload = {
                firstName: onboarding.firstName ?? undefined,
                lastName: onboarding.lastName ?? undefined,
                email: onboarding.email ?? undefined,
                phone: onboarding.phone ?? undefined,
                countryCode: onboarding.countryCode ?? undefined,
                gender: onboarding.gender ?? undefined,
                location: onboarding.location ?? undefined,
                profilePhoto: profilePhoto ?? onboarding.profilePhoto ?? undefined,
                driverLicenseNumber: license ?? onboarding.driverLicenseNumber ?? undefined,
                driverLicensePhoto: licensePhoto ?? onboarding.driverLicensePhoto ?? undefined,
                vehicleType: onboarding.vehicleType ?? undefined,
                password: onboarding.password ?? undefined,
              };
              console.log('Register payload', payload);
              const res = await fetch('/api/drivers/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              });
              if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                console.warn('Failed registering driver', err);
                await Swal.fire({ icon: 'error', title: 'Registration failed', text: 'Could not register your account. Please try again.' });
              } else {
                const data = await res.json();
                console.log('Driver registered', data);
                // generate QR code image for driver id and show modal with options
                try {
                  const driverId = data?.driver?.id || data?.id || null;
                  if (driverId) {
                    const origin = window.location.origin;
                    const qrData = `${origin}/user/verify?code=${encodeURIComponent(driverId)}`;
                    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrData)}`;
                    // store modal state on window to be picked up by a simple modal component below
                    (window as any).__lastGeneratedQR = { driverId, qrUrl, qrData };
                    // show a simple modal dialog with the image and actions
                    await new Promise<void>((resolve) => {
                      const wrapper = document.createElement('div');
                      wrapper.style.position = 'fixed';
                      wrapper.style.inset = '0';
                      wrapper.style.display = 'flex';
                      wrapper.style.alignItems = 'center';
                      wrapper.style.justifyContent = 'center';
                      wrapper.style.background = 'rgba(0,0,0,0.4)';
                      wrapper.style.zIndex = '9999';
                      const box = document.createElement('div');
                      box.style.background = 'white';
                      box.style.padding = '20px';
                      box.style.borderRadius = '12px';
                      box.style.maxWidth = '420px';
                      box.style.textAlign = 'center';
                      const img = document.createElement('img');
                      img.src = qrUrl;
                      img.width = 320;
                      img.height = 320;
                      img.style.display = 'block';
                      img.style.margin = '0 auto 12px';
                      const title = document.createElement('div');
                      title.textContent = 'Driver QR Code';
                      title.style.fontWeight = '700';
                      title.style.marginBottom = '8px';
                      const subtitle = document.createElement('div');
                      subtitle.textContent = `Driver ID: ${driverId}`;
                      subtitle.style.fontSize = '12px';
                      subtitle.style.color = '#666';
                      subtitle.style.marginBottom = '12px';
                      const btnRow = document.createElement('div');
                      btnRow.style.display = 'flex';
                      btnRow.style.gap = '8px';
                      btnRow.style.justifyContent = 'center';

                      const downloadBtn = document.createElement('button');
                      downloadBtn.textContent = 'Download QR';
                      downloadBtn.style.padding = '8px 12px';
                      downloadBtn.style.borderRadius = '8px';
                      downloadBtn.style.border = 'none';
                      downloadBtn.style.background = '#0ea5a5';
                      downloadBtn.style.color = 'white';
                      downloadBtn.onclick = async () => {
                        try {
                          const qrRes = await fetch(qrUrl);
                          if (qrRes.ok) {
                            const blob = await qrRes.blob();
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `driver_${driverId}.png`;
                            document.body.appendChild(a);
                            a.click();
                            a.remove();
                            URL.revokeObjectURL(url);
                          }
                        } catch (e) { console.warn('download failed', e); }
                      };

                      const regenBtn = document.createElement('button');
                      regenBtn.textContent = 'Regenerate';
                      regenBtn.style.padding = '8px 12px';
                      regenBtn.style.borderRadius = '8px';
                      regenBtn.style.border = '1px solid #ddd';
                      regenBtn.onclick = async () => {
                        // regenerate (same URL, but we re-fetch and update image)
                        try {
                          const newQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrData)}&t=${Date.now()}`;
                          img.src = newQrUrl;
                          (window as any).__lastGeneratedQR.qrUrl = newQrUrl;
                        } catch (e) { console.warn('regenerate failed', e); }
                      };

                      const closeBtn = document.createElement('button');
                      closeBtn.textContent = 'Close';
                      closeBtn.style.padding = '8px 12px';
                      closeBtn.style.borderRadius = '8px';
                      closeBtn.style.border = '1px solid #ddd';
                      closeBtn.onclick = () => { document.body.removeChild(wrapper); resolve(); };

                      btnRow.appendChild(downloadBtn);
                      btnRow.appendChild(regenBtn);
                      btnRow.appendChild(closeBtn);

                      box.appendChild(title);
                      box.appendChild(img);
                      box.appendChild(subtitle);
                      box.appendChild(btnRow);
                      wrapper.appendChild(box);
                      document.body.appendChild(wrapper);
                    });

                  } else {
                    await Swal.fire({ icon: 'success', title: 'Registration complete', text: 'Your account has been created. Please log in with your email and password.' });
                  }
                } catch (e) {
                  console.warn('QR generation flow failed', e);
                  await Swal.fire({ icon: 'success', title: 'Registration complete', text: 'Your account has been created. Please log in with your email and password.' });
                }

                // navigate to login page after user closes alert
                try { nav('/login'); redirected = true; } catch(e) { console.error('Navigation failed', e); }
              }
            } catch (e) {
              console.error('Error registering driver', e);
              await Swal.fire({ icon: 'error', title: 'Registration failed', text: 'An error occurred. Please try again.' });
            } finally {
              setLoading(false);
              if (!redirected) {
                try { nav('/'); } catch(e) { console.error('Navigation failed', e); }
              }
            }
          }}>Next</Button>
          <div className="text-center text-sm">Already Have An Account? <Link to="/login" className="font-semibold">Sign In</Link></div>
        </div>
      </div>
    </Layout>
  );
}
