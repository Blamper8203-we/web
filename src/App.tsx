import { useTranslation } from "react-i18next";
import { useEffect, useState, useCallback } from "react";
import { Outlet, useNavigate, useOutletContext, useRouteError } from "react-router-dom";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { Analytics } from "@vercel/analytics/react";
import { Helmet } from "react-helmet-async";

import type { ProjectFileData } from "./lib/projectFile";
import { openProjectFile } from "./lib/projectFile";
import { initStorageService } from "./lib/storageService";
import { reportRuntimeError } from "./lib/runtimeDiagnostics";

import { AppWorkspace } from "./components/AppWorkspace";
import { PublicLandingPage } from "./components/PublicLandingPage";
import { FeedbackModal } from "./components/FeedbackModal";
import { PrivacyPolicy } from "./components/legal/PrivacyPolicy";
import { TermsOfService } from "./components/legal/TermsOfService";
import { CookieConsent } from "./components/CookieConsent";

import "./App.css";
import "./components/AppLayout.css";
import "./components/Responsive.css";
import "./components/MainContent.css";
import "./components/PhaseList.css";
import "./components/UI/Cards.css";
import "./components/UI/Forms.css";
import "./components/UI/Buttons.css";
import "./components/WorkspaceHUD.css";

type AppContextType = {
  initialAction: "new" | "last" | "load_data" | null;
  initialData: ProjectFileData | null;
  handleOpenNewProject: () => void;
  handleOpenProjectFile: () => Promise<void>;
  openFeedback: () => void;
};

export function AppLayout() {
  const [initialAction, setInitialAction] = useState<"new" | "last" | "load_data" | null>(null);
  const [initialData, setInitialData] = useState<ProjectFileData | null>(null);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const navigate = useNavigate();

  const handleOpenNewProject = useCallback(() => {
    setInitialAction("new");
    navigate("/app");
  }, [navigate]);

  const handleOpenProjectFile = useCallback(async () => {
    try {
      const data = await openProjectFile();
      if (data) {
        setInitialData(data);
        setInitialAction("load_data");
        navigate("/app");
      }
    } catch (e) {
      reportRuntimeError(e, { source: "unhandled-error" });
    }
  }, [navigate]);

  useEffect(() => {
    initStorageService();
  }, []);

  const contextValue: AppContextType = {
    initialAction,
    initialData,
    handleOpenNewProject,
    handleOpenProjectFile,
    openFeedback: () => setIsFeedbackModalOpen(true),
  };

  return (
    <AppErrorBoundary>
      <Outlet context={contextValue} />
      {isFeedbackModalOpen && <FeedbackModal onClose={() => setIsFeedbackModalOpen(false)} />}
      {/* WHY: Cookie consent banner lives at the router root so it shows on
          every route (landing, app workspace, legal pages) exactly once per
          visitor. Drawn after the Outlet so it floats above page content
          regardless of which route is active. */}
      <CookieConsent />
      {/* WHY: mount Analytics at the router root so it tracks every page view
          (landing + workspace) without per-route wiring. Sits inside
          AppErrorBoundary so a render-time crash in the tracked tree still
          gets reported via Vercel (the script is in <head>, not under the
          boundary, so it survives render-tree failures). */}
      <Analytics />
    </AppErrorBoundary>
  );
}

