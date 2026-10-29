import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import "./styles/app.css";
import "./styles/city-states.css";

createRoot(document.getElementById("app")!).render(<App />);

// Installable, and fast from cache on later visits (see service-worker.js, written by the build).
if (import.meta.env.PROD && "serviceWorker" in navigator) navigator.serviceWorker.register("service-worker.js", { updateViaCache: "none" }).catch(() => {});
