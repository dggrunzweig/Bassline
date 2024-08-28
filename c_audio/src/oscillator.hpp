#pragma once

class Oscillator {
 public:
  bool Initialize(unsigned int sample_rate);

  float Sine(float f, float phase);
  float OvertoneSeries(float f, float phase, float* weights,
                       unsigned int num_overtones);
  void ResetPhase() { phase_ = 0; };

 private:
  unsigned int fs_ = 0;
  float phase_ = 0;
};
