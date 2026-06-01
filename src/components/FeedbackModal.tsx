import React, { useState } from "react";
import "./FeedbackModal.css";

interface FeedbackModalProps {
  onClose: () => void;
}

export function FeedbackModal({ onClose }: FeedbackModalProps) {
  const [type, setType] = useState("Błąd");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

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
          access_key: "128e7269-2a2d-43ec-8c77-dda324386556",
          subject: `[DINBoard] Zgłoszenie: ${type}`,
          from_name: "DINBoard Użytkownik",
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
    } catch (error) {
      setStatus("error");
    }
  };

  return (
    <div className="feedback-modal-overlay" onClick={onClose}>
      <div className="feedback-modal" onClick={e => e.stopPropagation()}>
        <button className="feedback-modal-close" onClick={onClose} aria-label="Zamknij">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        <h2 className="feedback-modal-title">Zgłoś błąd lub pomysł</h2>
        
        {status === "success" ? (
          <div className="feedback-modal-success">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#27ae60" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <h3>Wysłano pomyślnie!</h3>
            <p>Dziękujemy za Twoją opinię. Wiadomość została przekazana do twórcy.</p>
            <button className="feedback-modal-submit" onClick={onClose}>Zamknij okno</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="feedback-modal-form">
            <div className="feedback-modal-field">
              <label>Rodzaj zgłoszenia</label>
              <select value={type} onChange={e => setType(e.target.value)}>
                <option value="Błąd">Zgłoszenie błędu</option>
                <option value="Sugestia">Propozycja zmiany / nowa funkcja</option>
                <option value="Inne">Pytanie / Inne</option>
              </select>
            </div>
            
            <div className="feedback-modal-field">
              <label>Twój e-mail (opcjonalnie)</label>
              <input 
                type="email" 
                placeholder="np. jan@kowalski.pl"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
              <span className="feedback-modal-hint">Zostaw e-mail, jeśli chcesz otrzymać odpowiedź od autora.</span>
            </div>
            
            <div className="feedback-modal-field">
              <label>Treść wiadomości *</label>
              <textarea 
                required
                placeholder="Opisz dokładnie swój problem lub pomysł..."
                rows={5}
                value={message}
                onChange={e => setMessage(e.target.value)}
              />
            </div>
            
            {status === "error" && (
              <div className="feedback-modal-error">Wystąpił błąd podczas wysyłania. Sprawdź połączenie z internetem.</div>
            )}
            
            <button 
              type="submit" 
              className="feedback-modal-submit" 
              disabled={status === "submitting"}
            >
              {status === "submitting" ? "Wysyłanie..." : "Wyślij wiadomość"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
