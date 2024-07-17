export function db2mag(db_value: number): number {
  return Math.pow(10, db_value / 20);
}

export function mag2db(magnitude_value: number): number {
  if (magnitude_value == 0) return -200;
  if (magnitude_value < 0) return NaN;
  return 20 * Math.log10(magnitude_value);
}

export function GetMaxAbsValue(array: number[]|Float32Array): number {
  let min = 100;
  let max = -100;
  for (let i = 0; i < array.length; ++i) {
    min = Math.min(min, array[i]);
    max = Math.max(max, array[i]);
  }
  return Math.max(max, Math.abs(min));
}

export function GetRMS(array: number[]|Float32Array): number {
  let sum = 0;
  for (let i = 0; i < array.length; ++i) {
    sum += array[i] * array[i];
  }
  let rms = sum / array.length;
  return Math.sqrt(rms);
}

export function createAudioBuffer(
    n_channels: number, n_frames: number, sample_rate: number): AudioBuffer {
  // create a buffer
  return new AudioBuffer({
    numberOfChannels: n_channels,
    length: n_frames,
    sampleRate: sample_rate,
  });
}

export function createBiquadFilter(
    ctx: AudioContext, type: BiquadFilterType, frequency: number, Q: number,
    gain_dB: number): BiquadFilterNode {
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = frequency;
  filter.Q.value = Q;
  if (type === 'lowshelf' || type === 'highshelf') filter.gain.value = gain_dB;
  return filter;
}

export function createGain(ctx: AudioContext, initial_gain = 1.0): GainNode {
  const gain = ctx.createGain();
  gain.gain.value = initial_gain;
  return gain;
}

export function createOscillator(
    ctx: AudioContext, type: OscillatorType, frequency: number,
    detune: number): OscillatorNode {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.value = frequency;
  osc.detune.value = detune;
  return osc;
}

export function createStereoPanner(
    ctx: AudioContext, pan: number): StereoPannerNode {
  const panner = ctx.createStereoPanner();
  panner.pan.value = pan;
  return panner;
}

export function createBufferSource(
    ctx: AudioContext, buffer: AudioBuffer, playback_rate: number,
    loop: boolean): AudioBufferSourceNode {
  const bs = ctx.createBufferSource();
  bs.buffer = buffer;
  bs.playbackRate.value = playback_rate;
  bs.loop = loop;
  return bs;
}

export function CreateNoiseOscillator(
    ctx: AudioContext, gain_dB = 0, duration = 2): AudioBufferSourceNode {
  // 2 second noise loop
  const n_frames = ctx.sampleRate * duration;

  // create a buffer
  const buffer = createAudioBuffer(1, n_frames, ctx.sampleRate);

  // Fill the buffer with white noise;
  // just random values between -1.0 and 1.0
  const data = buffer.getChannelData(0);
  for (let i = 0; i < n_frames; i++) {
    // random values between -1 and 1
    data[i] = Math.random() * 2 - 1;
    data[i] *= db2mag(gain_dB);
  }

  return createBufferSource(ctx, buffer, 1.0, true);
}

export function createCompressor(
    ctx: AudioContext, thresh_db: number, knee_db: number, ratio: number,
    attack_s: number, release_s: number): DynamicsCompressorNode {
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = thresh_db;
  comp.knee.value = knee_db;
  comp.ratio.value = ratio;
  comp.attack.value = attack_s;
  comp.release.value = release_s;
  return comp;
}

export type DigitalDelay = {
  input: GainNode; output: GainNode; delay: DelayNode; fb: GainNode;
}

export function createDigitalDelay(
    ctx: AudioContext, delay_time: number, feedback_db: number):
    DigitalDelay {
      const input = createGain(ctx, 1.0);
      const out = createGain(ctx, 1.0);
      const delay = ctx.createDelay(Math.max(3.0, delay_time));
      delay.delayTime.value = delay_time;
      const fb = createGain(ctx, db2mag(feedback_db));
      input.connect(delay);
      delay.connect(fb).connect(delay);
      delay.connect(out);
      return {input: input, delay: delay, fb: fb, output: out};
    }

