import { Helmet } from "react-helmet-async";

export function GoogleAdSense() {
  return (
    <Helmet>
      {/* WHY: AdSense auto-ads wstrzykiwane tylko na podstronach "contentowych" (landing, blog). 
          Nie ładujemy tego w index.html, żeby edytor (/app) nie był oznaczany 
          przez bota AdSense jako "Low value content" z powodu pustego canvasa. */}
      <script
        async
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3277911929620177"
        crossOrigin="anonymous"
      ></script>
      <meta name="google-adsense-account" content="ca-pub-3277911929620177" />
    </Helmet>
  );
}
