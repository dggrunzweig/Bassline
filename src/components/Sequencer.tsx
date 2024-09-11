import { useState, useEffect } from "react";
import { AudioMain } from "../audio/AudioMain";
import { SynthPreset } from "../Presets";
import TwoDButton from "./2DButton";

interface props {
  synth_settings: SynthPreset;
  setSynthSettings: (settings: SynthPreset) => void;
  num_steps: number;
  audio_main: AudioMain;
  palette: number;
}

const Sequencer = ({
  synth_settings,
  setSynthSettings,
  audio_main,
  num_steps,
  palette,
}: props) => {
  const [current_step, setCurrentStep] = useState(0);

  // update timer to check current step in sequencer
  useEffect(() => {
    let request_id = 0;
    const UpdateStep = () => {
      // only redraw when necessary
      if (audio_main.GetCurrentStep() != current_step) {
        setCurrentStep(audio_main.GetCurrentStep());
      }
      request_id = window.requestAnimationFrame(UpdateStep);
    };
    UpdateStep();

    return () => {
      window.cancelAnimationFrame(request_id);
    };
  });

  // initial setting for audio engine
  for (let i = 0; i < num_steps; ++i) {
    audio_main.setVelocity(synth_settings.velocity[i], i);
    audio_main.setDecay(synth_settings.decay[i], i);
    audio_main.setPitchBend(synth_settings.pitch_bend[i], i);
    audio_main.setTone(synth_settings.tone[i], i);
    audio_main.SetTrigger(synth_settings.steps[i], i);
  }

  // Per step setter functions for 2D Button
  const Toggle = (on: boolean, step_index: number) => {
    audio_main.SetTrigger(on, step_index);
    const steps = synth_settings.steps;
    steps[step_index] = on;
    setSynthSettings({ ...synth_settings, steps: steps });
  };
  const xDragPrimary = (x: number, step_index: number) => {
    audio_main.setDecay(x, step_index);
    const decay = synth_settings.decay;
    decay[step_index] = x;
    setSynthSettings({ ...synth_settings, decay: decay });
  };
  const yDragPrimary = (y: number, step_index: number) => {
    audio_main.setVelocity(y, step_index);
    const velocity = synth_settings.velocity;
    velocity[step_index] = y;
    setSynthSettings({ ...synth_settings, velocity: velocity });
  };
  const xDragSecondary = (x: number, step_index: number) => {
    audio_main.setTone(x, step_index);
    const tone = synth_settings.tone;
    tone[step_index] = x;
    setSynthSettings({ ...synth_settings, tone: tone });
  };
  const yDragSecondary = (y: number, step_index: number) => {
    audio_main.setPitchBend(y, step_index);
    const pb = synth_settings.pitch_bend;
    pb[step_index] = y;
    setSynthSettings({ ...synth_settings, pitch_bend: pb });
  };
  return (
    <div className="grid grid-cols-8 h-auto gap-x-5 gap-y-10 w-full bg-transparent items-center">
      {synth_settings.steps.map((_, i) => {
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
              x_p_init={synth_settings.decay[i]}
              y_p_init={synth_settings.velocity[i]}
              x_s_init={synth_settings.tone[i]}
              y_s_init={synth_settings.pitch_bend[i]}
              toggle_init={synth_settings.steps[i]}
              palette={palette}
            />
          </div>
        );
      })}
    </div>
  );
};

export default Sequencer;
