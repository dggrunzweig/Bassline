import Module from '../../src/audio/kick-synth-WASM.js'

import {KickSynthMessageType, KickSynthPortMessage} from './kick-synth.js';
import HeapAudioBuffer from './wasm-audio-helper.js'

class AudioEngineWorklet extends AudioWorkletProcessor {
  private synth: Module.KickSynth;
  private output_buffer_: HeapAudioBuffer;

  constructor() {
    super();
    this.output_buffer_ = new HeapAudioBuffer(Module, 128, 2, 32);
    this.synth = new Module.KickSynth(sampleRate);
    this.synth.SetBPM(120);
    this.port.onmessage = (event: MessageEvent) => {
      const msg_data = event.data as KickSynthPortMessage;
      switch (msg_data.type) {
        case KickSynthMessageType.start:
          this.synth.Start();
          console.log('Start');
          break;
        case KickSynthMessageType.stop:
          this.synth.Stop();
          console.log('Stop');
          break;
        case KickSynthMessageType.get_step:
          this.port.postMessage({
            type: KickSynthMessageType.step_val,
            value: this.synth.GetStep()
          });
          break;
        case KickSynthMessageType.set_bpm:
          this.synth.SetBPM(msg_data.value);
          break;
        case KickSynthMessageType.set_sequence_length:
          this.synth.SetSequenceLength(msg_data.value);
          break;
        case KickSynthMessageType.set_trig:
          this.synth.SetTrig(msg_data.value, msg_data.step);
          break;
        case KickSynthMessageType.set_velocity:
          this.synth.SetVelocity(msg_data.value, msg_data.step);
          break;
        case KickSynthMessageType.set_duration:
          this.synth.SetDuration(msg_data.value, msg_data.step);
          break;
        case KickSynthMessageType.set_bend:
          this.synth.SetBend(msg_data.value, msg_data.step);
          break;
        case KickSynthMessageType.set_tone:
          this.synth.SetTone(msg_data.value, msg_data.step);
          break;
        case KickSynthMessageType.set_frequency:
          this.synth.SetFrequency(msg_data.value, msg_data.step);
          break;
        case KickSynthMessageType.set_global_fm:
          this.synth.SetGlobalFM(
              msg_data.value.level_dB, msg_data.value.rate_hz);
          break;
        default:
          break;
      };
    };
  }
  public process(
      inputs: Float32Array[][], outputs: Float32Array[][],
      parameters: Record<string, Float32Array>): boolean {
    const output = outputs[0];

    // For this given render quantum, the channel count of the node is fixed
    // and identical for the input and the output.
    const num_channels = output.length;
    const num_frames = num_channels == 0 ? 0 : output[0].length;

    // Prepare HeapAudioBuffer for the channel count change in the current
    // render quantum.
    this.output_buffer_.adaptChannel(num_channels);

    this.synth.Process(
        this.output_buffer_.getHeapAddress(), num_frames, num_channels);

    for (let channel = 0; channel < num_channels; ++channel) {
      const out_data = this.output_buffer_.getChannelData(channel);
      if (out_data) output[channel].set(out_data);
    }

    return true;
  }
}

registerProcessor('audio-engine-processor', AudioEngineWorklet);