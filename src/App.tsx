import { useRef, useState } from "react";
import BackgroundDiv from "./components/BackgroundDiv";
import TwoDButton from "./components/2DButton";
import Knob from "./components/Knob";
import { isMobile } from "react-device-detect";

import { AudioMain } from "./audio/AudioMain";
import Visualizer from "./components/Visualizer";

const App = () => {
  if (isMobile) {
    return (
      <div>
        <BackgroundDiv>
          <p className="flex items-center h-screen text-center font-mono text-xl text-slate-50 text-wrap">
            This App is Only Available on Desktop 😭
          </p>
        </BackgroundDiv>
      </div>
    );
  }
  const num_steps = 8;
  const BPM = useRef(120);

  const [current_step, setCurrentStep] = useState(0);

  const [running, setRunning] = useState(false);

  const audio_main = useRef(
    new AudioMain(num_steps, BPM.current, setCurrentStep)
  );

  // per step parameters
  const vel_init = 0.9;
  const velocity = useRef(new Array<number>(num_steps).fill(vel_init));
  audio_main.current.setVelocity(velocity.current);

  const decay_init = 0.2;
  const decay = useRef(new Array<number>(num_steps).fill(decay_init));
  audio_main.current.setDecay(decay.current);

  const pb_init = 0.2;
  const pitch_bend = useRef(new Array<number>(num_steps).fill(pb_init));
  audio_main.current.setPitchBend(pitch_bend.current);

  const tone_init = 0.1;
  const tone = useRef(new Array<number>(num_steps).fill(tone_init));
  audio_main.current.setTone(tone.current);

  const steps = useRef(new Array<number>(num_steps).fill(0));
  audio_main.current.SetSteps(steps.current);

  // ring mod
  const ring_mod_params = useRef({
    frequency: 100,
    gain: -24,
  });
  audio_main.current.SetRingModParams(
    ring_mod_params.current.frequency,
    ring_mod_params.current.gain
  );

  // delay
  const delay_params = useRef({
    mix: -30,
    fb: -12,
  });
  audio_main.current.setDelayParams(
    delay_params.current.mix,
    delay_params.current.fb
  );

  // High Pass Filter
  const hpf = useRef(20);
  audio_main.current.setHPFrequency(hpf.current);

  // Per step setter functions for 2D Button
  const Toggle = (on: boolean, step_index: number) => {
    steps.current[step_index] = on ? 1 : 0;
    audio_main.current.SetSteps(steps.current);
  };
  const xDragPrimary = (x: number, step_index: number) => {
    decay.current[step_index] = x;
    audio_main.current.setDecay(decay.current);
  };
  const yDragPrimary = (y: number, step_index: number) => {
    velocity.current[step_index] = y;
    audio_main.current.setVelocity(velocity.current);
  };
  const xDragSecondary = (x: number, step_index: number) => {
    tone.current[step_index] = x;
    audio_main.current.setTone(tone.current);
  };
  const yDragSecondary = (y: number, step_index: number) => {
    pitch_bend.current[step_index] = y;
    audio_main.current.setPitchBend(pitch_bend.current);
  };

  // The app itself
  return (
    <>
      <BackgroundDiv>
        <div>
          <div className="flex flex-col w-full h-screen px-20 pt-10 gap-10 overflow-hidden">
            <div className="flex flex-col gap-10">
              <h1 className="text-8xl font-mono text-slate-50 -ml-2">
                BASSLINE
              </h1>
              <p className="text-xl font-mono text-slate-50">
                click on a square to create a step in the sequence. <br />
                drag on the square to set primary settings. <br />
                <span className="pl-10">x = decay time, y = volume</span> <br />
                press "shift" and drag on the square to set secondary settings.{" "}
                <br />
                <span className="pl-10">x = tone, y = pitch bend</span> <br />
                holding "shift" while turning knobs immediately sets to minimum
                or maximum value.
              </p>
            </div>
            <div className="grid grid-cols-8 h-auto gap-x-5 gap-y-10 w-full max-w-screen-2xl bg-transparent items-center">
              <button
                className="text-xl text-slate-50 border border-slate-50 h-1/4 w-full font-mono"
                onClick={() => {
                  audio_main.current.Start();
                  setRunning(audio_main.current.isRunning());
                }}
              >
                {running ? "Stop" : "Run"}
              </button>
              <Knob
                key="1000"
                init_value={BPM.current}
                units=""
                min_value={60}
                max_value={180}
                name="Tempo"
                onChange={(x: number) => {
                  BPM.current = x;
                  audio_main.current.setBPM(x);
                }}
              />
              <Knob
                key="1001"
                init_value={ring_mod_params.current.frequency}
                units="Hz"
                min_value={20}
                max_value={1000}
                name="Mod Tone"
                onChange={(x: number) => {
                  ring_mod_params.current.frequency = x;
                  audio_main.current.SetRingModParams(
                    x,
                    ring_mod_params.current.gain
                  );
                }}
              />
              <Knob
                key="1002"
                init_value={ring_mod_params.current.gain}
                units="dB"
                min_value={-60}
                max_value={0}
                name="Mod Lvl"
                onChange={(x: number) => {
                  ring_mod_params.current.gain = x;
                  audio_main.current.SetRingModParams(
                    ring_mod_params.current.frequency,
                    x
                  );
                }}
              />
              <Knob
                key="1003"
                init_value={delay_params.current.mix}
                units="dB"
                min_value={-30}
                max_value={0}
                name="Delay Lvl"
                onChange={(x: number) => {
                  delay_params.current.mix = x;
                  audio_main.current.setDelayParams(x, delay_params.current.fb);
                }}
              />
              <Knob
                key="1004"
                init_value={delay_params.current.fb}
                units="dB"
                min_value={-30}
                max_value={0}
                name="Delay FB"
                onChange={(x: number) => {
                  delay_params.current.fb = x;
                  audio_main.current.setDelayParams(
                    delay_params.current.mix,
                    x
                  );
                }}
              />
              <Knob
                key="1005"
                init_value={hpf.current}
                units="Hz"
                min_value={20}
                max_value={500}
                name="HPF"
                onChange={(x: number) => {
                  hpf.current = x;
                  audio_main.current.setHPFrequency(x);
                }}
              />

              <Visualizer analyzer={audio_main.current.GetAnalyzer()} />
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
                      x_p_init={decay_init}
                      y_p_init={vel_init}
                      x_s_init={tone_init}
                      y_s_init={pb_init}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex w-full h-full justify-end items-end pb-10">
              <div>
                <h1 className="text-xl font-mono text-slate-500 text-right">
                  Designed with love by David Grunzweig
                </h1>
                <p className="text-md font-mono text-slate-500 text-right mt-2">
                  <a
                    target="_blank"
                    rel="noopener noreferrer"
                    href="https://greentwig.xyz"
                    className="underline italic text-indigo-300"
                  >
                    Green Twig Studios
                  </a>
                  , 2024
                </p>
              </div>
            </div>
          </div>
        </div>
      </BackgroundDiv>
    </>
  );
};

export default App;
