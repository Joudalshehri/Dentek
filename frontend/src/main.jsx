import { createRoot } from "react-dom/client";
import App from "./app/App";
import "./styles/index.css";
import "./styles/styles.css";

const root = document.getElementById("root");

createRoot(root).render(<App />);