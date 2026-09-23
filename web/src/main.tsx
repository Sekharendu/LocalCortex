import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { ChatProvider } from "./state/chat";
import { DocumentsProvider } from "./state/documents";
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
