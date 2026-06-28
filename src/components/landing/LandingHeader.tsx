export function LandingHeader() {
  return (
    <header className="landing-header">
      <div className="landing-header-container">
        <div className="landing-header-logo-group">
          <div className="landing-header-logo-icon">
            <img src="/favicon-192.png" alt="DinBoard Logo" />
          </div>
          <div>
            <span className="landing-header-title">
              Din<span className="landing-header-title-accent">Board</span>
            </span>
            <span className="landing-header-subtitle">
              Web Application
            </span>
          </div>
        </div>

        <nav className="landing-header-nav">
          <a href="#funkcje">Możliwości</a>
          <a href="#demo-sandbox">Interfejs</a>
          <a href="#artykuly">Baza wiedzy</a>
          <a href="#faq">FAQ</a>
        </nav>

        <div className="landing-header-actions">
          <a
            href="https://suppi.pl/dinboard"
            target="_blank"
            rel="noreferrer"
            className="landing-header-btn-support"
          >
            <i data-lucide="coffee" className="icon"></i>
            <span className="landing-header-btn-text">Wesprzyj projekt</span>
          </a>
        </div>
      </div>
    </header>
  );
}
