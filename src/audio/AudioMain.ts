import {BrowserSupportsMIDI, MidiInit, RemoveAllDeviceListeners, SetDeviceInputEventListener} from './midi_utility';
import RecorderNode from './RecorderNode';
import {BPMToTime, createAudioContext, createBiquadFilter, createCompressor, createDigitalDelay, createGain, createOscillator, db2mag, DigitalDelay, NoteToPitch} from './Utilities';

export class AudioMain {
  private ctx: AudioContext;
  private comp: DynamicsCompressorNode;
  private global_fm_level: GainNode;
  private global_fm_osc: OscillatorNode;
  private synth_gain: GainNode;
  private output_gain: GainNode;
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
  private record_steps = 64;
  private record_duration = 64;
  private recording_node: RecorderNode;
  private setRecording: Function;
  private midi_supported = false;
  private midi: MIDIAccess|undefined;
  private using_midi = false;
  private clock_pulses = 0;
  private midi_step_time = 0;
  private midi_tempo = 120;
  private root_note = 'G';
  constructor(num_steps: number, bpm: number) {
    this.ctx = createAudioContext();
    this.comp = createCompressor(this.ctx, -12, 4, 4, 0.02, 0.1);
    this.global_fm_level = createGain(this.ctx, 0.6);
    this.global_fm_osc = createOscillator(this.ctx, 'triangle', 100, 0);
    this.hp = createBiquadFilter(this.ctx, 'highpass', 20, 4.0, 0);
    this.synth_gain = createGain(this.ctx, db2mag(-6));
    this.output_gain = createGain(this.ctx, 0);
    this.delay = createDigitalDelay(this.ctx, BPMToTime(bpm, 3 / 8), -6);
    const delay_filter = createBiquadFilter(this.ctx, 'highpass', 400, 2.0, 0.);
    this.delay.output.gain.setValueAtTime(0, 0);
    this.analyzer = this.ctx.createAnalyser();
    this.step_node = this.ctx.createConstantSource();
    this.step_analyzer = this.ctx.createAnalyser();
    this.step_node.connect(this.step_analyzer);

    // end chain
    this.synth_gain.connect(this.hp)
        .connect(this.comp)
        .connect(this.output_gain)
        .connect(this.ctx.destination);
    this.comp.connect(this.analyzer);
    this.synth_gain.connect(delay_filter).connect(this.delay.input);
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

    // midi
    this.midi_supported = BrowserSupportsMIDI();
    if (this.midi_supported) {
      MidiInit().then((midi) => {
        this.midi = midi;
      });
    }
  }
  public setMidiDevice(name: string) {
    if (!this.midi_supported) return;
    if (this.midi) {
      RemoveAllDeviceListeners(this.midi);
      if (name === 'None') {
        this.using_midi = false;
        return;
      }
      SetDeviceInputEventListener(this.midi, name, (data: number[]) => {
        // look for clock signal only
        this.ProcessMidiData(data);
      });
      clearInterval(this.sequence_timer);
      this.running = false;
      this.using_midi = true;
    }
  }
  private ProcessMidiData(data: number[]) {
    if (!this.midi_supported) return;
    const lower_half = data[0] & 0b00001111;
    const upper_half = (data[0] & 0b11110000) >> 4;
    if (upper_half == 15) {
      // midi clock pulse, 24 per quarter note
      if (lower_half == 8) {
        this.using_midi = true;
        if (this.running) {
          // 6 clock pulses == 16th note
          if ((this.clock_pulses % 6) == 0) {
            this.Record();
            if (this.steps[this.current_step] == 1) {
              this.Trigger(
                  this.ctx.currentTime + 0.01, this.velocity[this.current_step],
                  this.decay[this.current_step],
                  this.pitch_bend[this.current_step],
                  this.tone[this.current_step], 60 / (this.midi_tempo * 4));
            }
            this.step_node.offset.setValueAtTime(
                this.current_step, this.ctx.currentTime);
            this.current_step = (this.current_step + 1) % this.total_steps;
          }
          this.clock_pulses = (this.clock_pulses + 1) %
              24;  // 24 pulses per quarter note, 6 pulses = 16th
          if (this.clock_pulses == 0) {
            const tempo_estimate =
                60 / (this.ctx.currentTime - this.midi_step_time);
            this.midi_tempo = Math.round(
                this.midi_tempo + 0.5 * (tempo_estimate - this.midi_tempo));
            this.delay.delay.delayTime.setTargetAtTime(
                BPMToTime(this.midi_tempo, 3 / 8), this.ctx.currentTime, 0.1);
            this.midi_step_time = this.ctx.currentTime;
          }
        }
      }
      // start message
      if (lower_half == 10) {
        this.Start(true);
      }
      // stop message
      if (lower_half == 12) {
        this.Stop(true);
      }
    }
  }

