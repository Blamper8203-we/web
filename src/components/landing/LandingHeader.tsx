import { useTranslation } from "react-i18next";
export function LandingHeader() {
  const { t, i18n } = useTranslation();

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  return (
    <header className="landing-header">
      <div className="landing-header-container">
        <div className="landing-header-logo-group">
          <div className="landing-header-logo-icon">
            <img src="/favicon-192.png" alt="DinBoard Logo" />
          </div>
          <div>
            <span className="landing-header-title">
              Din<span className="landing-header-title-accent">{t("auto.board_264", "Board")}</span>
            </span>
            <span className="landing-header-subtitle">
              Web Application
            </span>
          </div>
        </div>

        <nav className="landing-header-nav">
          <a href="#funkcje">{t("auto.moliwoci_696", "Możliwości")}</a>
          <a href="#demo-sandbox">{t("auto.interfejs_389", "Interfejs")}</a>
          <a href="/poradniki">{t("auto.bazawiedzy_212", "Baza wiedzy")}</a>
          <a href="#faq">{t("auto.faq_502", "FAQ")}</a>
        </nav>

        <div className="landing-header-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            onClick={() => handleLanguageChange('pl')} 
            style={{ background: 'transparent', border: '1px solid #333', color: i18n.language === 'pl' ? '#f59e0b' : '#fff', cursor: 'pointer', padding: '4px 8px', borderRadius: '4px' }}
          >
            PL
          </button>
          <button 
            onClick={() => handleLanguageChange('de')} 
            style={{ background: 'transparent', border: '1px solid #333', color: i18n.language === 'de' ? '#f59e0b' : '#fff', cursor: 'pointer', padding: '4px 8px', borderRadius: '4px' }}
          >
            DE
          </button>
          <a
            href="https://suppi.pl/dinboard"
            target="_blank"
            rel="noreferrer"
            className="landing-header-btn-support"
          >
            <i data-lucide="coffee" className="icon"></i>
            <span className="landing-header-btn-text">{t("auto.wesprzyjprojekt_653", "Wesprzyj projekt")}</span>
          </a>
        </div>
      </div>
    </header>
  );
}
