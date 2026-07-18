import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import "./FeedbackModal.css";

interface FeedbackModalProps {
  onClose: () => void;
}

export function FeedbackModal({ onClose }: FeedbackModalProps) {
  const { t } = useTranslation();
  const [type, setType] = useState("Błąd");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  // WHY: modal jest renderowany w App.tsx obok <Outlet>, czyli POZA
  // <main className="app-shell ui-theme-classic">. Bez portalu CSS variables
  // motywu (zdefiniowane na .app-shell) nie kaskadują do modala i w jasnym
  // motywie modal wygląda ciemno (dziedziczy :root = dark defaults).
  // Portal do .app-shell naprawia kaskadę. Fallback do body dla landing page,
  // gdzie .app-shell nie istnieje.
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const target = document.querySelector(".app-shell") as HTMLElement | null;
    setPortalTarget(target ?? document.body);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    
    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          access_key: import.meta.env.VITE_WEB3FORMS_ACCESS_KEY || "",
          subject: `[DINBoard] Zgłoszenie: ${type}`,
          from_name: t("auto.dinboarduytkown_482", "DINBoard Użytkownik"),
          email: email || "anonim@dinboard.pl",
          message: message,
          type: type,
        }),
      });
      const result = await response.json();
      if (result.success) {
        setStatus("success");
      } else {
        setStatus("error");
      }
    } catch (_error) {
      setStatus("error");
    }
  };

  if (!portalTarget) return null;

  return createPortal(
    <div className="feedback-modal-overlay" onClick={onClose}>
      <div className="feedback-modal" onClick={e => e.stopPropagation()}>
        <button className="feedback-modal-close win-close-btn" onClick={onClose} aria-label={t("app.feedbackModal.closeAria", "Zamknij")}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        <h2 className="feedback-modal-title">{t("app.feedbackModal.title", "Zgłoś błąd lub pomysł")}</h2>

        {status === "success" ? (
          <div className="feedback-modal-success">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#27ae60" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <h3>{t("app.feedbackModal.successTitle", "Wysłano pomyślnie!")}</h3>
            <p>{t("app.feedbackModal.successDesc", "Dziękujemy za Twoją opinię. Wiadomość została przekazana do twórcy.")}</p>
            <button className="feedback-modal-submit" onClick={onClose}>{t("app.feedbackModal.closeBtn", "Zamknij okno")}</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="feedback-modal-form">
            <div className="feedback-modal-field">
              <label>{t("app.feedbackModal.typeLabel", "Rodzaj zgłoszenia")}</label>
              <select value={type} onChange={e => setType(e.target.value)}>
                <option value="Błąd">{t("app.feedbackModal.typeError", "Zgłoszenie błędu")}</option>
                <option value="Sugestia">{t("app.feedbackModal.typeIdea", "Propozycja zmiany / nowa funkcja")}</option>
                <option value="Inne">{t("app.feedbackModal.typeOther", "Pytanie / Inne")}</option>
              </select>
            </div>

            <div className="feedback-modal-field">
              <label>{t("app.feedbackModal.emailLabel", "Twój e-mail (opcjonalnie)")}</label>
              <input
                type="email"
                placeholder={t("app.feedbackModal.emailPlaceholder", "np. jan@kowalski.pl")}
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
              <span className="feedback-modal-hint">{t("app.feedbackModal.emailHint", "Zostaw e-mail, jeśli chcesz otrzymać odpowiedź od autora.")}</span>
            </div>

            <div className="feedback-modal-field">
              <label>{t("app.feedbackModal.messageLabel", "Treść wiadomości *")}</label>
              <textarea
                required
                placeholder={t("app.feedbackModal.messagePlaceholder", "Opisz dokładnie swój problem lub pomysł...")}
                rows={5}
                value={message}
                onChange={e => setMessage(e.target.value)}
              />
            </div>

            {status === "error" && (
              <div className="feedback-modal-error">{t("app.feedbackModal.errorMsg", "Wystąpił błąd podczas wysyłania. Sprawdź połączenie z internetem.")}</div>
            )}

            <button
              type="submit"
              className="feedback-modal-submit"
              disabled={status === "submitting"}
            >
              {status === "submitting" ? t("app.feedbackModal.btnSubmitting", "Wysyłanie...") : t("app.feedbackModal.btnSubmit", "Wyślij wiadomość")}
            </button>
          </form>
        )}
      </div>
    </div>,
    portalTarget
  );
}
