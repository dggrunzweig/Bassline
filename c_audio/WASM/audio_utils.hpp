#pragma once

#include <assert.h>

#include <cmath>

namespace audio_utils {

const float PI = 3.141592654;
const float TPI = 6.28318530718;

static float db2mag(float db) { return powf(10, db / 20); }

static float mag2db(float mag) {
  assert(mag >= 0);
  return mag == 0 ? -200 : 20 * log10f(mag);
}

static float Phasor(float phase, float frequency, float fs) {
  phase += frequency / fs;
  phase -= truncf(phase);
  return phase;
}

static float Ramp(float time, float frequency) {
  assert(time >= 0 && "Ramp: Time must be greather than or equal to 0");
  assert(frequency >= 0 && "Ramp: Time must be greather than or equal to 0");
  float y = time * frequency;
  y -= truncf(y);
  return y;
}

static float clamp(const float x, const float minv, const float maxv) {
  return fmaxf(minv, fminf(x, maxv));
}

static float ADExpEnv(const float time, const float start_time,
                      const float attack_time, const float peak,
                      const float decay_time) {
  assert(attack_time > 0 && "ADExpEnv: Attack Time must be greater than 0");
  assert(decay_time > 0 && "ADExpEnv: Decay Time must be greater than 0");
  const float t_a = time - start_time;
  const float t_d = time - (start_time + attack_time);
  const float a_env = clamp(t_a / attack_time, 0, 1);
  const float d_env = 1 - clamp(t_d / decay_time, 0, 1);
  return peak * a_env * a_env * d_env * d_env;
}

static float ADLinearEnv(const float time, const float start_time,
                         const float attack_time, const float peak,
                         const float decay_time) {
  const float t_a = time - start_time;
  const float t_d = time - (start_time + attack_time);
  const float a_env = clamp(t_a / attack_time, 0, 1);
  const float d_env = 1 - clamp(t_d / decay_time, 0, 1);
  return peak * a_env * d_env;
}
}  // namespace audio_utils
