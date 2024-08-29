#include "wavetables.hpp"

#include <gtest/gtest.h>

#include "audio_utils.hpp"

using namespace wavetable;

TEST(WavetableTest, sine) {
  const int len = wt_length;
  const float allowable_error = 1e-6;  // -120dB
  for (int i = 0; i < len; ++i) {
    EXPECT_NEAR(sine_wt[i], sinf(audio_utils::TPI * i / len), allowable_error);
  }
}

TEST(WavetableTest, LUTPosition) {
  EXPECT_EQ(LUTPosition(0), 0);
  EXPECT_EQ(LUTPosition(audio_utils::TPI), 0);
  EXPECT_EQ(LUTPosition((wt_length - 1) * audio_utils::TPI), wt_length - 1);
  EXPECT_EQ(LUTPosition(0.5 * audio_utils::TPI), wt_length / 2);
  EXPECT_EQ(LUTPosition(-audio_utils::TPI), 0);
  EXPECT_EQ(LUTPosition(-0.9999 * audio_utils::TPI), 0);
  EXPECT_EQ(LUTPosition(-0.5 * audio_utils::TPI), wt_length / 2);
  EXPECT_EQ(LUTPosition(1.5 * audio_utils::TPI), wt_length / 2 - 1);
  EXPECT_EQ(LUTPosition(-1.5 * audio_utils::TPI), wt_length / 2);
}