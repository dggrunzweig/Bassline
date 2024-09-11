import { AudioMain } from "../audio/AudioMain";
import { ColorPalette } from "./Colors";
import { useState, useRef } from "react";
import Knob from "./Knob";
import Visualizer from "./Visualizer";
import { SynthPreset } from "../Presets";

interface props {
  synth_settings: SynthPreset;
  setSynthSettings: (settings: SynthPreset) => void;
  palette: number;
  audio_main: AudioMain;
}

const UpperSettingsPane = ({
  synth_settings,
  setSynthSettings,
  palette,
  audio_main,
}: props) => {
  const [running, setRunning] = useState(false);
  const [recording, setRecording] = useState(false);

  // Knob Parameters
  // FM
  audio_main.SetGlobalFM(synth_settings.fm_mult, synth_settings.fm_level);

  // delay
  audio_main.setDelayParams(synth_settings.echo_level, synth_settings.echo_fb);

  // High Pass Filter
  audio_main.setHPFrequency(synth_settings.hpf);

  return (
    <div className="grid grid-cols-8 h-auto gap-x-5 gap-y-10 w-full bg-transparent items-center">
      <div className="flex flex-col gap-4">
        <button
          className={
            "text-xl border h-1/4 w-full font-mono" +
            ColorPalette(palette).text_1 +
            ColorPalette(palette).knob_border
          }
          onClick={() => {
            audio_main.Run();
            setRunning(audio_main.isRunning());
          }}
          disabled={audio_main.isUsingMidi()}
        >
          {audio_main.isUsingMidi() ? "EXT MIDI" : running ? "Stop" : "Run"}
        </button>
        <button
          className={
            "text-xl border h-1/4 w-full font-mono" +
            ColorPalette(palette).text_1 +
            ColorPalette(palette).knob_border
          }
          onClick={() => {
            audio_main.RecordAudio(setRecording);
          }}
          disabled={recording}
        >
          {recording ? "Recording" : "Record"}
        </button>
      </div>
      <Knob
        key="1000"
        init_value={synth_settings.bpm}
        units=""
        min_value={60}
        max_value={180}
        name="Tempo"
        enabled={!audio_main.isUsingMidi()}
        use_float={false}
        onChange={(x: number) => {
          audio_main.setBPM(x);
          setSynthSettings({ ...synth_settings, bpm: x });
        }}
        palette={palette}
      />
      <Knob
        key="1001"
        init_value={synth_settings.fm_mult}
        units="X"
        min_value={0}
        max_value={10}
        name="FM Mult"
        enabled={true}
        use_float={true}
        onChange={(x: number) => {
          setSynthSettings({ ...synth_settings, fm_mult: x });
        }}
        palette={palette}
      />
      <Knob
        key="1002"
        init_value={synth_settings.fm_level}
        units="dB"
        min_value={-24}
        max_value={24}
        name="FM Lvl"
        enabled={true}
        use_float={false}
        onChange={(x: number) => {
          setSynthSettings({ ...synth_settings, fm_level: x });
        }}
        palette={palette}
      />
      <Knob
        key="1003"
        init_value={synth_settings.echo_level}
        units="dB"
        min_value={-30}
        max_value={0}
        name="Echo Lvl"
        enabled={true}
        use_float={false}
        onChange={(x: number) => {
          setSynthSettings({ ...synth_settings, echo_level: x });
        }}
        palette={palette}
      />
      <Knob
        key="1004"
        init_value={synth_settings.echo_fb}
        units="dB"
        min_value={-30}
        max_value={-3}
        name="Echo FB"
        enabled={true}
        use_float={false}
        onChange={(x: number) => {
          setSynthSettings({ ...synth_settings, echo_fb: x });
        }}
        palette={palette}
      />
      <Knob
        key="1005"
        init_value={synth_settings.hpf}
        units="Hz"
        min_value={20}
        max_value={500}
        name="HPF"
        enabled={true}
        use_float={false}
        onChange={(x: number) => {
          setSynthSettings({ ...synth_settings, hpf: x });
        }}
        palette={palette}
      />

      <Visualizer analyzer={audio_main.GetAnalyzer()} />
    </div>
  );
};

export default UpperSettingsPane;
