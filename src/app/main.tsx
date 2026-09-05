import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@ui/base.css";
import "@ui/components/components.css";
import "./screens.css";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