export function createWaveShaper(
    ctx: AudioContext, table: Float32Array,
    oversample = < OverSampleType > '4x'):
    WaveShaperNode {
      const bc = ctx.createWaveShaper();
      bc.curve = table;
      bc.oversample = oversample;
      return bc;
    }

export async function createReverb(
    audio_ctx: AudioContext, t_60: number, lpf_fc = 14000, direct = false):
    Promise<ConvolverNode> {
      let convolver = audio_ctx.createConvolver();
      const lpf = createFilter(LPF(lpf_fc, 1.0, audio_ctx.sampleRate));
      // create ir from noise
      const fs = audio_ctx.sampleRate;
      const sample_len = Math.floor(t_60 * fs);
      const ir_buffer = createAudioBuffer(2, sample_len, fs);
      // late field onset (3% of t60)
      const lf_k_onset = 0.03 * t_60;
      // late field decay constant
      const lf_k_decay = 0.97 * t_60 /
          (6.9 / 4);  // e^-6.9 = -60dB. Existing envelop function is e^-4
      // lf scale
      const lf_scale = db2mag(-4);
      // early reflections decay constant, 20% of initial time
      const er_k_decay = Math.log(0.001) / (0.2 * sample_len);

      // pre-compute noise for faster performance
      const noise_table_len = 2 * fs;
      const noise_table = new Array<number>(noise_table_len)
                              .fill(0)
                              .map((_) => {return 2 * Math.random() - 1});

      let er_sample_dist = Math.floor(0.003 * fs);
      for (let c = 0; c < 2; ++c) {
        const b = ir_buffer.getChannelData(c);
        lpf.x_z = [0, 0];
        lpf.y_z = [0, 0];
        for (let i = 0; i < sample_len; ++i) {
          const t = i / fs;
          const lf_sample = lf_scale *
              noise_table[(i * (10 * c + 1)) % noise_table_len] *
              envelop(t, lf_k_onset, lf_k_decay);
          // early reflection sample every 2-6 ms
          let er_sample = 0;
          if (i % er_sample_dist == 0) {
            er_sample = ((-1) ** i) * Math.exp(er_k_decay * i);
            er_sample_dist = Math.floor(0.002 + 0.004 * Math.random() * fs);
          }
          b[i] = FilterSample(lpf, lf_sample) + er_sample;
        }
      }
      // direct signal
      if (direct) {
        ir_buffer.getChannelData(0)[0] = 1.0;
        ir_buffer.getChannelData(1)[0] = 1.0;
      }
      convolver.buffer = ir_buffer;
      return convolver;
    }

export function createAudioContext():
    AudioContext {
      // initialize audio
      const audio_ctx = new window.AudioContext();
      // immediately suspend
      audio_ctx.suspend();
      return audio_ctx;
    }

export function CreateBufferFromFile(context: AudioContext, url: string):
    Promise<AudioBuffer|undefined> {
      return new Promise(function(resolve, reject) {
        const request = new XMLHttpRequest();
        request.open('GET', url);
        request.responseType = 'arraybuffer';
        request.onload = function() {
          if (request.response == null) reject(null);
          let undecodedAudio = request.response;
          context.decodeAudioData(undecodedAudio, (data) => {
            resolve(data);
          });
        };
        request.send();
      })
    }

// Function takes some time to happen so it uses a promise.
// When calling, implement in the following fashion
// CreateLiveInputNode(audio_ctx).then((return_val) => {
//     let input_node = return_val;
//     <remaining graph setup>
// });

// turn off aec will turn off the aec, which is useful for using a loopback like
// blackhole this feature is only supported on firefox bug report in chrome:
// https://bugs.chromium.org/p/chromium/issues/detail?id=796964
export function CreateLiveInputNode(ctx: AudioContext, turn_off_aec = false):
    Promise<MediaStreamAudioSourceNode> {
      return new Promise(function(resolve, reject) {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          navigator.mediaDevices
              .getUserMedia({audio: true})
              // Success callback
              .then((stream) => {
                const track = stream.getAudioTracks()[0];
                let current_settings = track.getSettings();
                current_settings.echoCancellation = !turn_off_aec;
                track.applyConstraints(current_settings)
                    .then(() => {
                      console.log(stream.getAudioTracks()[0].getSettings());
                      console.log('creating live input node');
                      resolve(ctx.createMediaStreamSource(stream));
                    })
                    .catch(() => {console.log('failed to apply constraints')});
              })
              // Error callback
              .catch((err) => {
                console.error(
                    `The following getUserMedia error occurred: ${err}`);
                reject(null);
              });
        } else {
          console.log('getUserMedia not supported on your browser!');
          reject(null);
        }
      })
    }

