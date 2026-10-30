import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { registerUpdates } from "./ui/update.ts";
import "./styles/app.css";
import "./styles/city-states.css";
import "./styles/map-glance.css";
import "./styles/map-uncluttered.css";
import "./styles/map-living.css";

createRoot(document.getElementById("app")!).render(<App />);

// Installable, and fast from cache on later visits (see service-worker.js, written by the build); a new version takes
// over at once on the start screen, and after a tap during a game (ui/update.ts).
if (import.meta.env.PROD) registerUpdates();
