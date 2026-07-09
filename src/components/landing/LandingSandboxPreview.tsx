import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { SLIDER_IMAGES } from "./landingData";

export function LandingSandboxPreview() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const { t } = useTranslation();

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
            {t("landing.preview.badge")}
          </span>
          <h2 className="landing-preview-title">
            {t("landing.preview.title")}
          </h2>
          <p className="landing-preview-desc">
            {t("landing.preview.desc")}
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
                alt={`DinBoard ${index + 1}`}
                draggable={false}
                className="landing-preview-image"
                loading={index === 0 ? "eager" : "lazy"}
                decoding="async"
                width="1920"
                height="1080"
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
                aria-label={`Slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
