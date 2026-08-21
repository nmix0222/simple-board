import { useEffect, useRef } from 'react';

const CLIENT = import.meta.env.VITE_ADSENSE_CLIENT;
const SLOT = import.meta.env.VITE_ADSENSE_SLOT;

// Renders nothing until a real AdSense client/slot ID is supplied via
// VITE_ADSENSE_CLIENT / VITE_ADSENSE_SLOT env vars at build time, so the
// site stays ad-free (and policy-safe) until the AdSense account is approved.
export default function AdSlot() {
  const insRef = useRef(null);

  useEffect(() => {
    if (!CLIENT || !SLOT) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error('AdSense push failed', e);
    }
  }, []);

  if (!CLIENT || !SLOT) return null;

  return (
    <ins
      ref={insRef}
      className="adsbygoogle"
      style={{ display: 'block' }}
      data-ad-client={CLIENT}
      data-ad-slot={SLOT}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}