// exponentially ramp to value, saves some characters
export function RampToValue(
    param: AudioParam, start_time: number, value: number, duration: number) {
  param.setTargetAtTime(value, start_time, duration);
}

export function linearRampToValueAtTime(
    ctx: AudioContext, param: AudioParam, value: number, duration: number) {
  if (navigator.userAgent.includes('Firefox')) {
    RampToValue(param, 0, value, duration);
  } else {
    const current_time = ctx.currentTime;
    duration = Math.max(duration, 0);
    param.cancelScheduledValues(current_time);
    const start_value = param.value;
    param.setValueCurveAtTime([start_value, value], current_time, duration);
  }
}

export function TiltedHannWindow(N: number, tilt: number):
    Float32Array {
      const window = new Float32Array(N).fill(0);
      const n_in = Math.floor(N * tilt);
      const n_out = N - n_in;
      const pi = Math.PI;
      const in_coeff = pi / (n_in);
      const out_coeff = pi / (n_out - 1);
      for (let i = 0; i < n_in; ++i) {
        window[i] = 0.5 * (1 - Math.cos(in_coeff * i))
      }
      for (let i = n_in; i < N; ++i) {
        window[i] = 0.5 * (1 - Math.cos(pi + (i - n_in) * out_coeff));
      }
      return window;
    }

export function ReverseAudioBuffer(buffer: AudioBuffer):
    AudioBuffer {
      const n_channels = buffer.numberOfChannels;
      const n_frames = buffer.length;
      const fs = buffer.sampleRate;
      const rev_buffer = createAudioBuffer(n_channels, n_frames, fs)
      for (let c = 0; c < n_channels; ++c) {
        const ch_r = rev_buffer.getChannelData(c);
        const ch_f = buffer.getChannelData(c);
        for (let i = 0; i < n_frames / 2; ++i) {
          ch_r[i] = ch_f[n_frames - 1 - i];
          ch_r[n_frames - 1 - i] = ch_f[i];
        }
      }
      return rev_buffer;
    }

export function NormalizeAudioBuffer(buffer: AudioBuffer):
    AudioBuffer {
      const n_channels = buffer.numberOfChannels;
      const n_frames = buffer.length;
      const fs = buffer.sampleRate;
      const norm_buffer = createAudioBuffer(n_channels, n_frames, fs);
      let max = 0.001;  // -60 db
      // find max value
      for (let c = 0; c < n_channels; ++c) {
        max = Math.max(max, GetMaxAbsValue(buffer.getChannelData(c)));
      }
      // normalize
      const scale = Math.min(1 / max, db2mag(24));  // max of 24db boost allowed
      for (let c = 0; c < n_channels; ++c) {
        const i_c = buffer.getChannelData(c);
        const n_c = norm_buffer.getChannelData(c);
        for (let i = 0; i < n_frames; ++i) {
          n_c[i] = i_c[i] * scale;
        }
      }
      return norm_buffer;
    }

export function CropAudioBuffer(
    buffer: AudioBuffer, start_sample: number, end_sample: number):
    AudioBuffer {
      const n_channels = buffer.numberOfChannels;
      end_sample = Math.min(buffer.length - 1, end_sample);
      start_sample = Math.max(start_sample, 0);
      if (start_sample > end_sample) {
        const temp = start_sample;
        start_sample = end_sample;
        end_sample = temp;
      }
      const n_frames = end_sample - start_sample;
      const fs = buffer.sampleRate;
      const cropped_buffer = createAudioBuffer(n_channels, n_frames, fs)
      for (let c = 0; c < n_channels; ++c) {
        const ch_c = cropped_buffer.getChannelData(c);
        const ch_o = buffer.getChannelData(c);
        for (let i = start_sample, c = 0; i < end_sample; ++i, ++c) {
          ch_c[c] = ch_o[i];
        }
      }
      return cropped_buffer;
    }

