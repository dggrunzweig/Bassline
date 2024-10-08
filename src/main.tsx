import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { AudioMain } from "./audio/AudioMain.ts";
import { kDefaultPreset } from "./Presets.ts";
import { CookiesProvider } from "react-cookie";

const seq_steps = 8;
const audio_main = new AudioMain(seq_steps, kDefaultPreset.bpm);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <CookiesProvider>
      <App num_steps={seq_steps} audio_main={audio_main} />
    </CookiesProvider>
  </React.StrictMode>
);
