interface LandingFooterProps {
  onOpenFeedback: () => void;
}

export function LandingFooter({ onOpenFeedback }: LandingFooterProps) {
  return (
    <footer className="landing-footer">
      <div className="landing-footer-container">
        <div className="landing-footer-brand">
          <div className="landing-footer-logo-wrapper">
            <img src="/favicon-192.png" alt="DinBoard Logo" />
          </div>
          <div>
            <span className="landing-footer-title">DinBoard</span>
            <span className="landing-footer-subtitle">Narzędzie dla nowoczesnych elektryków.</span>
          </div>
        </div>

        <div className="landing-footer-links">
          <a href="/polityka-prywatnosci" className="landing-footer-link">
            Polityka Prywatności
          </a>
          <a href="/regulamin" className="landing-footer-link">
            Warunki korzystania
          </a>
          <a onClick={onOpenFeedback} className="landing-footer-link">
            Zgłoś błąd / Kontakt
          </a>
        </div>

        <span className="landing-footer-copyright">© 2026 DinBoard.pl. Wszelkie prawa zastrzeżone.</span>
      </div>
    </footer>
  );
}