export function NoteToPitch(
    note: string, octave: number, custom_root_hz?: number):
    number {
      octave = clamp(octave, 0, 8);  // limit range to 0-8
      octave = Math.floor(octave);   // no fractional octaves
      const C0 = custom_root_hz == undefined ?
          16.35 :
          custom_root_hz;  // Assuming A = 440
      // gives you a C in whatever octave is specified
      const octave_shift = C0 * (Math.pow(2, octave));
      switch (note) {
        case 'C':
          return octave_shift;
        case 'C#':
          return octave_shift * Math.pow(2, (1 / 12));
        case 'D':
          return octave_shift * Math.pow(2, (2 / 12));
        case 'D#':
          return octave_shift * Math.pow(2, (3 / 12));
        case 'E':
          return octave_shift * Math.pow(2, (4 / 12));
        case 'F':
          return octave_shift * Math.pow(2, (5 / 12));
        case 'F#':
          return octave_shift * Math.pow(2, (6 / 12));
        case 'G':
          return octave_shift * Math.pow(2, (7 / 12));
        case 'G#':
          return octave_shift * Math.pow(2, (8 / 12));
        case 'A':
          return octave_shift * Math.pow(2, (9 / 12));
        case 'A#':
          return octave_shift * Math.pow(2, (10 / 12));
        case 'B':
          return octave_shift * Math.pow(2, (11 / 12));
        default:
          console.log('NoteToPitch: Unknown Note Provided');
          return octave_shift;
      }
    }

export function MixToDB(mix: number):
    number {
      if (mix < 0.5)
        return db2mag(2 * mix * -6);
      else
        return db2mag(-6 + (-60 * 2 * (mix - 0.5)));
    }

export function clamp(val: number, min: number, max: number):
    number {
      return Math.min(Math.max(val, min), max);
    }

export function triangle(amp: number, period: number, t: number):
    number {
      return (4 * amp / period) *
          Math.abs(((t - period / 4) % period) - period / 2) -
          amp;
    }

export function envelop(t: number, attack: number, release: number):
    number {
      if (t <= attack) {
        // e^0.7 = 2
        return Math.min(Math.exp(0.7 * t / attack) - 1, 1);
      } else {
        // e^-4 = -35 dB
        return Math.exp(-4 * (t - attack) / release);
      }
    }

// division should be the following format
// whole note = 1
// half note = 1/2
// quarter note = 1/4
// eighth note = 1/8
// etc
export function BPMToTime(BPM: number, division: number):
    number {
      const inv_div = 1 / division;
      return (60.0 / (BPM * inv_div / 4))
    }

export function CheckPRNG(prng: Function|undefined):
    Function {
      if (prng == null) {
        console.trace('prng is null!');
        return Math.random;
      } else
        return prng;
    }

export function lerp(
    x: number, x_l: number, x_u: number, y_l: number, y_u: number):
    number {
      x = clamp(x, x_l, x_u);
      return (x - x_l) / (x_u - x_l) * (y_u - y_l) + y_l;
    }

// function to find the least common multiple
export function lcm(x: number, y: number):
    number {
      let min = Math.min(x, y);
      while (((min % x) != 0) || ((min % y) != 0)) {
        min++;
      }
      return min;
    }

// BIQUAD Filtering
export interface BiquadCoeffs {
  b0: number, b1: number, b2: number, a0: number, a1: number, a2: number
}

export interface Filter {
  coeffs: BiquadCoeffs, x_z: number[], y_z: number[]
}

export function createFilter(coeffs?: BiquadCoeffs): Filter {
  if (coeffs == undefined)
    return {
      coeffs: {b0: 0, b1: 0, b2: 0, a0: 0, a1: 0, a2: 0},
      x_z: [0, 0],
      y_z: [0, 0]
    };
  else
    return {coeffs: coeffs, x_z: [0, 0], y_z: [0, 0]};
}

