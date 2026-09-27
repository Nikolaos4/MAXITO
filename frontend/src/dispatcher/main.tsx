import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { initMax } from "../max";
import "../styles.css";
import { App } from "./App";

initMax();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
