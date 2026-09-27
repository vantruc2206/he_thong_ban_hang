import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";
import { inventoryItems } from "./app/data/mockData";

(window as any).__MOCK_INVENTORY__ = inventoryItems;

createRoot(document.getElementById("root")!).render(<App />);
  