function LandingRoute() {
  const { t } = useTranslation();
  const { handleOpenNewProject, handleOpenProjectFile, openFeedback } = useOutletContext<AppContextType>();
  return (
    <>
      {/* WHY: per-route head meta. vite-react-ssg renders this template into
          both dist/index.html and dist/app.html, so without Helmet both URLs
          would have identical canonical/og:url pointing to / — Google would
          then consolidate /app into / as a duplicate. Helmet adds the
          page-specific tags at SSG render time so each route owns its own
          canonical URL and social-share preview. */}
      <Helmet>
        <title>{t("auto.dinboardwebproj_226", "DINBoard Web – Projektowanie schematu instalacji elektrycznej")}</title>
        <meta name="description" content={t("auto.dinboardtoprofe_548", "DINBoard to profesjonalna aplikacja dla elektryków umożliwiająca projektowanie rozdzielnic, tworzenie obwodów, obliczanie bilansu mocy oraz generowanie dokumentacji zgodnej z polskimi standardami.")} />
        <link rel="canonical" href="https://dinboard.pl/" />
        <meta property="og:title" content={t("auto.dinboardwebproj_262", "DINBoard Web – Projektowanie Rozdzielnic Elektrycznych")} />
        <meta property="og:description" content={t("auto.aplikacjadlaele_954", "Aplikacja dla elektryków umożliwiająca projektowanie rozdzielnic, tworzenie obwodów, obliczanie bilansu mocy oraz generowanie dokumentacji instalacji elektrycznych.")} />
        <meta property="og:url" content="https://dinboard.pl/" />
        <meta name="twitter:title" content={t("auto.dinboardwebproj_272", "DINBoard Web – Projektowanie Rozdzielnic Elektrycznych")} />
        <meta name="twitter:description" content={t("auto.aplikacjadlaele_726", "Aplikacja dla elektryków do projektowania rozdzielnic, obliczania bilansu mocy i generowania dokumentacji.")} />
      </Helmet>
      <PublicLandingPage
        onOpenNewProject={handleOpenNewProject}
        onOpenProjectFile={handleOpenProjectFile}
        onOpenFeedback={openFeedback}
      />
    </>
  );
}

function AppRoute() {
  const { t } = useTranslation();
  const { initialAction, initialData, openFeedback } = useOutletContext<AppContextType>();
  return (
    <>
      {/* WHY: /app is the actual work surface (workspace editor). It requires
          JavaScript and user interaction — Google can't crawl it meaningfully.
          noindex prevents it from appearing in search results. */}
      <Helmet>
        <title>{t("auto.dinboardotwrzlu_661", "DINBoard – Otwórz lub utwórz projekt rozdzielnicy")}</title>
        <meta name="robots" content={t("auto.noindexnofollow_652", "noindex, nofollow")} />
        <meta name="description" content={t("auto.edytorrozdzieln_802", "Edytor rozdzielnicy DINBoard — narzędzie do projektowania, nie strona publiczna.")} />
        <link rel="canonical" href="https://dinboard.pl/app" />
      </Helmet>
      <AppWorkspace
        initialAction={initialAction}
        initialData={initialData}
        onOpenFeedback={openFeedback}
      />
    </>
  );
}

function RootRouteErrorFallback() {
  const { t } = useTranslation();
  const error = useRouteError();
  const errorMessage = error instanceof Error ? error.message : String(error);

  return (
    <main className="app-error-boundary" role="alert">
      <section className="app-error-boundary__panel">
        <div className="app-error-boundary__mark">!</div>
        <div className="app-error-boundary__copy">
          <span className="app-error-boundary__eyebrow">{t("auto.dinboardweb_743", "DINBoard Web")}</span>
          <h1>{t("auto.aplikacjawymaga_798", "Aplikacja wymaga odświeżenia")}</h1>
          <p>
            Struktura plików została zaktualizowana i obecna wersja w przeglądarce 
            straciła z nią synchronizację (częsty objaw np. podczas ładowania modułów tła).
          </p>
          <p className="app-error-boundary__hint">
            Oryginalny błąd: {errorMessage}
          </p>
        </div>
        <div className="app-error-boundary__actions">
          <button type="button" className="accent-btn" onClick={() => window.location.reload()}>
            Odśwież nową wersję
          </button>
        </div>
      </section>
    </main>
  );
}

export const routes = [
  {
    path: "/",
    element: <AppLayout />,
    errorElement: <RootRouteErrorFallback />,
    children: [
      { index: true, element: <LandingRoute /> },
      { path: "app", element: <AppRoute /> },
      { path: "polityka-prywatnosci", element: <PrivacyPolicy /> },
      { path: "regulamin", element: <TermsOfService /> },
    ],
  },
];

export default function App() {
  return null;
}
