#include "audio.hpp"

#include <cstring>

const unsigned kFramesPerBuffer = 128;
const unsigned kBytesPerChannel = kFramesPerBuffer * sizeof(float);
const float kAttackTime = 0.0001;
const float kEnvInterpRate = 0.1;

KickSynth::KickSynth(unsigned int sample_rate) {
  assert(sample_rate > 0);
  main_osc_.Initialize(sample_rate);
  tone_osc_.Initialize(sample_rate);
  fm_osc_.Initialize(sample_rate);
  fs_ = sample_rate;
  ClearSequencer();
  fm_level_.setRange(audio_utils::db2mag(-60), audio_utils::db2mag(36));
  fm_level_.setValueImmediate(audio_utils::db2mag(-60));
  fm_rate_.setRange(0, 10);
  fm_rate_.setValueImmediate(0);
  output_buffer_ = new float[kFramesPerBuffer];
}

KickSynth::~KickSynth() {
  if (record_buffer_) delete[] record_buffer_;
  if (output_buffer_) delete[] output_buffer_;
}

void KickSynth::Process(uintptr_t output_ptr, unsigned num_frames,
                        unsigned num_channels) {
  // expect interleaved input
  float* output_buffer = reinterpret_cast<float*>(output_ptr);

  if (!running_) {
    memset(output_buffer, 0, num_frames * num_channels * sizeof(float));
  } else {
    unsigned int record_offset = 0;
    const float t_inc = 1. / fs_;
    float x = 0;
    for (unsigned i = 0; i < num_frames; ++i) {
      // check if it should trigger a new step
      bool should_trig =
          use_midi_ ? (midi_ticks_ >= 6) : (t_ - t_last_ > step_duration_);
      // record buffer offset
      if (should_trig) {
        if (trigger_[step_] == 1) {
          t_ = 0;
          t_trig_ = t_;
          f_ = frequency_[step_];
          // convert velocity to db scale
          v_ = audio_utils::db2mag(velocity_[step_] * 16 - 16);
          // duration is a multiple of step length
          d_ = duration_[step_] * step_duration_;
          b_ = bend_[step_];
          // convert tone to usable value (-24 -> 12 db);
          tn_ = audio_utils::db2mag((tone_[step_]) * 36 - 24);
          if (record_ready_ && step_ == 0) {
            record_offset = i;
            record_begin_ = true;
          }
        }
        midi_ticks_ = 0;
        t_last_ = t_;
        step_ = (step_ + 1) % seq_length_;
      }

      // generate voice
      output_buffer_[i] = Voice(t_, t_trig_, f_, v_, d_, b_, tn_,
                                fm_level_.getValueAndInterpolate(),
                                fm_rate_.getValueAndInterpolate());

      // increment phase
      t_ += t_inc;
    }
    // copy out to the channels of the output buffer
    for (unsigned ch = 0; ch < num_channels; ++ch) {
      memcpy(&output_buffer[ch * num_frames], output_buffer_,
             num_frames * sizeof(float));
    }
    // copy to record buffer if needed
    if (record_begin_) {
      PushBufferToRecordBuffer(output_buffer_, num_frames, record_offset,
                               (num_frames - record_offset));
    }
  }
}

float KickSynth::Voice(const float time, const float trig_time,
                       const float frequency, const float velocity,
                       const float duration, const float bend, const float tone,
                       const float global_fm, const float global_fm_mult) {
  const float v_env_instant =
      audio_utils::ADExpEnv(time, trig_time, kAttackTime, velocity, duration);
  v_env_ = v_env_ + kEnvInterpRate * (v_env_instant - v_env_);
  const float p_env_instant = audio_utils::ADExpEnv(
      time, trig_time, kAttackTime, 12 * frequency * bend, duration / 4);
  p_env_ = p_env_ + kEnvInterpRate * (p_env_instant - p_env_);
  float f = frequency + p_env_;
  const float phase_m = tone * tone_osc_.Sine(1.07 * frequency, 0) +
                        global_fm * fm_osc_.Sine(global_fm_mult * frequency, 0);

  // harmonic waveform 1 = 0db, 2 = -24db (0.0631), 3 = -40dB (0.01);
  float harmonic_weights[3] = {1, 0.0631, 0.01};
  return v_env_ * main_osc_.OvertoneSeries(f, phase_m, harmonic_weights, 3);
}

void KickSynth::Start() {
  running_ = true;
  t_ = 0;
  t_last_ = 0;
  t_trig_ = -1;
  step_ = 0;
}

void KickSynth::Stop() { running_ = false; }

void KickSynth::SetBPM(float bpm) {
  assert(bpm > 0);
  // only allow bpm between 40 and 300;
  bpm_ = audio_utils::clamp(bpm, 40, 300);
  step_duration_ = 60 / (bpm_ * 4);
};

