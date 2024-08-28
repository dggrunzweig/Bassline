#include "audio_utils.hpp"

#include <gtest/gtest.h>
// Demonstrate some basic assertions.
TEST(AudioUtilsTest, RampValid) {
  EXPECT_FLOAT_EQ(0, Ramp(0, 1));
  EXPECT_FLOAT_EQ(0.99, Ramp(0.99, 1));
  EXPECT_FLOAT_EQ(0.5, Ramp(0.25, 2));
  EXPECT_FLOAT_EQ(0.0, Ramp(1., 2));
}

TEST(AudioUtilsTest, clamp) {
  EXPECT_FLOAT_EQ(0, clamp(-1, 0., 1.));
  EXPECT_FLOAT_EQ(1, clamp(2, 0., 1.));
  EXPECT_FLOAT_EQ(0.5, clamp(0.5, 0., 1.));
}

TEST(AudioUtilsTest, ADExpEnv) {
  float time = 0;
  float start_time = 0;
  float attack_time = 0.1;
  float decay_time = 0.1;
  float peak = 1.;
  EXPECT_FLOAT_EQ(0.,
                  ADExpEnv(time, start_time, attack_time, peak, decay_time));
  time = 0.05;
  EXPECT_FLOAT_EQ(0.25,
                  ADExpEnv(time, start_time, attack_time, peak, decay_time));
  time = 0.1;
  peak = 2;
  EXPECT_FLOAT_EQ(peak,
                  ADExpEnv(time, start_time, attack_time, peak, decay_time));
  time = 0.15;
  peak = 1;
  EXPECT_FLOAT_EQ(0.25,
                  ADExpEnv(time, start_time, attack_time, peak, decay_time));

  time = 0.2;
  EXPECT_FLOAT_EQ(0.,
                  ADExpEnv(time, start_time, attack_time, peak, decay_time));
  time = 0.3;
  EXPECT_FLOAT_EQ(0.,
                  ADExpEnv(time, start_time, attack_time, peak, decay_time));
  time = -1;
  EXPECT_FLOAT_EQ(0.,
                  ADExpEnv(time, start_time, attack_time, peak, decay_time));
}

TEST(AudioUtilsTest, ADLinearEnv) {
  float time = 0;
  float start_time = 0;
  float attack_time = 0.1;
  float decay_time = 0.1;
  float peak = 1.;
  EXPECT_FLOAT_EQ(0.,
                  ADLinearEnv(time, start_time, attack_time, peak, decay_time));
  time = 0.05;
  EXPECT_FLOAT_EQ(0.5,
                  ADLinearEnv(time, start_time, attack_time, peak, decay_time));
  time = 0.1;
  peak = 2;
  EXPECT_FLOAT_EQ(peak,
                  ADLinearEnv(time, start_time, attack_time, peak, decay_time));
  time = 0.15;
  peak = 1;
  EXPECT_FLOAT_EQ(0.5,
                  ADLinearEnv(time, start_time, attack_time, peak, decay_time));

  time = 0.2;
  EXPECT_FLOAT_EQ(0.,
                  ADLinearEnv(time, start_time, attack_time, peak, decay_time));
  time = 0.3;
  EXPECT_FLOAT_EQ(0.,
                  ADLinearEnv(time, start_time, attack_time, peak, decay_time));
  time = -1;
  EXPECT_FLOAT_EQ(0.,
                  ADLinearEnv(time, start_time, attack_time, peak, decay_time));
}

TEST(AudioUtilsTest, db2mag) {
  EXPECT_NEAR(db2mag(0), 1., 0.02);
  EXPECT_NEAR(db2mag(-6), 0.5, 0.02);
  EXPECT_NEAR(db2mag(6), 2., 0.02);
}

TEST(AudioUtilsTest, mag2db) {
  EXPECT_NEAR(mag2db(0), -200, 0.03);
  EXPECT_NEAR(mag2db(0.5), -6, 0.03);
  EXPECT_NEAR(mag2db(1), 0, 0.03);
  EXPECT_NEAR(mag2db(2), 6, 0.03);
}
