import WorkletURL from './audio-engine-worklet?worker&url';
import {BPMToTime, createBiquadFilter, createCompressor, createDigitalDelay, createGain, db2mag, DigitalDelay} from './Utilities.js';

export enum KickSynthMessageType {
  start = 'START',
  stop = 'STOP',
  set_bpm = 'SET_BPM',
  get_step = 'GET_STEP',
  step_val = 'STEP_VAL',
  set_trig = 'SET_TRIG',
  set_frequency = 'SET_FREQUENCY',
  set_velocity = 'SET_VELOCITY',
  set_duration = 'SET_DURATION',
  set_bend = 'SET_BEND',
  set_tone = 'SET_TONE',
  set_global_fm = 'SET_GLOBAL_FM',
  set_sequence_length = 'SET_SEQUENCE_LENGTH',
  use_midi = 'USE_MIDI',
  midi_time_pulse = 'MIDI_TIME_PULSE',
  midi_clock_reset = 'MIDI_CLOCK_RESET',
  record = 'RECORD',
  record_buffer = 'RECORD_BUFFER',
  record_buffer_ready = 'RECORD_BUFFER_READY'
}

export interface KickSynthPortMessage {
  type: KickSynthMessageType;
  value?: any;
  step?: number;
}

class KickSynth {
  private running = false;
  private started = false;
  private initialized = false;
  private current_step_ = 0;
  private ctx: AudioContext;
  private comp: DynamicsCompressorNode;
  private synth_gain: GainNode;
  private output_gain: GainNode;
  private delay: DigitalDelay;
  private hp: BiquadFilterNode;
  private analyzer: AnalyserNode;
  private worklet_node_: AudioWorkletNode|undefined;
  private record_finished_ = false;

  constructor(audio_ctx: AudioContext, sequence_length: number, bpm: number) {
    this.ctx = audio_ctx;

    // output gains
    this.synth_gain = createGain(audio_ctx, db2mag(-6));
    this.output_gain = createGain(audio_ctx, 0);
    // high pass filter
    this.hp = createBiquadFilter(audio_ctx, 'highpass', 20, 4.0, 0);
    // delay line
    this.delay = createDigitalDelay(audio_ctx, BPMToTime(bpm, 3 / 8), -6);
    const delay_filter =
        createBiquadFilter(audio_ctx, 'highpass', 400, 2.0, 0.);
    this.delay.output.gain.setValueAtTime(0, 0);
    // analyzer
    this.analyzer = audio_ctx.createAnalyser();
    // compressor
    this.comp = createCompressor(audio_ctx, -12, 4, 4, 0.02, 0.1);
    // routing
    this.synth_gain.connect(this.hp)
        .connect(this.comp)
        .connect(this.output_gain)
        .connect(audio_ctx.destination);
    this.comp.connect(this.analyzer);
    this.synth_gain.connect(delay_filter).connect(this.delay.input);
    this.delay.output.connect(this.comp);

    // Create a worklet to handle process calls
    audio_ctx.audioWorklet.addModule(WorkletURL)
        .then(() => {
          // pass in the WASM synth engine as a parameter
          this.worklet_node_ = new AudioWorkletNode(
              audio_ctx, 'audio-engine-processor',
              {numberOfInputs: 0, numberOfOutputs: 1});
          this.worklet_node_.connect(this.synth_gain);
          this.SetSequenceLength(sequence_length);
          this.SetBPM(bpm);
          // check step by adding port listener
          this.worklet_node_.port.addEventListener(
              'message', (ev: MessageEvent) => {
                const msg_data = ev.data;
                switch (msg_data.type) {
                  case KickSynthMessageType.step_val:
                    this.current_step_ = ev.data.value;
                    break;
                  case KickSynthMessageType.record_buffer_ready:
                    this.record_finished_ = msg_data.value;
                    break;
                  case KickSynthMessageType.record_buffer:
                    const blob = new Blob(
                        [msg_data.value], {type: 'audio/wav; codecs=0'});
                    const blob_url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = blob_url;
                    a.download = 'Substrata.wav';
                    a.click();
                    break;
                  default:
                    break;
                }
              });
          this.worklet_node_.port.start();
          this.initialized = true;
        })
        .catch((e) => {
          this.worklet_node_ = undefined;
          console.log('Unable to add Module');
          console.log(e);
        });
    // add other modules
  }

