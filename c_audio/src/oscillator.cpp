#include "oscillator.hpp"

#include "audio_utils.hpp"

bool Oscillator::Initialize(unsigned int sample_rate) {
  if (sample_rate <= 0) {
    assert(false && "Oscillator: Invalid Sample Rate");
    return false;
  } else {
    fs_ = sample_rate;
    return true;
  }
}

float Oscillator::Sine(float f, float phase) {
  phase_ = audio_utils::Phasor(phase_, f, fs_);
  return sinf(audio_utils::TPI * phase_ + phase);
}

float Oscillator::OvertoneSeries(float f, float phase, float* weights,
                                 unsigned int num_overtones) {
  float y = 0;
  for (int i = 0; i < num_overtones; ++i) {
    float t = audio_utils::Phasor(phase_, (i + 1) * f, fs_);
    y += weights[i] * sinf(audio_utils::TPI * phase_ + phase);
  }
  phase_ = audio_utils::Phasor(phase_, f, fs_);
  return y;
}
