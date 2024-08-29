#include "audio_utils.hpp"

#include <gtest/gtest.h>

TEST(AudioUtilsTest, PhasorTest) {
  EXPECT_FLOAT_EQ(0.01, audio_utils::Phasor(0, 1, 1. / 100.));
  EXPECT_FLOAT_EQ(-0.01, audio_utils::Phasor(0, -1, 1. / 100.));
  EXPECT_FLOAT_EQ(0.34, audio_utils::Phasor(0, 3.4, 1. / 10.));
}

TEST(AudioUtilsTest, RampValid) {
  EXPECT_FLOAT_EQ(0, audio_utils::Ramp(0, 1));
  EXPECT_FLOAT_EQ(0.99, audio_utils::Ramp(0.99, 1));
  EXPECT_FLOAT_EQ(0.5, audio_utils::Ramp(0.25, 2));
  EXPECT_FLOAT_EQ(0.0, audio_utils::Ramp(1., 2));
}

TEST(AudioUtilsTest, clamp) {
  EXPECT_FLOAT_EQ(0, audio_utils::clamp(-1, 0., 1.));
  EXPECT_FLOAT_EQ(1, audio_utils::clamp(2, 0., 1.));
  EXPECT_FLOAT_EQ(0.5, audio_utils::clamp(0.5, 0., 1.));
}

TEST(AudioUtilsTest, ADExpEnv) {
  float time = 0;
  float start_time = 0;
  float attack_time = 0.1;
  float decay_time = 0.1;
  float peak = 1.;
  EXPECT_FLOAT_EQ(0., audio_utils::ADExpEnv(time, start_time, attack_time, peak,
                                            decay_time));
  time = 0.05;
  EXPECT_FLOAT_EQ(0.25, audio_utils::ADExpEnv(time, start_time, attack_time,
                                              peak, decay_time));
  time = 0.1;
  peak = 2;
  EXPECT_FLOAT_EQ(peak, audio_utils::ADExpEnv(time, start_time, attack_time,
                                              peak, decay_time));
  time = 0.15;
  peak = 1;
  EXPECT_FLOAT_EQ(0.25, audio_utils::ADExpEnv(time, start_time, attack_time,
                                              peak, decay_time));

  time = 0.2;
  EXPECT_FLOAT_EQ(0., audio_utils::ADExpEnv(time, start_time, attack_time, peak,
                                            decay_time));
  time = 0.3;
  EXPECT_FLOAT_EQ(0., audio_utils::ADExpEnv(time, start_time, attack_time, peak,
                                            decay_time));
  time = -1;
  EXPECT_FLOAT_EQ(0., audio_utils::ADExpEnv(time, start_time, attack_time, peak,
                                            decay_time));
}

TEST(AudioUtilsTest, ADLinearEnv) {
  float time = 0;
  float start_time = 0;
  float attack_time = 0.1;
  float decay_time = 0.1;
  float peak = 1.;
  EXPECT_FLOAT_EQ(0., audio_utils::ADLinearEnv(time, start_time, attack_time,
                                               peak, decay_time));
  time = 0.05;
  EXPECT_FLOAT_EQ(0.5, audio_utils::ADLinearEnv(time, start_time, attack_time,
                                                peak, decay_time));
  time = 0.1;
  peak = 2;
  EXPECT_FLOAT_EQ(peak, audio_utils::ADLinearEnv(time, start_time, attack_time,
                                                 peak, decay_time));
  time = 0.15;
  peak = 1;
  EXPECT_FLOAT_EQ(0.5, audio_utils::ADLinearEnv(time, start_time, attack_time,
                                                peak, decay_time));

  time = 0.2;
  EXPECT_FLOAT_EQ(0., audio_utils::ADLinearEnv(time, start_time, attack_time,
                                               peak, decay_time));
  time = 0.3;
  EXPECT_FLOAT_EQ(0., audio_utils::ADLinearEnv(time, start_time, attack_time,
                                               peak, decay_time));
  time = -1;
  EXPECT_FLOAT_EQ(0., audio_utils::ADLinearEnv(time, start_time, attack_time,
                                               peak, decay_time));
}

TEST(AudioUtilsTest, db2mag) {
  EXPECT_NEAR(audio_utils::db2mag(0), 1., 0.02);
  EXPECT_NEAR(audio_utils::db2mag(-6), 0.5, 0.02);
  EXPECT_NEAR(audio_utils::db2mag(6), 2., 0.02);
}

TEST(AudioUtilsTest, mag2db) {
  EXPECT_NEAR(audio_utils::mag2db(0), -200, 0.03);
  EXPECT_NEAR(audio_utils::mag2db(0.5), -6, 0.03);
  EXPECT_NEAR(audio_utils::mag2db(1), 0, 0.03);
  EXPECT_NEAR(audio_utils::mag2db(2), 6, 0.03);
}
