import RecorderNode from './RecorderNode';
import {BPMToTime, createAudioContext, createBiquadFilter, createCompressor, createDigitalDelay, createGain, createOscillator, db2mag, DigitalDelay, NoteToPitch} from './Utilities';

export class AudioMain {
  private ctx: AudioContext;
  private comp: DynamicsCompressorNode;
  private ring_mod_gain: GainNode;
  private ring_mod_level: GainNode;
  private ring_mod_osc: OscillatorNode;
  private running = false;
  private started = false;
  private current_step = 0;
  private total_steps = 0;
  private bpm = 0;
  private steps: number[];
  private velocity: number[];
  private decay: number[];
  private tone: number[];
  private pitch_bend: number[];
  private updateStepUI: Function;
  private delay: DigitalDelay;
  private hp: BiquadFilterNode;
  private analyzer: AnalyserNode;
  private should_record = false;
  private recording = false;
  private record_steps = 0;
  private recording_node: RecorderNode;
  private setRecording: Function;
  constructor(num_steps: number, bpm: number, updateStep: Function) {
    this.ctx = createAudioContext();
    this.comp = createCompressor(this.ctx, -12, 4, 4, 0.03, 0.1);
    this.ring_mod_gain = createGain(this.ctx, 1.0);
    this.ring_mod_level = createGain(this.ctx, 0.6);
    this.ring_mod_osc = createOscillator(this.ctx, 'triangle', 100, 0);
    this.hp = createBiquadFilter(this.ctx, 'highpass', 20, 2.0, 0);
    this.delay = createDigitalDelay(this.ctx, BPMToTime(bpm, 3 / 8), -6);
    const delay_filter = createBiquadFilter(this.ctx, 'highpass', 400, 2.0, 0.);
    this.delay.output.gain.setValueAtTime(0, 0);
    this.analyzer = this.ctx.createAnalyser();

    this.ring_mod_gain.connect(this.hp).connect(this.comp).connect(
        this.ctx.destination);
    this.comp.connect(this.analyzer);
    this.ring_mod_gain.connect(delay_filter).connect(this.delay.input);
    this.delay.output.connect(this.comp);
    this.ring_mod_osc.connect(this.ring_mod_level)
        .connect(this.ring_mod_gain.gain);

    this.recording_node = new RecorderNode(this.ctx, this.comp);

    this.total_steps = num_steps;
    this.bpm = bpm;

    this.steps = new Array<number>(num_steps).fill(0);
    this.velocity = new Array<number>(num_steps).fill(0);
    this.decay = new Array<number>(num_steps).fill(0);
    this.tone = new Array<number>(num_steps).fill(0);
    this.pitch_bend = new Array<number>(num_steps).fill(0);


    this.updateStepUI = updateStep;
  }

  private Trigger(
      at_time: number, velocity: number, decay: number, pitch_bend: number,
      tone: number) {
    if (!this.running) return;
    const ctx = this.ctx;
    const root_hz = NoteToPitch('G', 2);
    const osc = createOscillator(
        ctx, 'sine', root_hz + 640 * pitch_bend * pitch_bend, 0);
    osc.frequency.setTargetAtTime(80, at_time, 0.4 * decay);
    const fm_osc = createOscillator(ctx, 'sine', root_hz * 1.4, 0);
    const fm_gain = createGain(ctx, tone * 200);
    fm_osc.connect(fm_gain).connect(osc.frequency);
    fm_osc.start(at_time);
    osc.start(at_time);
    const vca = createGain(ctx, db2mag(-12 * (1 - velocity)));
    const gain = createGain(ctx, db2mag(-6));
    osc.connect(vca).connect(gain).connect(this.ring_mod_gain);

    vca.gain.setTargetAtTime(0, at_time, 0.5 * decay);
    setTimeout(() => {
      osc.stop();
      osc.disconnect();
      vca.disconnect();
    }, (at_time - ctx.currentTime) * 1000 + 2000);
  }

  public GetCurrentStep() {
    return this.current_step;
  }

  public GetAnalyzer() {
    return this.analyzer;
  }

  public SetRingModParams(frequency: number, level_dB: number) {
    this.ring_mod_osc.frequency.setTargetAtTime(
        frequency, this.ctx.currentTime, 0.1);
    this.ring_mod_level.gain.setTargetAtTime(
        db2mag(level_dB), this.ctx.currentTime, 0.1);
  };



  public SetSteps(steps: number[]) {
    this.steps = steps;
  }

  public setVelocity(velocity: number[]) {
    this.velocity = velocity;
  }

  public setPitchBend(pb: number[]) {
    this.pitch_bend = pb;
  }

  public setTone(tone: number[]) {
    this.tone = tone;
  }

  public setDecay(decay: number[]) {
    this.decay = decay;
  }

  public setBPM(bpm: number) {
    this.bpm = bpm;
    this.delay.delay.delayTime.setTargetAtTime(
        BPMToTime(bpm, 3 / 8), this.ctx.currentTime, 0.1);
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

  private step() {
    const step_duration = 60 / (4 * this.bpm);
    setTimeout(() => {
      if (!this.running) return;
      if (this.steps[this.current_step] == 1) {
        this.Trigger(
            this.ctx.currentTime + 0.01, this.velocity[this.current_step],
            this.decay[this.current_step], this.pitch_bend[this.current_step],
            this.tone[this.current_step]);
      }
      // fired once when the recording is requested
      if (this.should_record && this.current_step == 0 && !this.recording) {
        this.recording = true;
        this.recording_node.StartRecording();
        console.log('Start Recording');
      }
      if (this.recording) {
        if (this.record_steps <= 0) {
          // stop recording
          this.recording = false;
          this.should_record = false;
          this.recording_node.StopRecording();
          console.log('Stop Recording');
          setTimeout(() => {
            if (this.recording_node.GetBlobURL() != null) {
              const link = document.createElement('a');
              link.href = this.recording_node.GetBlobURL();
              link.download = 'bassline.webm';
              link.innerHTML = '';
              link.click();
              console.log('Downloading Recording');
              this.setRecording(false);
            }
          }, 2000);
        }
        this.record_steps--;
      }
      this.updateStepUI(this.current_step);
      this.current_step = (this.current_step + 1) % this.total_steps;
      this.step();
    }, step_duration * 1000);
  }

  public Start() {
    if (this.ctx.state == 'suspended') this.ctx.resume();
    if (!this.started) {
      this.ring_mod_osc.start();
      this.started = true;
    }
    this.running = !this.running;
    this.current_step = 0;
    this.step();
  }

  public isRunning() {
    return this.running;
  }

  public RecordAudio(duration_steps: number, setRecording: Function) {
    this.should_record = true;
    this.record_steps = duration_steps;
    this.setRecording = setRecording;
    setRecording(true);
  }
}