import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { DebugPanel, diagnosticsText } from "./components/DebugPanel";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { debugEnabled, diagnostics } from "./diagnostics";
import "@fontsource/newsreader/400.css";
import "@fontsource/newsreader/400-italic.css";
import "@fontsource/newsreader/600.css";
import "@fontsource/public-sans/400.css";
import "@fontsource/public-sans/600.css";
import "./index.css";

const LabPage = lazy(() => import("./lab/LabPage").then((module) => ({ default: module.LabPage })));

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element missing");
}

const isLab = /\/lab$/.test(window.location.pathname) || new URLSearchParams(window.location.search).has("lab");
if (isLab) window.__bootMounted?.();

function AppCrash({ detail }: { detail: string }) {
  return (
    <div className="app-crash" role="alert">
      <h1>The walkthrough stopped with an error</h1>
      <p>Please take a screenshot of this screen and send it along. Reloading usually helps.</p>
      <button type="button" onClick={() => window.location.reload()}>
        Reload
      </button>
      <pre>{`${detail}\n\n${diagnosticsText(diagnostics)}`}</pre>
    </div>
  );
}

createRoot(root).render(
  <StrictMode>
    {isLab ? (
      <Suspense fallback={null}>
        <LabPage />
      </Suspense>
    ) : (
      <>
        <ErrorBoundary fallback={(_, detail) => <AppCrash detail={detail} />}>
          <App />
        </ErrorBoundary>
        {debugEnabled ? <DebugPanel /> : null}
      </>
    )}
  </StrictMode>,
);