void KickSynth::ClearSequencer() {
  for (int i = 0; i < kMaxSteps; ++i) {
    trigger_[i] = false;
    frequency_[i] = 50;
    velocity_[i] = 1.0;
    duration_[i] = 0.1;
    bend_[i] = 1.0;
    tone_[i] = 0.0;
  }

  f_ = 50;
  v_ = 0;
  d_ = 0.1;
  b_ = 0;
  tn_ = 0;
}

void KickSynth::SetTrig(bool on, int step) {
  assert(step >= 0 && step < kMaxSteps);
  trigger_[step] = on;
}

void KickSynth::SetFrequency(float f, int step) {
  assert(step >= 0 && step < kMaxSteps);
  assert(f >= 20 && f <= 5000 &&
         "Frequency invalid, must be between 20 and 5000");
  frequency_[step] = audio_utils::clamp(f, 20, 5000);
}

void KickSynth::SetVelocity(float v, int step) {
  assert(step >= 0 && step < kMaxSteps);
  assert(v >= 0 && v <= 1 && "Velocity invalid, must be between 0 and 1");
  velocity_[step] = audio_utils::clamp(v, 0, 1);
}

void KickSynth::SetDuration(float d, int step) {
  assert(step >= 0 && step < kMaxSteps);
  assert(d >= 0 && d <= 1 && "Duration invalid, must be between 0 and 1");
  duration_[step] = 6 * audio_utils::clamp(d, 0.0001, 1);
}

void KickSynth::SetBend(float b, int step) {
  assert(step >= 0 && step < kMaxSteps);
  assert(b >= 0 && b <= 1 && "Bend Invalid, must be between 0 and 1");
  bend_[step] = audio_utils::clamp(b, 0, 1);
}

void KickSynth::SetTone(float t, int step) {
  assert(step >= 0 && step < kMaxSteps);
  assert(t >= 0 && t <= 1 && "Tone Invalid, must be between 0 and 1");
  tone_[step] = audio_utils::clamp(t, 0, 1);
}

void KickSynth::SetGlobalFM(float level_dB, float rate_multiplier) {
  assert(rate_multiplier >= 0 && rate_multiplier <= 10 &&
         "FM Rate Multiplier Invalid, must be between 0 and 10");
  assert(level_dB >= -60 && level_dB <= 36 &&
         "FM level Invalid, must be between -60dB and 36dB");
  fm_level_.setValueInterpolate(audio_utils::db2mag(level_dB),
                                kFramesPerBuffer);
  fm_rate_.setValueInterpolate(audio_utils::clamp(rate_multiplier, 0, 10),
                               kFramesPerBuffer);
}

void KickSynth::SetSequenceLength(int steps) {
  assert(steps <= kMaxSteps && steps > 0 &&
         "Invalid number of steps, must be between 1 and max allowable steps");
  seq_length_ = steps;
}

void KickSynth::UseMIDI(bool use_midi) { use_midi_ = use_midi; }

void KickSynth::MIDIClockPulse() { midi_ticks_++; }

void KickSynth::MIDIClockReset() { midi_ticks_ = 0; }

void KickSynth::RecordAudio(unsigned int num_sequence_loops) {
  // mono output recording
  // calculate steps
  remaining_frames_ = num_sequence_loops * seq_length_;
  // calculate frames
  remaining_frames_ *= (step_duration_ * fs_);
  buffer_offset_ = 0;
  buffer_len_ = remaining_frames_;
  // create buffer
  if (record_buffer_) delete[] record_buffer_;
  record_buffer_ = new float[remaining_frames_];
  memset(record_buffer_, 0, remaining_frames_ * sizeof(float));
  // let the system know it's ready
  record_ready_ = true;
  record_finished_ = false;
  record_begin_ = false;
}

void KickSynth::PushBufferToRecordBuffer(float* buffer, int buffer_len,
                                         int offset, int frames_to_copy) {
  assert(frames_to_copy + offset <= buffer_len &&
         "Offset + frames to copy must be less than or equal to the number of "
         "frames in the buffer");
  if (remaining_frames_ > frames_to_copy) {
    memcpy(&record_buffer_[buffer_offset_], &buffer[offset],
           frames_to_copy * sizeof(float));
    remaining_frames_ -= frames_to_copy;
    buffer_offset_ += frames_to_copy;
  } else {
    memcpy(&record_buffer_[buffer_offset_], &buffer[offset],
           remaining_frames_ * sizeof(float));
    remaining_frames_ = 0;
    buffer_offset_ = 0;
    record_ready_ = false;
    record_begin_ = false;
    record_finished_ = true;
  }
}

uintptr_t KickSynth::GetRecordBufferAsWav() {
  if (record_finished_) {
    uint8_t* wav_stream =
        wav_writer_.Write(record_buffer_, 1, buffer_len_, fs_);
    return uintptr_t(&wav_stream[0]);
  } else {
    assert(false && "Recording process not finished");
    return 0;
  }
}

int KickSynth::GetWavSizeInBytes() {
  return buffer_len_ * 2 + sizeof(WAVHeader);
};
