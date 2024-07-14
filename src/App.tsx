import React, { Suspense, useEffect, useState } from "react";
import BackgroundDiv from "./BackgroundDiv";
import TwoDButton from "./2DButton";
import {
  createAudioContext,
  createOscillator,
  createGain,
  db2mag,
  createCompressor,
} from "./Utilities";

const App = () => {
  const [ctx, setCtx] = useState(createAudioContext());
  const [comp, setComp] = useState(createCompressor(ctx, -12, 4, 4, 0.03, 0.1));

  const [num_steps, setNumSteps] = useState(8);

  const [velocity, setVelocity] = useState(
    new Array<number>(num_steps).fill(0)
  );
  const [decay, setDecay] = useState(new Array<number>(num_steps).fill(0));
  const [pitch_bend, setPitchBend] = useState(
    new Array<number>(num_steps).fill(0)
  );
  const [tone, setTone] = useState(new Array<number>(num_steps).fill(0));
  const [steps, setSteps] = useState(new Array<number>(num_steps).fill(0));

  const [current_step, setCurrentStep] = useState(0);
  const [running, setRunning] = useState(false);

  const BPM = 120;
  useEffect(() => {
    setTimeout(() => {
      if (!running) return;
      if (steps[current_step] == 1) {
        const root_hz = 80;
        const osc = createOscillator(
          ctx,
          "sine",
          root_hz + 640 * pitch_bend[current_step],
          0
        );
        osc.frequency.setTargetAtTime(
          80,
          ctx.currentTime,
          0.4 * decay[current_step]
        );
        const fm_osc = createOscillator(ctx, "square", root_hz * 1.2, 0);
        const fm_gain = createGain(ctx, tone[current_step] * 200);
        fm_osc.connect(fm_gain).connect(osc.frequency);
        fm_osc.start();
        osc.start(ctx.currentTime);
        const vca = createGain(ctx, db2mag(-12 * (1 - velocity[current_step])));
        const gain = createGain(ctx, db2mag(-6));
        osc.connect(vca).connect(gain).connect(comp).connect(ctx.destination);
        vca.gain.setTargetAtTime(0, ctx.currentTime, 1 * decay[current_step]);
        setTimeout(() => {
          osc.stop();
          osc.disconnect();
          vca.disconnect();
        }, 2000);
      }

      const nx_step = (current_step + 1) % num_steps;
      setCurrentStep(nx_step);
    }, (60 / (4 * BPM)) * 1000);
  });

  onkeydown = (e: KeyboardEvent) => {
    if (e.key == " ") {
      if (ctx.state == "suspended") ctx.resume();
      setRunning(!running);
      if (!running) setCurrentStep(0);
    }
  };

  const Toggle = (on: boolean, step_index: number) => {
    steps[step_index] = on ? 1 : 0;
    setSteps(steps);
  };
  const xDragPrimary = (x: number, step_index: number) => {
    decay[step_index] = x;
    setDecay(decay);
  };
  const yDragPrimary = (y: number, step_index: number) => {
    velocity[step_index] = y;
    setVelocity(velocity);
  };
  const xDragSecondary = (x: number, step_index: number) => {
    tone[step_index] = x;
    setTone(tone);
  };
  const yDragSecondary = (y: number, step_index: number) => {
    pitch_bend[step_index] = y;
    setPitchBend(pitch_bend);
  };

  return (
    <div>
      <BackgroundDiv>
        <div className="flex flex-col justify-center w-full h-screen align-middle">
          <div className="grid grid-cols-8 gap-4 px-20 bg-transparent">
            {steps.map((s, i) => {
              return (
                <TwoDButton
                  key={i}
                  Toggle={Toggle}
                  XDragPrimary={xDragPrimary}
                  YDragPrimary={yDragPrimary}
                  XDragSecondary={xDragSecondary}
                  YDragSecondary={yDragSecondary}
                  step_index={i}
                  selected_index={current_step}
                />
              );
            })}
          </div>
        </div>
      </BackgroundDiv>
    </div>
  );
};

export default App;
