import KickSynth from './kick-synth';
import {BrowserSupportsMIDI, MidiInit, RemoveAllDeviceListeners, SetDeviceInputEventListener} from './midi_utility';
import {clamp, createAudioContext, NoteToPitch} from './Utilities';

export class AudioMain {
  private ctx: AudioContext;
  private synth_engine_: KickSynth;
  private sequence_length_ = 0;
  private bpm = 0;
  private octave = 2;
  private root_note = 'G';
  private record_loops_ = 4;
  private midi_supported = false;
  private midi: MIDIAccess|undefined;
  private using_midi = false;
  private clock_pulses = 0;
  private midi_step_time = 0;
  private midi_tempo = 120;
  constructor(num_steps: number, bpm: number) {
    this.ctx = createAudioContext();
    this.bpm = bpm;
    this.sequence_length_ = num_steps;
    this.synth_engine_ = new KickSynth(this.ctx, num_steps, bpm);

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
    this.Stop();
    if (this.midi) {
      RemoveAllDeviceListeners(this.midi);
      if (name === 'None') {
        this.using_midi = false;
        this.synth_engine_.UseMIDI(false);
        return;
      }
      SetDeviceInputEventListener(this.midi, name, (data: number[]) => {
        // look for clock signal only
        this.ProcessMidiData(data);
      });
      this.using_midi = true;
      this.synth_engine_.UseMIDI(true);
    }
  }
  private ProcessMidiData(data: number[]) {
    if (!this.midi_supported || !this.using_midi) return;
    const lower_half = data[0] & 0b00001111;
    const upper_half = (data[0] & 0b11110000) >> 4;
    if (upper_half == 15) {
      // midi clock pulse, 24 per quarter note
      if (lower_half == 8) {
        if (this.synth_engine_.isRunning()) {
          // increment the sequencer, expects 24 Pulses Per Quarter Note
          this.synth_engine_.MIDIClick();
          this.clock_pulses = (this.clock_pulses + 1) %
              24;  // 24 pulses per quarter note, 6 pulses = 16th
          if (this.clock_pulses == 0) {
            const tempo_estimate =
                60 / (this.ctx.currentTime - this.midi_step_time);
            this.midi_tempo = Math.round(
                this.midi_tempo + 0.5 * (tempo_estimate - this.midi_tempo));
            this.synth_engine_.SetBPM(this.midi_tempo);
            this.midi_step_time = this.ctx.currentTime;
          }
        }
      }
      // start message
      if (lower_half == 10) {
        this.Start();
      }
      // stop message
      if (lower_half == 12) {
        this.Stop();
      }
    }
  }

  public GetCurrentStep() {
    return this.synth_engine_.GetStep();
  }

  public GetAnalyzer() {
    return this.synth_engine_.GetAnalyzer();
  }

  public SetGlobalFM(frequency: number, level_dB: number) {
    this.synth_engine_.SetGlobalFM(level_dB, frequency);
  };

  public SetTrigger(on: boolean, step: number) {
    this.synth_engine_.SetTrig(on, step);
  }

  public setVelocity(velocity: number, step: number) {
    this.synth_engine_.SetVelocity(velocity, step);
  }

  public setPitchBend(pb: number, step: number) {
    this.synth_engine_.SetBend(pb, step);
  }

  public setTone(tone: number, step: number) {
    this.synth_engine_.SetTone(tone, step);
  }

  public setDecay(decay: number, step: number) {
    // allows decay time to be between 0 and 4 steps long
    this.synth_engine_.SetDuration(4 * decay, step);
  }

  public setBPM(bpm: number) {
    this.bpm = bpm;
    this.synth_engine_.SetBPM(bpm);
  }

  public setDelayParams(gain_db: number, fb_db: number) {
    this.synth_engine_.setDelayParams(gain_db, fb_db);
  }

  public setHPFrequency(frequency: number) {
    this.synth_engine_.setHPFrequency(frequency);
  }

  public setOctave(octave: number) {
    this.octave = octave;
    for (let i = 0; i < this.sequence_length_; ++i) {
      this.synth_engine_.SetFrequency(
          NoteToPitch(this.root_note, this.octave), i);
    }
  }

  public setRootNote(note: string) {
    this.root_note = note;
    for (let i = 0; i < this.sequence_length_; ++i) {
      this.synth_engine_.SetFrequency(
          NoteToPitch(this.root_note, this.octave), i);
    }
  }

  private Start() {
    this.synth_engine_.Start();
    if (this.using_midi) {
      this.clock_pulses = 0;
      this.midi_step_time = this.ctx.currentTime;
      this.synth_engine_.MIDIClockReset();
    }
  }

  private Stop() {
    this.synth_engine_.Stop();
    if (!this.using_midi) {
      setTimeout(() => {
        if (!this.synth_engine_.isRunning()) this.ctx.suspend();
      }, 1000);
    } else {
      this.synth_engine_.MIDIClockReset();
      this.clock_pulses = 0;
    }
  }

  public Run() {
    if (this.synth_engine_.isRunning())
      this.Stop();
    else
      this.Start();
  }

  public isRunning() {
    return this.synth_engine_.isRunning();
  }

  public isUsingMidi() {
    return this.using_midi;
  }

  public getMidiAccess() {
    if (!this.midi_supported) return undefined;
    return this.midi;
  }
  public SetRecordDuration(num_sequence_loops: number) {
    this.record_loops_ = clamp(num_sequence_loops, 4, 16);
  }
  public RecordAudio(setRecording: Function) {
    this.synth_engine_.StartRecord(this.record_loops_);
    setRecording(true);

    let id = setInterval(() => {
      if (this.synth_engine_.FinishedRecording()) {
        setRecording(false);
        clearInterval(id);
        // request data
        this.synth_engine_.GetRecordBuffer();
      }
    }, 500);
  }
}