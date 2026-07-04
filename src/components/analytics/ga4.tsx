import Script from 'next/script';

/**
 * Google Analytics 4 loader — only mounts when NEXT_PUBLIC_GA_ID is set.
 * Uses the `afterInteractive` strategy so it doesn't block LCP.
 *
 * Set in Vercel → Environment Variables:
 *   NEXT_PUBLIC_GA_ID = G-XXXXXXXXXX
 */
export function GA4() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  if (!gaId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${gaId}', {
          anonymize_ip: true,
          send_page_view: true,
        });
      `}</Script>
    </>
  );
}
