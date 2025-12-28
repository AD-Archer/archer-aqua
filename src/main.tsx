import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { init } from "@plausible-analytics/tracker";
import App from "./App.tsx";
import "./index.css";

init({
  domain: "aqua.adarcher.app",
  endpoint: "https://plausible.adarcher.app/api/event",
  formSubmissions: true,
  outboundLinks: true,
});

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
