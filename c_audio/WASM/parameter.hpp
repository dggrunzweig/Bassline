#pragma once

#include <assert.h>

class FloatParameter {
 public:
  FloatParameter() {
    setRange(0, 1);
    setValueImmediate(0);
  }
  FloatParameter(float init_value, float min_value, float max_value) {
    const bool valid_init =
        setRange(min_value, max_value) && setValueImmediate(init_value);
    assert(valid_init);
    if (!valid_init) {
      printf("Invalid Parameter Initialization Settings");
    }
  }
  bool setRange(float min, float max) {
    assert(min < max);
    if (min < max) {
      min_v_ = min;
      max_v_ = max;
      return true;
    } else {
      assert(false && "Invalid Parameter Range");
      return false;
    }
  }
  bool setValueInterpolate(float new_val, int interpolation_len) {
    assert(new_val >= min_v_ && new_val <= max_v_);
    if (new_val >= min_v_ && new_val <= max_v_) {
      next_value_ = new_val;
      interp_inc_ = (next_value_ - value_) / interpolation_len;
      interp_frames_ = interpolation_len;
      return true;
    } else {
      return false;
    }
  }
  float getValueAndInterpolate() {
    const float v = value_;
    value_ += interp_inc_;
    interp_frames_ = fmaxf(interp_frames_ - 1, 0);
    interp_inc_ *= fminf(1, interp_frames_);
    return v;
  }
  float getValue() { return value_; }
  bool setValueImmediate(float new_val) {
    if (new_val >= min_v_ && new_val <= max_v_) {
      value_ = next_value_ = new_val;
      interp_frames_ = 0;
      return true;
    } else {
      return false;
    }
  }

 private:
  float min_v_ = 0;
  float max_v_ = 0;
  float value_ = 0.;
  float next_value_ = 0.;
  float interp_inc_ = 0.;
  int interp_frames_ = 0;
};
