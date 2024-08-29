#pragma once

constexpr unsigned int kMaxOvertones = 128;
class Oscillator {
 public:
  bool Initialize(unsigned int sample_rate);

  float Sine(float f, float phase);
  float OvertoneSeries(float f, float phase, const float* weights,
                       unsigned int num_overtones);
  void ResetPhase();

 private:
  bool initialized_ = false;
  float T_fs_ = 0;
  float phase_[kMaxOvertones];
};
