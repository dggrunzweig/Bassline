import { useEffect, useRef, useState } from "react";
import BackgroundDiv from "./components/BackgroundDiv";
import TwoDButton from "./components/2DButton";
import Knob from "./components/Knob";
import ToggleSlider from "./components/ToggleSlider";
import { isMobileOnly } from "react-device-detect";
import { ColorPalette } from "./components/Colors";

import { AudioMain } from "./audio/AudioMain";
import Visualizer from "./components/Visualizer";
import { SequencerPreset1 } from "./Presets";
import InstructionOverlay from "./components/InstructionOverlay";
import SettingsMenu from "./components/SettingsMenu";

interface props {
  num_steps: number;
  init_bpm: number;
  audio_main: AudioMain;
}

const App = ({ num_steps, init_bpm, audio_main }: props) => {
  // prevent use on mobile platforms

  const [palette, setPalette] = useState(0);
  if (isMobileOnly) {
    return (
      <div>
        <BackgroundDiv palette={palette}>
          <p
            className={
              "flex flex-col justify-center items-center h-full text-center font-mono text-xl text-wrap" +
              ColorPalette(palette).text_1
            }
          >
            This App is Only Available on Desktop 😭
          </p>
        </BackgroundDiv>
      </div>
    );
  }

  // track window width to prevent window from becoming too small
  const [validDimensions, setValidDimensions] = useState(true);
  useEffect(() => {
    const window_resize = () => {
      if (window.innerWidth < 1024) {
        setValidDimensions(false);
      } else {
        setValidDimensions(true);
      }
    };
    window.addEventListener("resize", window_resize);
    return () => {
      window.removeEventListener("resize", window_resize);
    };
  });

  // states
  const BPM = useRef(init_bpm);

  const [current_step, setCurrentStep] = useState(0);

  const [running, setRunning] = useState(false);
  const [recording, setRecording] = useState(false);
  const [octave, setOctave] = useState(1);
  const [view_instructions, setViewInstructions] = useState(true);
  const [view_settings_menu, setViewSettingsMenu] = useState(false);

  // update timer to check current step in sequencer
  useEffect(() => {
    setInterval(() => {
      setCurrentStep(audio_main.GetCurrentStep());
    }, 100);
  });

  // Should we fill in the machine with a basic preset when the page is opened
  const use_preset = true;

  // per step parameters
  audio_main.setOctave(octave);

  const vel_init = 0.9;
  const velocity = useRef(new Array<number>(num_steps).fill(vel_init));
  if (use_preset) {
    velocity.current = SequencerPreset1.Volume;
  } else velocity.current = new Array<number>(num_steps).fill(vel_init);
  audio_main.setVelocity(velocity.current);

  const decay_init = 0.2;
  const decay = useRef(new Array<number>(num_steps).fill(decay_init));
  if (use_preset) {
    decay.current = SequencerPreset1.Decay;
  } else decay.current = new Array<number>(num_steps).fill(decay_init);
  audio_main.setDecay(decay.current);

  const pb_init = 0.2;
  const pitch_bend = useRef(new Array<number>(num_steps).fill(pb_init));
  if (use_preset) {
    pitch_bend.current = SequencerPreset1.PitchBend;
  } else pitch_bend.current = new Array<number>(num_steps).fill(pb_init);
  audio_main.setPitchBend(pitch_bend.current);

  const tone_init = 0.1;
  const tone = useRef(new Array<number>(num_steps).fill(tone_init));
  if (use_preset) {
    tone.current = SequencerPreset1.Tone;
  } else tone.current = new Array<number>(num_steps).fill(tone_init);
  audio_main.setTone(tone.current);

  const steps = useRef(new Array<number>(num_steps).fill(0));
  if (use_preset) {
    steps.current = SequencerPreset1.Steps;
  } else steps.current = new Array<number>(num_steps).fill(0);
  audio_main.SetSteps(steps.current);

  // Per step setter functions for 2D Button
  const Toggle = (on: boolean, step_index: number) => {
    steps.current[step_index] = on ? 1 : 0;
    audio_main.SetSteps(steps.current);
  };
  const xDragPrimary = (x: number, step_index: number) => {
    decay.current[step_index] = x;
    audio_main.setDecay(decay.current);
  };
  const yDragPrimary = (y: number, step_index: number) => {
    velocity.current[step_index] = y;
    audio_main.setVelocity(velocity.current);
  };
  const xDragSecondary = (x: number, step_index: number) => {
    tone.current[step_index] = x;
    audio_main.setTone(tone.current);
  };
  const yDragSecondary = (y: number, step_index: number) => {
    pitch_bend.current[step_index] = y;
    audio_main.setPitchBend(pitch_bend.current);
  };

  // Knob Parameters
  // ring mod
  const fm_params = useRef({
    frequency: 100,
    range: 0,
  });
  audio_main.SetRingModParams(
    fm_params.current.frequency,
    fm_params.current.range
  );

  // delay
  const delay_params = useRef({
    mix: -30,
    fb: -12,
  });
  audio_main.setDelayParams(delay_params.current.mix, delay_params.current.fb);

  // High Pass Filter
  const hpf = useRef(20);
  audio_main.setHPFrequency(hpf.current);

  // Prevent display is the window is too narrow
  if (!validDimensions) {
    return (
      <div>
        <BackgroundDiv palette={palette}>
          <p
            className={
              "flex flex-col w-full items-center justify-center h-full text-center font-mono text-xl  text-wrap" +
              ColorPalette(palette).text_1
            }
          >
            Window is too narrow!!!
          </p>
        </BackgroundDiv>
      </div>
    );
  }

  // Full App
  return (
    <>
      <BackgroundDiv palette={palette}>
        <div className="flex flex-col w-full h-full items-center overflow-hidden">
          <InstructionOverlay
            open={view_instructions}
            onClose={setViewInstructions}
            palette={palette}
          />
          <SettingsMenu
            isOpen={view_settings_menu}
            onClose={setViewSettingsMenu}
            palette={palette}
            audio_main={audio_main}
          />
          <div className="flex flex-col w-full h-full px-20 pt-10 gap-10 max-w-screen-2xl overflow-hidden">
            <div className="flex flex-row justify-between items-end">
              <h1
                className={
                  "text-8xl font-mono -ml-2" + ColorPalette(palette).text_header
                }
              >
                SUBSTRATA
              </h1>
              <div className="flex flex-row gap-4">
                <button
                  className={
                    "text-md h-max w-max rounded-xl border font-mono p-3" +
                    ColorPalette(palette).text_1 +
                    ColorPalette(palette).knob_border
                  }
                  onClick={() => {
                    setViewInstructions(true);
                  }}
                >
                  Instructions
                </button>
                <button
                  className={
                    "text-md h-max w-max rounded-xl border font-mono p-3" +
                    ColorPalette(palette).text_1 +
                    ColorPalette(palette).knob_border
                  }
                  onClick={() => {
                    setViewSettingsMenu(true);
                  }}
                >
                  Settings
                </button>
              </div>
            </div>
            <div className="grid grid-cols-8 h-auto gap-x-5 gap-y-10 w-full bg-transparent items-center">
              <div className="flex flex-col gap-4">
                <button
                  className={
                    "text-xl border h-1/4 w-full font-mono" +
                    ColorPalette(palette).text_1 +
                    ColorPalette(palette).knob_border
                  }
                  onClick={() => {
                    audio_main.Start();
                    setRunning(audio_main.isRunning());
                  }}
                  disabled={audio_main.isUsingMidi()}
                >
                  {audio_main.isUsingMidi()
                    ? "EXT MIDI"
                    : running
                    ? "Stop"
                    : "Run"}
                </button>
                <button
                  className={
                    "text-xl border h-1/4 w-full font-mono" +
                    ColorPalette(palette).text_1 +
                    ColorPalette(palette).knob_border
                  }
                  onClick={() => {
                    audio_main.RecordAudio(32, setRecording);
                  }}
                  disabled={recording}
                >
                  {recording ? "Recording" : "Record"}
                </button>
              </div>
              <Knob
                key="1000"
                init_value={BPM.current}
                units=""
                min_value={60}
                max_value={180}
                name="Tempo"
                enabled={!audio_main.isUsingMidi()}
                onChange={(x: number) => {
                  BPM.current = x;
                  audio_main.setBPM(x);
                }}
                palette={palette}
              />
              <Knob
                key="1001"
                init_value={fm_params.current.frequency}
                units="Hz"
                min_value={1}
                max_value={300}
                name="FM Freq"
                enabled={true}
                onChange={(x: number) => {
                  fm_params.current.frequency = x;
                  audio_main.SetRingModParams(x, fm_params.current.range);
                }}
                palette={palette}
              />
              <Knob
                key="1002"
                init_value={fm_params.current.range}
                units="Hz"
                min_value={0}
                max_value={1000}
                name="FM Lvl"
                enabled={true}
                onChange={(x: number) => {
                  fm_params.current.range = x;
                  audio_main.SetRingModParams(fm_params.current.frequency, x);
                }}
                palette={palette}
              />
              <Knob
                key="1003"
                init_value={delay_params.current.mix}
                units="dB"
                min_value={-30}
                max_value={0}
                name="Echo Lvl"
                enabled={true}
                onChange={(x: number) => {
                  delay_params.current.mix = x;
                  audio_main.setDelayParams(x, delay_params.current.fb);
                }}
                palette={palette}
              />
              <Knob
                key="1004"
                init_value={delay_params.current.fb}
                units="dB"
                min_value={-30}
                max_value={-3}
                name="Echo FB"
                enabled={true}
                onChange={(x: number) => {
                  delay_params.current.fb = x;
                  audio_main.setDelayParams(delay_params.current.mix, x);
                }}
                palette={palette}
              />
              <Knob
                key="1005"
                init_value={hpf.current}
                units="Hz"
                min_value={20}
                max_value={500}
                name="HPF"
                enabled={true}
                onChange={(x: number) => {
                  hpf.current = x;
                  audio_main.setHPFrequency(x);
                }}
                palette={palette}
              />

              <Visualizer analyzer={audio_main.GetAnalyzer()} />
              {steps.current.map((_, i) => {
                return (
                  <div key={i}>
                    <TwoDButton
                      Toggle={Toggle}
                      XDragPrimary={xDragPrimary}
                      YDragPrimary={yDragPrimary}
                      XDragSecondary={xDragSecondary}
                      YDragSecondary={yDragSecondary}
                      step_index={i}
                      selected_index={current_step}
                      x_p_init={decay.current[i]}
                      y_p_init={velocity.current[i]}
                      x_s_init={tone.current[i]}
                      y_s_init={pitch_bend.current[i]}
                      toggle_init={steps.current[i] == 1}
                      palette={palette}
                    />
                  </div>
                );
              })}
            </div>

            <div className="grid grid-row-2 w-full h-full pb-10">
              <div className="flex flex-col gap-y-3 h-full">
                <ToggleSlider
                  title="Octave"
                  on_init={octave == 2}
                  text_color={ColorPalette(palette).text_1}
                  border_color={ColorPalette(palette).knob_border}
                  knob_color={" bg-slate-50 "}
                  knob_active_color={" bg-slate-50 "}
                  text_off="Low"
                  text_on="High"
                  onToggle={(on: boolean) => {
                    const o = on ? 2 : 1;
                    setOctave(o);
                    audio_main.setOctave(o);
                  }}
                />
                {/* <ToggleSlider
                  title="Preset"
                  on_init={use_preset}
                  text_color={ColorPalette(palette).text_2}
                  border_color={ColorPalette(palette).border_button_standard}
                  knob_color={ColorPalette(0).knob_dot}
                  knob_active_color={ColorPalette(0).knob_dot}
                  text_off="Off"
                  text_on="On"
                  onToggle={(on: boolean) => {
                    setPreset(on);
                  }}
                /> */}
                <ToggleSlider
                  title="Colors"
                  on_init={palette == 1}
                  text_color={ColorPalette(palette).text_1}
                  border_color={ColorPalette(palette).knob_border}
                  knob_color={" bg-slate-50 "}
                  knob_active_color={ColorPalette(1).knob_dot}
                  text_off="Open Sky"
                  text_on="Till Dawn"
                  onToggle={(on: boolean) => {
                    setPalette(on ? 1 : 0);
                  }}
                />
              </div>
              <div className="flex h-full justify-end items-end">
                <div>
                  <h1
                    className={
                      "text-xl font-mono text-right" +
                      ColorPalette(palette).text_2
                    }
                  >
                    Designed with love by David Grunzweig
                  </h1>
                  <p
                    className={
                      "text-md font-mono text-right mt-2" +
                      ColorPalette(palette).text_2
                    }
                  >
                    <a
                      target="_blank"
                      rel="noopener noreferrer"
                      href="https://greentwig.xyz"
                      className={
                        "underline italic" + ColorPalette(palette).link
                      }
                    >
                      Green Twig Studios
                    </a>
                    , 2024
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </BackgroundDiv>
    </>
  );
};

export default App;
