import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { LabPage } from "./lab/LabPage";
import "@fontsource/newsreader/400.css";
import "@fontsource/newsreader/400-italic.css";
import "@fontsource/newsreader/600.css";
import "@fontsource/public-sans/400.css";
import "@fontsource/public-sans/600.css";
import "./index.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element missing");
}

const isLab = /\/lab$/.test(window.location.pathname) || new URLSearchParams(window.location.search).has("lab");

createRoot(root).render(<StrictMode>{isLab ? <LabPage /> : <App />}</StrictMode>);
