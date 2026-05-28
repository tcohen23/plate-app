import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { BiometricLock } from "./components/BiometricLock";
import "./index.css";

// Redirect old Viktor Space URLs → Cloudflare Pages (the real app)
if (typeof window !== "undefined" && window.location.hostname.endsWith(".viktor.space")) {
  window.location.replace(
    "https://plate-app.pages.dev" + window.location.pathname + window.location.search + window.location.hash
  );
}

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConvexAuthProvider client={convex}>
      <BrowserRouter>
        <BiometricLock>
          <App />
        </BiometricLock>
      </BrowserRouter>
    </ConvexAuthProvider>
  </StrictMode>,
);
