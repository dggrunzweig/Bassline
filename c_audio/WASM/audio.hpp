#pragma once

#include <emscripten.h>
#include <emscripten/bind.h>

#include "audio_utils.hpp"
#include "oscillator.hpp"
#include "parameter.hpp"

using namespace emscripten;

constexpr int kMaxSteps = 16;

class KickSynth {
 public:
  KickSynth(unsigned int sample_rate);
  ~KickSynth() = default;

  void Process(uintptr_t output_ptr, unsigned num_frames,
               unsigned num_channels);
  void Start();
  void Stop();
  int GetStep() { return step_; };
  void SetBPM(float bpm);
  void SetTrig(bool on, int step);
  void SetFrequency(float f, int step);
  void SetVelocity(float v, int step);
  void SetDuration(float d, int step);
  void SetBend(float b, int step);
  void SetTone(float t, int step);
  void SetGlobalFM(float level_dB, float rate);
  void SetSequenceLength(int steps);

 private:
  Oscillator main_osc_;
  Oscillator tone_osc_;
  Oscillator fm_osc_;
  bool running_ = false;
  float v_env_ = 0;
  float p_env_ = 0;
  float t_ = 0;
  float t_trig_ = 0;
  float t_last_ = 0;
  unsigned int fs_;
  // sequencer controls and memory
  float bpm_ = 0;
  float step_duration_ = 0;
  int step_ = 0;
  int seq_length_ = 8;
  bool trigger_[kMaxSteps];
  float frequency_[kMaxSteps];
  float velocity_[kMaxSteps];
  float duration_[kMaxSteps];
  float bend_[kMaxSteps];
  float tone_[kMaxSteps];
  // Global FM
  FloatParameter fm_level_;
  FloatParameter fm_rate_;

  // current step settings
  float f_ = 0;
  float v_ = 0;
  float d_ = 0;
  float b_ = 0;
  float tn_ = 0;

  float Voice(const float time, const float trig_time, const float frequency,
              const float velocity, const float duration, const float bend,
              const float tone, const float global_fm,
              const float global_fm_rate);

  void ClearSequencer();
};

EMSCRIPTEN_BINDINGS(CLASS_KickSynth) {
  class_<KickSynth>("KickSynth")
      .constructor<float>()
      .function("Process", &KickSynth::Process, allow_raw_pointers())
      .function("Start", &KickSynth::Start)
      .function("Stop", &KickSynth::Stop)
      .function("GetStep", &KickSynth::GetStep)
      .function("SetBPM", &KickSynth::SetBPM)
      .function("SetTrig", &KickSynth::SetTrig)
      .function("SetFrequency", &KickSynth::SetFrequency)
      .function("SetVelocity", &KickSynth::SetVelocity)
      .function("SetDuration", &KickSynth::SetDuration)
      .function("SetBend", &KickSynth::SetBend)
      .function("SetTone", &KickSynth::SetTone)
      .function("SetGlobalFM", &KickSynth::SetGlobalFM)
      .function("SetSequenceLength", &KickSynth::SetSequenceLength);
}