import { useState } from "react";
import "./PublicLandingPage.css";
import "./landing/landing-tailwind.css";

import { useTailwindSandbox } from "./landing/useTailwindSandbox";
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
  const isReady = useTailwindSandbox();
  const [showFab, setShowFab] = useState<boolean>(false);

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
      className={`bg-[#090D16] text-gray-100 font-sans antialiased min-h-screen ${isReady ? "is-ready" : ""}`}
    >
      {/* Reset podstawowych styli żeby nie odziedziczyć syfu ze starej aplikacji wew. tailwind scope */}
      <style>{`
        #landing-page-root {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          height: 100vh;
          width: 100%;
          overflow-y: auto;
          overflow-x: hidden;
          background-color: #090D16;
          z-index: 1000;
          font-family: 'Roboto', sans-serif !important;
          opacity: 0;
          transition: opacity 0.6s ease-in-out;
        }
        #landing-page-root.is-ready {
          opacity: 1;
        }
        #landing-page-root * {
          box-sizing: border-box;
          font-family: 'Roboto', sans-serif !important;
        }
      `}</style>

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
        className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[90] px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-[0_8px_30px_rgba(59,130,246,0.25)] flex items-center gap-2 transition-all duration-500 transform ${
          showFab ? "translate-y-0 opacity-100 scale-100" : "translate-y-24 opacity-0 scale-90 pointer-events-none"
        }`}
      >
        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
          <i data-lucide="plus" className="w-3.5 h-3.5 text-white"></i>
        </div>
        <span className="text-xs">Nowy projekt</span>
      </button>
    </div>
  );
}
