import { useTranslation } from "react-i18next";
import { useEffect, useState, useCallback } from "react";
import { Outlet, useNavigate, useOutletContext, useRouteError, Navigate } from "react-router-dom";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { Analytics } from "@vercel/analytics/react";
import { Helmet } from "react-helmet-async";
import { lazy, Suspense } from "react";

import type { ProjectFileData } from "./lib/projectFile";
import { softwareApplicationJsonLd } from "./seo/jsonLd";
import { openProjectFile } from "./lib/projectFile";
import { initStorageService } from "./lib/storageService";
import { reportRuntimeError } from "./lib/runtimeDiagnostics";
import { useIsNativePlatform } from "./hooks/useViewport";
import { hideNativeSplash } from "./lib/native/splash";
import { GoogleAdSense } from "./seo/GoogleAdSense";
const AppWorkspace = lazy(() =>
  import("./components/AppWorkspace").then((m) => ({ default: m.AppWorkspace }))
);
import { PublicLandingPage } from "./components/PublicLandingPage";
import { FeedbackModal } from "./components/FeedbackModal";
import { PrivacyPolicy } from "./components/legal/PrivacyPolicy";
import { TermsOfService } from "./components/legal/TermsOfService";
import { ContactPage } from "./components/legal/ContactPage";
import { AboutUsPage } from "./components/legal/AboutUsPage";
import { BlogIndex } from "./components/blog/BlogIndex";
import { ArticlePage } from "./components/blog/ArticlePage";
import { blogArticles } from "./data/blogArticles";
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

export type AppContextType = {
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
  const isNative = useIsNativePlatform();

  useEffect(() => {
    if (isNative) {
      document.documentElement.classList.add("is-native-platform");
    } else {
      document.documentElement.classList.remove("is-native-platform");
    }
  }, [isNative]);

  // WHY: Oznacza że React się zahydratował i pierwsza strona jest gotowa.
  // CSS w index.html (inline <style> w head) używa html.app-ready żeby
  // wyblaknąć splash screen przez transition opacity 1->0. Delay 3000ms
  // daje użytkownikowi 3 sekundy na zobaczenie splash screena z branding
  // (DINboard + KREATOR ROZDZIELNIC + pasek ładowania + wersja).
  useEffect(() => {
    const timer = window.setTimeout(() => {
      document.documentElement.classList.add("app-ready");
      // WHY: ukryj też natywny splash Capacitora (iOS/Android app). Na web
      // hideNativeSplash jest no-op (isNativePlatform false). Wywołane w tym
      // samym ticku co app-ready — web splash i native splash znikają razem.
      void hideNativeSplash();
    }, 3000);
    return () => window.clearTimeout(timer);
  }, []);

  const triggerSplash = () => {
    const splash = document.getElementById("app-splash");
    if (splash) {
      splash.style.display = "flex";
      // WHY: force reflow żeby przeglądarka zaaplikowała display:flex
      // zanim usuniemy klasę app-ready, co umożliwi płynne animacje.
      void splash.offsetWidth;
      document.documentElement.classList.remove("app-ready");
      
      setTimeout(() => {
        document.documentElement.classList.add("app-ready");
      }, 3000);
    }
  };

  const handleOpenNewProject = useCallback(() => {
    triggerSplash();
    setInitialAction("new");
    navigate("/app");
  }, [navigate]);

  const handleOpenProjectFile = useCallback(async () => {
    try {
      const data = await openProjectFile();
      if (data) {
        triggerSplash();
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
          boundary, so it survives render-tree failures).
          Native platform: Disabled to simplify Google Play Data Safety form. */}
      {!isNative && <Analytics />}
    </AppErrorBoundary>
  );
}

function LandingRoute() {
  const { t } = useTranslation();
  const { handleOpenNewProject, handleOpenProjectFile, openFeedback } = useOutletContext<AppContextType>();
  const isNative = useIsNativePlatform();

  if (isNative) {
    return <Navigate to="/app" replace />;
  }

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
        <meta property="og:description" content={t("auto.aplikacjadlaele_954", "Aplikacja dla elektryków umożliwiająca projektowanie rozdzielnic, tworzenie obwodów, obliczanie bilansu mocy oraz generowania dokumentacji instalacji elektrycznych.")} />
        <meta property="og:url" content="https://dinboard.pl/" />
        <meta name="twitter:title" content={t("auto.dinboardwebproj_272", "DINBoard Web – Projektowanie Rozdzielnic Elektrycznych")} />
        <meta name="twitter:description" content={t("auto.aplikacjadlaele_726", "Aplikacja dla elektryków do projektowania rozdzielnic, obliczania bilansu mocy i generowania dokumentacji.")} />
        {/* WHY: the SoftwareApplication schema is the only one that legitimately
            describes the product itself. Every other route uses a different
            @type so Google doesn't see duplicate-entity signals across
            the site. The static block in index.html was removed for the
            same reason — see src/seo/jsonLd.ts. */}
        <script type="application/ld+json">
          {JSON.stringify(softwareApplicationJsonLd())}
        </script>
      </Helmet>
      <GoogleAdSense />
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
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fallbackUi = (
    <div className="app-workspace-loading" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#888' }}>
      {t("auto.loading_editor", "Ładowanie edytora...")}
    </div>
  );

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
      {isMounted ? (
        <Suspense fallback={fallbackUi}>
          <AppWorkspace
            initialAction={initialAction}
            initialData={initialData}
            onOpenFeedback={openFeedback}
          />
        </Suspense>
      ) : fallbackUi}
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
      { path: "kontakt", element: <ContactPage /> },
      { path: "o-nas", element: <AboutUsPage /> },
      { path: "poradniki", element: <BlogIndex /> },
      {
        path: "poradniki/:slug",
        element: <ArticlePage />,
        // WHY: vite-react-ssg skips dynamic (":param") routes by default and
        // never emits a static HTML file for them, which is why every
        // /poradniki/<slug> page 404'd in production despite being linked
        // from the /poradniki index. getStaticPaths tells it exactly which
        // concrete article URLs exist so each one gets its own prerendered
        // dist/poradniki/<slug>/index.html.
        getStaticPaths: () => blogArticles.map((article) => `poradniki/${article.slug}`),
      },
    ],
  },
];

export default function App() {
  return null;
}
