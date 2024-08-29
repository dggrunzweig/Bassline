#include "oscillator.hpp"

#include <gtest/gtest.h>

#include "audio_utils.hpp"

TEST(OscillatorTest, Initialize) {
  Oscillator osc;
  EXPECT_TRUE(osc.Initialize(48000));
  EXPECT_FALSE(osc.Initialize(0));
}

TEST(OscillatorTest, PhaseReset) {
  const unsigned int sample_rate = 100;
  Oscillator osc;
  EXPECT_TRUE(osc.Initialize(sample_rate));
  // offset phase by calling sine function a few times
  float y = 0;
  for (int i = 0; i < 10; ++i) {
    y = osc.Sine(1, 0);
  }
  EXPECT_NE(y, 0.);
  osc.ResetPhase();
  y = osc.Sine(1, 0);
  EXPECT_EQ(y, 0.);
}

TEST(OscillatorTest, Sine) {
  const unsigned int sample_rate = 100;
  Oscillator osc;
  EXPECT_TRUE(osc.Initialize(sample_rate));
  // offset phase by calling sine function a few times
  float allowable_error =
      0.0032;  //-50 dB of quantization noise using wavetable
  const int num_f = 100;
  for (int f = 0; f < num_f; ++f) {
    const float root_f = (f + 1) * 150;  // tests up to 15KHz
    // wavetables have more error as frequency increases
    if (root_f > 5000) allowable_error = 0.008;
    if (root_f > 10000) allowable_error = 0.013;
    for (int i = 0; i < 100; ++i) {
      EXPECT_NEAR(osc.Sine(root_f, 0),
                  sinf(audio_utils::TPI * root_f * i / sample_rate),
                  allowable_error);
    }
  }
}

TEST(OscillatorTest, SineWithPhase) {
  const unsigned int sample_rate = 100;
  Oscillator osc;
  EXPECT_TRUE(osc.Initialize(sample_rate));
  const float root_f = 13;
  const float allowable_error_phase = 0.0063;  // -44 dB;
  for (float phase = 0; phase < audio_utils::TPI; phase += 0.1) {
    for (int i = 0; i < 100; ++i) {
      EXPECT_NEAR(osc.Sine(root_f, phase),
                  sinf(audio_utils::TPI * root_f * i / sample_rate + phase),
                  allowable_error_phase);
    }
  }
}

TEST(OscillatorTest, OvertoneSeries) {
  const unsigned int sample_rate = 100;
  Oscillator osc;
  EXPECT_TRUE(osc.Initialize(sample_rate));
  const float allowable_error = 0.009;  //-40dB

  const int num_weights = 5;
  float weights[num_weights] = {1, 0.9, 0.8, 0.7, 0.6};
  const float root_f = 110;
  // test with no added phase
  for (int i = 0; i < 1000; ++i) {
    float y = osc.OvertoneSeries(root_f, 0, weights, num_weights);
    float y_i = 0;
    for (int w = 0; w < num_weights; ++w) {
      y_i += weights[w] *
             sinf(audio_utils::TPI * root_f * (w + 1) * i / sample_rate);
    }
    EXPECT_NEAR(y, y_i, allowable_error);
  }
}

TEST(OscillatorTest, OvertoneSeriesWithPhase) {
  const unsigned int sample_rate = 100;
  Oscillator osc;
  EXPECT_TRUE(osc.Initialize(sample_rate));
  const int num_weights = 5;
  float weights[num_weights] = {1, 0.9, 0.8, 0.7, 0.6};
  const float root_f = 13;
  const float allowable_error_phase = 0.0231;  // -32 dB;
  for (float phase = 0; phase < 2 * M_PI; phase += 0.1) {
    for (int i = 0; i < 100; ++i) {
      float y = osc.OvertoneSeries(root_f, phase, weights, num_weights);
      float y_i = 0;
      for (int w = 0; w < num_weights; ++w) {
        y_i +=
            weights[w] *
            sinf(audio_utils::TPI * root_f * (w + 1) * i / sample_rate + phase);
      }
      EXPECT_NEAR(y, y_i, allowable_error_phase);
    }
  }
}