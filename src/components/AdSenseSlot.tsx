import { useEffect, useRef } from "react";

interface AdSenseSlotProps {
  adSlot: string;
  adFormat?: string;
  fullWidthResponsive?: boolean;
}

export function AdSenseSlot({
  adSlot,
  adFormat = "auto",
  fullWidthResponsive = true,
}: AdSenseSlotProps) {
  const loaded = useRef(false);

  useEffect(() => {
    // Zapobiegamy podwójnemu wywołaniu push({}) podczas StrictMode
    if (loaded.current) return;
    
    try {
      // Wstrzyknięcie informacji dla skryptu Google AdSense
      const windowObj = window as any;
      (windowObj.adsbygoogle = windowObj.adsbygoogle || []).push({});
      loaded.current = true;
    } catch (e) {
      console.error("AdSense rendering error:", e);
    }
  }, []);

  return (
    <div style={{ 
      minHeight: "600px", 
      width: "100%", 
      textAlign: "center",
      background: "rgba(255, 255, 255, 0.03)",
      border: "1px dashed rgba(255, 255, 255, 0.15)",
      borderRadius: "8px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative"
    }}>
      {/* Informacja dla Ciebie (widoczna tylko gdy reklama jest pusta na localhoście) */}
      <div style={{ position: "absolute", opacity: 0.4, fontSize: "14px" }}>
        Miejsce na reklamę Google
      </div>
      
      {/* 
        Poniżej znajduje się główny placeholder reklamy. 
        Google Analytics wypełni to miejsce (lub zwinie je jeśli nie będzie dopasowanej reklamy).
      */}
      <ins
        className="adsbygoogle"
        style={{ display: "block", width: "100%", height: "100%" }}
        data-ad-client="ca-pub-3277911929620177"
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive={fullWidthResponsive ? "true" : "false"}
      />
    </div>
  );
}
