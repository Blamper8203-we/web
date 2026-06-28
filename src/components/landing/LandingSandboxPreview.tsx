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
    <section id="demo-sandbox" className="landing-preview-section">
      <div className="landing-container">
        <div className="landing-preview-header">
          <span className="landing-preview-badge">
            PODGLĄD APLIKACJI
          </span>
          <h2 className="landing-preview-title">
            Przejrzysty i intuicyjny interfejs roboczy
          </h2>
          <p className="landing-preview-desc">
            Zobacz, jak zaprojektowałem przestrzeń roboczą programu DinBoard pod kątem szybkiej i wygodnej pracy instalatora.
          </p>
        </div>

        <div className="landing-preview-container">
          {SLIDER_IMAGES.map((src, index) => (
            <div
              key={src}
              className={`landing-preview-slide ${
                index === currentSlide ? "is-active" : "is-inactive"
              }`}
            >
              <img
                src={src}
                alt={`Zrzut ekranu aplikacji DinBoard ${index + 1}`}
                draggable={false}
                className="landing-preview-image"
              />
            </div>
          ))}
          <div className="landing-preview-controls">
            {SLIDER_IMAGES.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`landing-preview-dot ${
                  index === currentSlide ? "is-active" : "is-inactive"
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