  private Trigger(
      at_time: number, velocity: number, decay: number, pitch_bend: number,
      tone: number, step_dur: number) {
    if (!this.running) return;
    const ctx = this.ctx;
    const cur_time = ctx.currentTime;
    const root_hz = NoteToPitch(this.root_note, this.octave);
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
    osc.connect(vca).connect(this.synth_gain);

    vca.gain.setTargetAtTime(db2mag(-12 * (1 - velocity)), at_time, 0.0001);
    vca.gain.setTargetAtTime(0, at_time + 0.01, 2 * decay * step_dur);

    setTimeout(() => {
      vca.gain.setValueAtTime(0, ctx.currentTime);
      osc.stop();
      fm_osc.stop();
      osc.disconnect();
      fm_osc.disconnect();
      fm_gain.disconnect();
      vca.disconnect();
    }, (at_time - cur_time) * 1000 + 2000);
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

  public setRootNote(note: string) {
    this.root_note = note;
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
    return current_time;
  }

  private Record() {
    // fired once when the recording is requested
    if (this.should_record && this.current_step == 0 && !this.recording) {
      this.recording = true;
      this.recording_node.StartRecording();
      this.record_steps = this.record_duration;
    }

    // while Recording
    if (this.recording) {
      if (this.record_steps <= 0) {
        // stop recording
        this.recording = false;
        this.should_record = false;
        this.recording_node.StopRecording();
        setTimeout(() => {
          if (this.recording_node.GetBlobURL() != null) {
            const link = document.createElement('a');
            const blob = this.recording_node.GetBlobURL();
            if (blob) {
              link.href = blob;
              link.download = 'substrata' + this.recording_node.GetExtension();
              link.innerHTML = '';
              link.click();
            }
            this.setRecording(false);
          }
        }, 2000);
      }
      this.record_steps--;
    }
  }

  private Sequence() {
    let current_time = this.ctx.currentTime;
    let step_duration = 60 / (4 * this.bpm);
    current_time = this.step(current_time, step_duration);
    this.sequence_timer = setInterval(() => {
      step_duration = 60 / (4 * this.bpm);
      while (current_time < this.ctx.currentTime + step_duration) {
        this.Record();
        current_time = this.step(current_time, step_duration);
      }
    }, 50);
  }

  private InitialStart() {
    if (this.ctx.state == 'suspended') this.ctx.resume();
    if (!this.started) {
      this.global_fm_osc.start();
      this.step_node.start();
      this.started = true;
    }
  }

  private Start(midi = false) {
    this.InitialStart();
    this.running = true;
    this.current_step = 0;
    this.output_gain.gain.setTargetAtTime(1, this.ctx.currentTime, 0.1);
    if (!midi) {
      this.Sequence();
      this.using_midi = false;
    } else {
      clearInterval(this.sequence_timer);
      this.using_midi = true;
      this.clock_pulses = 0;
      this.midi_step_time = this.ctx.currentTime;
    }
  }

  private Stop(midi = false) {
    this.running = false;
    clearInterval(this.sequence_timer);
    this.output_gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.5);
    if (!midi) {
      setTimeout(() => {
        if (!this.running) this.ctx.suspend();
      }, 1000);
    } else {
      this.using_midi = false;
    }
  }

  public Run() {
    this.InitialStart();
    if (this.running)
      this.Stop();
    else
      this.Start();
  }

  public isRunning() {
    return this.running;
  }

  public isUsingMidi() {
    return this.using_midi;
  }

  public getMidiAccess() {
    if (!this.midi_supported) return undefined;
    return this.midi;
  }

  public SetRecordDuration(duration_measures: number) {
    this.record_duration = duration_measures * 16;
  }

  public RecordAudio(setRecording: Function) {
    this.should_record = true;
    this.setRecording = setRecording;
    setRecording(true);
  }
}