import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { AudioMain } from "./audio/AudioMain.ts";
const audio_main = new AudioMain(8, 120);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App audio_main={audio_main} />
  </React.StrictMode>
);