  private InitialStart() {
    if (this.ctx.state == 'suspended') this.ctx.resume();
    if (!this.started) {
      this.started = true;
    }
  }
  public Start() {
    if (!this.initialized) return;
    this.InitialStart();
    this.running = true;
    this.output_gain.gain.setTargetAtTime(1, this.ctx.currentTime, 0.1);
    this.worklet_node_?.port.postMessage({type: KickSynthMessageType.start});
  }
  public Stop() {
    if (!this.initialized) return;
    this.running = false;
    this.output_gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.5);
    this.worklet_node_?.port.postMessage({type: KickSynthMessageType.stop});
  }
  public isRunning() {
    return this.running;
  }
  public SetBPM(bpm: number) {
    // update delay line
    this.delay.delay.delayTime.setTargetAtTime(
        BPMToTime(bpm, 3 / 8), this.ctx.currentTime, 0.1);
    // update sequencer
    this.worklet_node_?.port.postMessage(
        {type: KickSynthMessageType.set_bpm, value: bpm});
  }
  public GetStep(): number {
    if (!this.initialized) return 0;
    this.worklet_node_?.port.postMessage({type: KickSynthMessageType.get_step});
    return this.current_step_;
  }
  public GetAnalyzer() {
    return this.analyzer;
  }

  public SetSequenceLength(length: number) {
    this.worklet_node_?.port.postMessage(
        {type: KickSynthMessageType.set_sequence_length, value: length});
  }

  public setDelayParams(gain_db: number, fb_db: number) {
    this.delay.output.gain.setTargetAtTime(
        db2mag(gain_db), this.ctx.currentTime, 0.1);
    this.delay.fb.gain.setTargetAtTime(
        db2mag(fb_db), this.ctx.currentTime, 0.1);
  }

  public setHPFrequency(frequency: number) {
    this.hp.frequency.setTargetAtTime(frequency, this.ctx.currentTime, 0.1);
  }

  public SetTrig(on: boolean, step: number) {
    this.worklet_node_?.port.postMessage(
        {type: KickSynthMessageType.set_trig, value: on, step: step});
  }
  public SetFrequency(f: number, step: number) {
    this.worklet_node_?.port.postMessage(
        {type: KickSynthMessageType.set_frequency, value: f, step: step});
  }
  public SetVelocity(v: number, step: number) {
    this.worklet_node_?.port.postMessage(
        {type: KickSynthMessageType.set_velocity, value: v, step: step});
  }
  public SetDuration(d: number, step: number) {
    this.worklet_node_?.port.postMessage(
        {type: KickSynthMessageType.set_duration, value: d, step: step});
  }
  public SetBend(b: number, step: number) {
    this.worklet_node_?.port.postMessage(
        {type: KickSynthMessageType.set_bend, value: b, step: step});
  }
  public SetTone(t: number, step: number) {
    this.worklet_node_?.port.postMessage(
        {type: KickSynthMessageType.set_tone, value: t, step: step});
  }
  public SetGlobalFM(level_dB: number, rate_hz: number) {
    this.worklet_node_?.port.postMessage({
      type: KickSynthMessageType.set_global_fm,
      value: {level_dB: level_dB, rate_hz: rate_hz}
    });
  }
  public UseMIDI(use_midi: boolean) {
    this.worklet_node_?.port.postMessage(
        {type: KickSynthMessageType.use_midi, value: use_midi});
  }
  public MIDIClick() {
    this.worklet_node_?.port.postMessage(
        {type: KickSynthMessageType.midi_time_pulse});
  }
  public MIDIClockReset() {
    this.worklet_node_?.port.postMessage(
        {type: KickSynthMessageType.midi_clock_reset});
  }
  public StartRecord(num_loops: number) {
    this.record_finished_ = false;
    this.worklet_node_?.port.postMessage(
        {type: KickSynthMessageType.record, value: num_loops});
  }
  public FinishedRecording() {
    this.worklet_node_?.port.postMessage(
        {type: KickSynthMessageType.record_buffer_ready});
    return this.record_finished_;
  }
  public GetRecordBuffer() {
    this.worklet_node_?.port.postMessage(
        {type: KickSynthMessageType.record_buffer});
  }
}

export default KickSynth;
