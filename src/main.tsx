import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { AudioMain } from "./audio/AudioMain.ts";

const seq_steps = 8;
const init_bpm = 120;
const audio_main = new AudioMain(seq_steps, init_bpm);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App num_steps={seq_steps} init_bpm={init_bpm} audio_main={audio_main} />
  </React.StrictMode>
);
