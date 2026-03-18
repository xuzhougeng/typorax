import "./styles.css";

import { TyporaxApp } from "./app";

const root = document.querySelector<HTMLElement>("#app");

if (!root) {
  throw new Error("Missing #app root");
}

new TyporaxApp(root);

