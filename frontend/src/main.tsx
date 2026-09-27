import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { initMax } from "./max";
import "./styles.css";

initMax();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
