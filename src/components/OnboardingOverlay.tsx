import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { AppIcon } from "./AppIcon";
import "./OnboardingOverlay.css";

interface OnboardingOverlayProps {
  onFinish: () => void;
}

export function OnboardingOverlay({ onFinish }: OnboardingOverlayProps) {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: t("app.onboarding.step1.title", "Witaj w DINBoard!"),
      desc: t("app.onboarding.step1.desc", "DINBoard to narzędzie stworzone do szybkiego projektowania rozdzielnic elektrycznych. W kilku krokach narysujesz schemat, zbilansujesz fazy i wygenerujesz gotową dokumentację powykonywczą PDF dla klienta."),
      icon: "fileEdit" as const,
    },
    {
      title: t("app.onboarding.step2.title", "Krok 1: Wybieraj i upuszczaj moduły"),
      desc: t("app.onboarding.step2.desc", "Otwórz boczny panel (z lewej strony), znajdź moduły, których użyłeś w rozdzielnicy i przeciągnij je bezpośrednio na szynę DIN, albo po prostu kliknij w moduł, by automatycznie dodać go na koniec szyny."),
      icon: "grid" as const,
    },
    {
      title: t("app.onboarding.step3.title", "Krok 2: Uzupełnij parametry i fazy"),
      desc: t("app.onboarding.step3.desc", "Przejdź do zakładki 'Lista obwodów', aby nazwać obwody i rozdzielić je na fazy (L1/L2/L3). Aplikacja sama będzie pilnowała równomiernego podziału mocy, tak by bilans w Twojej rozdzielnicy był jak najdokładniejszy."),
      icon: "list" as const,
    },
    {
      title: t("app.onboarding.step4.title", "Gotowe! Wygeneruj dokumenty"),
      desc: t("app.onboarding.step4.desc", "Kiedy skończysz układać moduły, przejdź do zakładki 'Dokumentacja'. Wpisz tam dane klienta i jednym kliknięciem wygeneruj estetyczny raport PDF gotowy do wydrukowania i załączenia w szafie. Powodzenia!"),
      icon: "pdf" as const,
    }
  ];

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onFinish();
    }
  }, [currentStep, steps.length, onFinish]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFinish();
      if (e.key === "Enter" || e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrev, onFinish]);

  return (
    <div className="onboarding-backdrop" onMouseDown={(e) => {
      if (e.target === e.currentTarget) onFinish();
    }}>
      <div className="onboarding-modal">
        <div className="onboarding-progress">
          {steps.map((_, i) => (
            <div 
              key={i} 
              className={`onboarding-progress-dot ${i === currentStep ? "active" : ""}`}
            />
          ))}
        </div>

        <div className="onboarding-content">
          <div className="onboarding-icon">
            <AppIcon name={steps[currentStep].icon} size={64} />
          </div>
          <h2 className="onboarding-title">{steps[currentStep].title}</h2>
          <p className="onboarding-description">{steps[currentStep].desc}</p>
        </div>

        <div className="onboarding-actions">
          <button 
            className="ghost-btn" 
            onClick={onFinish}
            style={{ marginRight: "auto" }}
          >
            {t("app.onboarding.skip", "Pomiń")}
          </button>
          
          <div className="onboarding-actions-right">
            {currentStep > 0 && (
              <button className="ghost-btn" onClick={handlePrev}>
                {t("app.onboarding.prev", "Wstecz")}
              </button>
            )}
            <button className="accent-btn" onClick={handleNext}>
              {currentStep === steps.length - 1 ? t("app.onboarding.start", "Zaczynamy!") : t("app.onboarding.next", "Dalej")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
