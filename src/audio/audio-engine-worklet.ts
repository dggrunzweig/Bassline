// @ts-ignore
import Module from './kick-synth-WASM'
import {KickSynthMessageType, KickSynthPortMessage} from './kick-synth.js';
import HeapAudioBuffer from './wasm-audio-helper.js'

class AudioEngineWorklet extends AudioWorkletProcessor {
  private synth: Module.KickSynth;
  private output_buffer_: HeapAudioBuffer;

  constructor() {
    super();
    this.output_buffer_ = new HeapAudioBuffer(Module, 128, 1, 32);
    this.synth = new Module.KickSynth(sampleRate);
    this.synth.SetBPM(120);
    this.port.onmessage = (event: MessageEvent) => {
      const msg_data = event.data as KickSynthPortMessage;
      switch (msg_data.type) {
        case KickSynthMessageType.start:
          this.synth.Start();
          break;
        case KickSynthMessageType.stop:
          this.synth.Stop();
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
        case KickSynthMessageType.use_midi:
          this.synth.UseMIDI(msg_data.value);
          break;
        case KickSynthMessageType.midi_time_pulse:
          this.synth.MIDIClockPulse();
          break;
        case KickSynthMessageType.midi_clock_reset:
          this.synth.MIDIClockReset();
          break;
        case KickSynthMessageType.record:
          this.synth.RecordAudio(msg_data.value);
          break;
        case KickSynthMessageType.record_buffer_ready:
          this.port.postMessage({
            type: KickSynthMessageType.record_buffer_ready,
            value: this.synth.RecordFinished()
          });
          break;
        case KickSynthMessageType.record_buffer:
          if (this.synth.RecordFinished()) {
            console.log('Requesting Record Buffer Data');
            // convert data to javascript readable
            let heap = this.synth.GetRecordBufferAsWav();
            let data_len = this.synth.GetWavSizeInBytes();
            const buf_data = new Uint8Array(data_len)
            for (let i = 0; i < data_len; ++i) {
              buf_data[i] =
                  Module.HEAPU8[heap / Uint8Array.BYTES_PER_ELEMENT + i]
            }
            this.port.postMessage(
                {type: KickSynthMessageType.record_buffer, value: buf_data});
          }
          break;
        default:
          break;
      };
    };
  }

  public process(
      _: Float32Array[][], outputs: Float32Array[][],
      _1: Record<string, Float32Array>): boolean {
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