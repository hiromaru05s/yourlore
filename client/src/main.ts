// ============================================================
// LORE — client entry point.
// ============================================================
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/card.css";
import "./styles/game.css";
import "./styles/screens.css";
import { App } from "./router";

const root = document.getElementById("app");
if (root) new App(root).start();
