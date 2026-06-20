import { useState, useEffect } from "react";
import { SLIDER_IMAGES } from "./landingData";

export function LandingSandboxPreview() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDER_IMAGES.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section id="demo-sandbox" className="py-16 bg-[#0B0F19] border-b border-gray-900 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <span className="text-amber-500 text-xs font-bold tracking-widest uppercase font-mono block mb-2">
            PODGLĄD APLIKACJI
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white m-0 pb-2">
            Przejrzysty i intuicyjny interfejs roboczy
          </h2>
          <p className="text-sm text-gray-400 m-0">
            Zobacz, jak zaprojektowałem przestrzeń roboczą programu DinBoard pod kątem szybkiej i wygodnej pracy instalatora.
          </p>
        </div>

        <div className="rounded-2xl overflow-hidden shadow-2xl border border-slate-800/80 bg-slate-900 relative aspect-[16/9]">
          {SLIDER_IMAGES.map((src, index) => (
            <div
              key={src}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                index === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0"
              }`}
            >
              <img
                src={src}
                alt={`Zrzut ekranu aplikacji DinBoard ${index + 1}`}
                draggable={false}
                className="w-full h-full object-cover pointer-events-none select-none"
              />
              {index === 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <div className="bg-slate-900/95 border border-amber-500/50 p-6 rounded-2xl shadow-2xl text-center max-w-md mx-4 transform transition-all">
                    <div className="w-14 h-14 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
                      <i data-lucide="zap" className="w-7 h-7 text-amber-500"></i>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Rysowanie przewodów już jest!</h3>
                    <p className="text-sm text-gray-300 leading-relaxed">
                      Moduł łączenia aparatów na szynie DIN jest już dostępny. Pamiętaj, że aplikacja jest w <strong>fazie testów (BETA)</strong>.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10 pointer-events-auto">
            {SLIDER_IMAGES.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentSlide ? "bg-blue-500 w-6" : "bg-white/30 hover:bg-white/50 w-2"
                }`}
                aria-label={`Przejdź do slajdu ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
