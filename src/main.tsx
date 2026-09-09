import React from "react";
import ReactDOM from "react-dom/client";
import "./terrain-protocol";
import App from "./App";
import "maplibre-gl/dist/maplibre-gl.css";
import "./styles.css";
import { initializeSounds } from "./sounds";
initializeSounds();
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
