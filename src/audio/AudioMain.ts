import RecorderNode from './RecorderNode';
import {BPMToTime, createAudioContext, createBiquadFilter, createCompressor, createDigitalDelay, createGain, createOscillator, db2mag, DigitalDelay, NoteToPitch} from './Utilities';

export class AudioMain {
  private ctx: AudioContext;
  private comp: DynamicsCompressorNode;
  private global_fm_level: GainNode;
  private global_fm_osc: OscillatorNode;
  private out_gain: GainNode;
  private waveform: PeriodicWave;
  private running = false;
  private started = false;
  private current_step = 0;
  private sequence_timer = 0;
  private total_steps = 0;
  private bpm = 0;
  private octave = 2;
  private steps: number[];
  private velocity: number[];
  private decay: number[];
  private tone: number[];
  private pitch_bend: number[];
  private delay: DigitalDelay;
  private hp: BiquadFilterNode;
  private analyzer: AnalyserNode;
  private step_node: ConstantSourceNode;
  private step_analyzer: AnalyserNode;
  private should_record = false;
  private recording = false;
  private record_steps = 0;
  private recording_node: RecorderNode;
  private setRecording: Function;
  constructor(num_steps: number, bpm: number) {
    this.ctx = createAudioContext();
    this.comp = createCompressor(this.ctx, -12, 4, 4, 0.02, 0.1);
    this.global_fm_level = createGain(this.ctx, 0.6);
    this.global_fm_osc = createOscillator(this.ctx, 'triangle', 100, 0);
    this.hp = createBiquadFilter(this.ctx, 'highpass', 20, 4.0, 0);
    this.out_gain = createGain(this.ctx, db2mag(-6));
    this.delay = createDigitalDelay(this.ctx, BPMToTime(bpm, 3 / 8), -6);
    const delay_filter = createBiquadFilter(this.ctx, 'highpass', 400, 2.0, 0.);
    this.delay.output.gain.setValueAtTime(0, 0);
    this.analyzer = this.ctx.createAnalyser();
    this.step_node = this.ctx.createConstantSource();
    this.step_analyzer = this.ctx.createAnalyser();
    this.step_node.connect(this.step_analyzer);

    // end chain
    this.out_gain.connect(this.hp).connect(this.comp).connect(
        this.ctx.destination);
    this.comp.connect(this.analyzer);
    this.out_gain.connect(delay_filter).connect(this.delay.input);
    this.delay.output.connect(this.comp);
    this.global_fm_osc.connect(this.global_fm_level);

    this.recording_node = new RecorderNode(this.ctx, this.comp);
    this.setRecording = () => {};
    this.total_steps = num_steps;
    this.bpm = bpm;

    this.steps = new Array<number>(num_steps).fill(0);
    this.velocity = new Array<number>(num_steps).fill(0);
    this.decay = new Array<number>(num_steps).fill(0);
    this.tone = new Array<number>(num_steps).fill(0);
    this.pitch_bend = new Array<number>(num_steps).fill(0);

    const harmonics = [0, 1, 0, db2mag(-24), 0, db2mag(-40)];
    const real = new Array(harmonics.length).fill(0);
    const imag = harmonics;
    this.waveform = this.ctx.createPeriodicWave(real, imag);
  }

  private Trigger(
      at_time: number, velocity: number, decay: number, pitch_bend: number,
      tone: number, step_dur: number) {
    if (!this.running) return;
    const ctx = this.ctx;
    const root_hz = NoteToPitch('G', this.octave);
    const osc = createOscillator(
        ctx, 'sine', root_hz + 640 * pitch_bend * pitch_bend, 0);
    osc.setPeriodicWave(this.waveform);
    osc.frequency.setTargetAtTime(root_hz, at_time, 0.8 * 2 * decay * step_dur);
    const fm_osc = createOscillator(ctx, 'sine', root_hz * 1.4, 0);
    const fm_gain = createGain(ctx, tone * 200);
    fm_osc.connect(fm_gain).connect(osc.frequency);
    this.global_fm_level.connect(osc.frequency);
    fm_osc.start();
    osc.start();
    const vca = createGain(ctx, 0);
    osc.connect(vca).connect(this.out_gain);

    vca.gain.setTargetAtTime(db2mag(-12 * (1 - velocity)), at_time, 0.0001);
    vca.gain.setTargetAtTime(0, at_time + 0.01, 2 * decay * step_dur);

    setTimeout(() => {
      osc.stop();
      osc.disconnect();
      vca.disconnect();
    }, (at_time - ctx.currentTime) * 1000 + 2000);
  }

  public GetCurrentStep() {
    const data = new Float32Array(this.step_analyzer.fftSize);
    this.step_analyzer.getFloatTimeDomainData(data);
    return data[0];
  }

  public GetAnalyzer() {
    return this.analyzer;
  }

  public SetRingModParams(frequency: number, freq_range: number) {
    this.global_fm_osc.frequency.setTargetAtTime(
        frequency, this.ctx.currentTime, 0.1);
    this.global_fm_level.gain.setTargetAtTime(
        freq_range, this.ctx.currentTime, 0.1);
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

  public setOctave(octave: number) {
    this.octave = octave;
  }

  private step(current_time: number, step_duration: number): number {
    if (this.steps[this.current_step] == 1) {
      this.Trigger(
          current_time, this.velocity[this.current_step],
          this.decay[this.current_step], this.pitch_bend[this.current_step],
          this.tone[this.current_step], step_duration);
    }
    this.step_node.offset.setValueAtTime(this.current_step, current_time);
    current_time += step_duration;
    this.current_step = (this.current_step + 1) % this.total_steps;
    if (this.recording) this.record_steps--;
    return current_time;
  }

  private Sequence() {
    let current_time = this.ctx.currentTime;
    let step_duration = 60 / (4 * this.bpm);
    current_time = this.step(current_time, step_duration);
    this.sequence_timer = setInterval(() => {
      step_duration = 60 / (4 * this.bpm);
      // fired once when the recording is requested
      if (this.should_record && this.current_step == 0 && !this.recording) {
        this.recording = true;
        this.recording_node.StartRecording();
        console.log('Start Recording');
      }

      while (current_time < this.ctx.currentTime + step_duration) {
        current_time = this.step(current_time, step_duration);
      }

      if (this.recording) {
        if (this.record_steps < 0) {
          // stop recording
          this.recording = false;
          this.should_record = false;
          this.recording_node.StopRecording();
          console.log('Stop Recording');
          setTimeout(() => {
            if (this.recording_node.GetBlobURL() != null) {
              const link = document.createElement('a');
              const blob = this.recording_node.GetBlobURL();
              if (blob) {
                link.href = blob;
                link.download = 'bassline.webm';
                link.innerHTML = '';
                link.click();
                console.log('Downloading Recording');
              }
              this.setRecording(false);
            }
          }, 2000);
        }
      }
    }, 50);
  }

  public Start() {
    if (this.ctx.state == 'suspended') this.ctx.resume();
    if (!this.started) {
      this.global_fm_osc.start();
      this.step_node.start();
      this.started = true;
    }
    this.running = !this.running;
    if (!this.running) {
      clearInterval(this.sequence_timer);
    } else {
      this.current_step = 0;
      this.Sequence();
    }
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