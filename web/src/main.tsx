import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { ChatProvider } from "./state/chat";
import { DocumentsProvider } from "./state/documents";
// Fonts are bundled (not fetched from Google), so the app still works offline.
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/source-serif-4/600.css";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ChatProvider>
      <DocumentsProvider>
        <App />
      </DocumentsProvider>
    </ChatProvider>
  </StrictMode>,
);
