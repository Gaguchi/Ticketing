import { unstableSetRender } from "antd";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

// Configure Ant Design for React 19 compatibility
unstableSetRender((node, container) => {
  (container as any)._reactRoot ||= createRoot(container);
  const root: Root = (container as any)._reactRoot;
  root.render(node);
  return async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    root.unmount();
  };
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