// filter design (12db roll off)
// https://www.w3.org/TR/audio-eq-cookbook/
// BPF peak = Q
export function BPF2(fc: number, Q: number, fs: number): BiquadCoeffs {
  const wo = 2 * Math.PI * fc / fs;
  const cosw = Math.cos(wo);
  const sinw = Math.sin(wo);
  const alpha = sinw / (2 * Q);
  // BP Coeffs
  return {
    b0: sinw / 2, b1: 0, b2: -sinw / 2, a0: 1 + alpha, a1: -2 * cosw,
        a2: 1 - alpha
  }
}

// 0 dB peak resonant BPF
export function BPF(fc: number, Q: number, fs: number): BiquadCoeffs {
  const wo = 2 * Math.PI * fc / fs;
  const cosw = Math.cos(wo);
  const sinw = Math.sin(wo);
  const alpha = sinw / (2 * Q);
  return {
    b0: alpha, b1: 0, b2: -alpha, a0: 1 + alpha, a1: -2 * cosw, a2: 1 - alpha
  }
}

export function LPF(fc: number, Q: number, fs: number): BiquadCoeffs {
  const wo = 2 * Math.PI * fc / fs;
  const cosw = Math.cos(wo);
  const sinw = Math.sin(wo);
  const alpha = sinw / (2 * Q);
  return {
    b0: (1 - cosw) / 2, b1: 1 - cosw, b2: (1 - cosw) / 2, a0: 1 + alpha,
        a1: -2 * cosw, a2: 1 - alpha
  }
}

export function HPF(fc: number, Q: number, fs: number): BiquadCoeffs {
  const wo = 2 * Math.PI * fc / fs;
  const cosw = Math.cos(wo);
  const sinw = Math.sin(wo);
  const alpha = sinw / (2 * Q);
  return {
    b0: (1 + cosw) / 2, b1: -(1 + cosw), b2: (1 + cosw) / 2, a0: 1 + alpha,
        a1: -2 * cosw, a2: 1 - alpha
  }
}

export function FilterSample(f: Filter, x: number): number {
  const y = (x * f.coeffs.b0 + f.x_z[0] * f.coeffs.b1 + f.x_z[1] * f.coeffs.b2 -
             f.y_z[0] * f.coeffs.a1 - f.y_z[1] * f.coeffs.a2) /
      f.coeffs.a0;
  f.y_z[1] = f.y_z[0];
  f.y_z[0] = y;
  f.x_z[1] = f.x_z[0];
  f.x_z[0] = x;
  return y;
}


// Unused Functions for this specific project

// // Function to load an Audio Worklet module
// function loadAudioWorkletModule(audio_ctx: AudioContext, moduleURL: string):
// Promise<void> {
//     return new Promise((resolve, reject) => {
//         // Use the audio context's audioWorklet property to load the module
//         audio_ctx.audioWorklet.addModule(moduleURL)
//             .then(() => {
//                 // console.log(`Audio Worklet module loaded successfully from
//                 ${moduleURL}`); resolve();
//             })
//             .catch((error) => {
//                 console.error(`Error loading Audio Worklet module from
//                 ${moduleURL}`, error); reject(error);
//             });
//     });
// }

// // load multiple modules
// export function LoadModules(audio_ctx: AudioContext, urls: string[]):
// Promise<void> {
//     return urls.reduce((previousPromise, moduleURL) => {
//         return previousPromise.then(() => {
//             return loadAudioWorkletModule(audio_ctx, moduleURL);
//         });
//     }, Promise.resolve());
// };

// export function zeros(len: number): number[] {
//     return new Array(len).fill(0);
// }

// export function ones(len: number): number[] {
//     return new Array(len).fill(1);
// }

// export function HannWindow(N: number): Float32Array {
//     const window = new Float32Array(N).fill(0);
//     const two_pi_over_n = 2 * Math.PI / (N - 1);
//     for (let i = 0; i < N; ++i) {
//         window[i] = 0.5 * (1 - Math.cos(two_pi_over_n * i))
//     }
//     return window;
// }