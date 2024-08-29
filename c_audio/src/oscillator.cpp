#include "oscillator.hpp"

#include <cstdio>
#include <cstring>

#include "audio_utils.hpp"
#include "wavetables.hpp"

bool Oscillator::Initialize(unsigned int sample_rate) {
  if (sample_rate <= 0) {
    assert(false && "Oscillator: Invalid Sample Rate");
    return false;
  } else {
    T_fs_ = 1.0f / sample_rate;
    initialized_ = true;
    ResetPhase();
    return true;
  }
}

void Oscillator::ResetPhase() {
  memset(phase_, 0, kMaxOvertones * sizeof(float));
}

float Oscillator::Sine(float f, float phase) {
  if (!initialized_) {
    assert(false && "Oscillator Not Initialized.");
    return 0;
  }

  float y = wavetable::sine_wt[wavetable::LUTPosition(
      audio_utils::TPI * phase_[0] + phase)];
  phase_[0] = audio_utils::Phasor(phase_[0], f, T_fs_);
  return y;
}

float Oscillator::OvertoneSeries(float f, float phase, const float* weights,
                                 unsigned int num_overtones) {
  if (!initialized_) {
    assert(false && "Oscillator Not Initialized.");
    return 0;
  }
  if (num_overtones > kMaxOvertones) {
    assert(
        false &&
        "Requested number of overtones exceeds max allowed by kMaxOvertones");
    return 0;
  }
  float y = 0;
  for (int i = 0; i < num_overtones; ++i) {
    y += weights[i] * wavetable::sine_wt[wavetable::LUTPosition(
                          audio_utils::TPI * phase_[i] + phase)];
    phase_[i] = audio_utils::Phasor(phase_[i], f * (i + 1), T_fs_);
  }
  return y;
}
