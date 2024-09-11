export interface SynthPreset {
  steps: boolean[];
  velocity: number[];
  tone: number[];
  pitch_bend: number[];
  decay: number[];
  bpm: number;
  fm_mult: number;
  fm_level: number;
  echo_level: number;
  echo_fb: number;
  hpf: number;
  octave: boolean;
  root_note: string;
}

export const CreatePreset =
    (steps: boolean[], velocity: number[], tone: number[], pitch_bend: number[],
     decay: number[], bpm: number, fm_mult: number, fm_level: number,
     echo_level: number, echo_fb: number, hpf: number, octave: boolean,
     root_note: string):
        SynthPreset => {
          return {
            steps: steps, velocity: velocity, tone: tone,
                pitch_bend: pitch_bend, decay: decay, bpm: bpm,
                fm_mult: fm_mult, fm_level: fm_level, echo_level: echo_level,
                echo_fb: echo_fb, hpf: hpf, octave: octave, root_note: root_note
          }
        }

// export const SavePreset =
//     (name: string, preset: SynthPreset) => {

//     }

export const kDefaultPreset = CreatePreset(
    [true, false, true, true, false, true, true, false],
    [0.9, 0.0, 0.4, 0.85, 0.0, 0.6, 0.6, 0.0],
    [0.05, 0.0, 0.2, 0.1, 0.0, 0.05, 0.05, 0.0],
    [0.4, 0.0, 0.05, 0.4, 0.0, 0.5, 0.4, 0.0],
    [0.3, 0.0, 0.7, 0.3, 0.0, 0.4, 0.3, 0.0], 115, 1.07, -13, -20, -12, 20,
    false, 'G');