import { useState } from "react";
import { useTranslation } from "react-i18next";
import "./PublicLandingPage.css";
import "./landing/Landing.css";

import { useLandingAssets } from "./landing/useLandingAssets";
import { LandingHeader } from "./landing/LandingHeader";
import { LandingHero } from "./landing/LandingHero";
import { LandingSandboxPreview } from "./landing/LandingSandboxPreview";
import { LandingFeatures } from "./landing/LandingFeatures";
import { LandingKnowledgeBase } from "./landing/LandingKnowledgeBase";
import { LandingFaq } from "./landing/LandingFaq";
import { LandingFooter } from "./landing/LandingFooter";

export function PublicLandingPage({
  onOpenNewProject,
  onOpenProjectFile,
  onOpenFeedback,
}: {
  onOpenNewProject: () => void;
  onOpenProjectFile: () => void;
  onOpenFeedback: () => void;
}) {
  const isReady = useLandingAssets();
  const [showFab, setShowFab] = useState<boolean>(false);
  const { t } = useTranslation();

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    // Pokaż FAB, gdy zjedziemy w dół o więcej niż 600px
    if (e.currentTarget.scrollTop > 600) {
      setShowFab(true);
    } else {
      setShowFab(false);
    }
  };

  return (
    <div
      id="landing-page-root"
      onScroll={handleScroll}
      className={`landing-root ${isReady ? "is-ready" : ""}`}
    >
      <LandingHeader />
      <LandingHero onOpenProjectFile={onOpenProjectFile} onOpenNewProject={onOpenNewProject} />
      <LandingSandboxPreview />
      <LandingFeatures />
      <LandingKnowledgeBase />
      <LandingFaq />
      <LandingFooter onOpenFeedback={onOpenFeedback} />

      {/* Floating Action Button */}
      <button
        onClick={onOpenNewProject}
        className={`landing-fab ${showFab ? "is-visible" : ""}`}
      >
        <div className="landing-fab-icon-wrapper">
          <i data-lucide="plus" className="landing-fab-icon"></i>
        </div>
        <span className="landing-fab-text">{t("landing.buttonNew")}</span>
      </button>
    </div>
  );
}
