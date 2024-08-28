import KickSynth from './kick-synth'

const num_steps = 8;
const audio_ctx = new AudioContext();
audio_ctx.suspend();
let playing = false;
let trigs = new Array<boolean>(num_steps).fill(false);
let kick_synth: KickSynth;
window.onload = () => {
  kick_synth = new KickSynth(audio_ctx, num_steps, 130);
};

// A simple onLoad handler. It also handles user gesture to unlock the
// audio playback.
window.addEventListener('load', async () => {
  document.body.style.display = 'flex';
  document.body.style.gap = '8px';
  const start_button = document.createElement('button');
  document.body.append(start_button);
  start_button.textContent = 'Start';
  start_button.disabled = false;
  start_button.style.height = '48px';
  start_button.addEventListener('click', async () => {
    playing = !playing;
    if (audio_ctx.state == 'suspended') audio_ctx.resume();
    if (playing) {
      start_button.textContent = 'Stop ';
      kick_synth.Start();
    } else {
      kick_synth.Stop();
      start_button.textContent = 'Start';
    }
  }, false);

  // trig buttons
  const trig_div = document.createElement('div');
  trig_div.style.display = 'flex';
  trig_div.style.gap = '2px';

  document.body.append(trig_div);

  // global fm controls
  // Rate Sliders
  const fm_level_slider = document.createElement('input');
  fm_level_slider.style.writingMode = 'vertical-lr';
  fm_level_slider.style.direction = 'rtl';
  fm_level_slider.style.height = '96px';
  fm_level_slider.type = 'range';
  fm_level_slider.min = '-60';
  fm_level_slider.max = '0';
  fm_level_slider.value = '-60';
  fm_level_slider.step = '1';
  trig_div.append(fm_level_slider)

  // Rate Sliders
  const fm_rate_slider = document.createElement('input');
  fm_rate_slider.style.writingMode = 'vertical-lr';
  fm_rate_slider.style.direction = 'rtl';
  fm_rate_slider.style.height = '96px';
  fm_rate_slider.type = 'range';
  fm_rate_slider.min = '0';
  fm_rate_slider.max = '1000';
  fm_rate_slider.value = '0';
  fm_rate_slider.step = '1';
  trig_div.append(fm_rate_slider)

  fm_level_slider.oninput = () => {
    kick_synth.SetGlobalFM(
        parseFloat(fm_level_slider.value), parseFloat(fm_rate_slider.value));
  };

  fm_rate_slider.oninput = () => {
    kick_synth.SetGlobalFM(fm_level_slider.value, fm_rate_slider.value);
  };

  for (let i = 0; i < num_steps; ++i) {
    const settings_div = document.createElement('div');
    settings_div.style.display = 'flex';
    settings_div.style.flexDirection = 'column';
    settings_div.style.gap = '4px';
    settings_div.style.justifyContent = 'center'
    // trig button
    const trig_button = document.createElement('button');
    trig_button.textContent = '' + i;
    trig_button.disabled = false;
    trig_button.style.backgroundColor = 'gray';
    trig_button.style.width = '48px';
    trig_button.style.aspectRatio = '1';
    trig_button.addEventListener('click', async () => {
      trigs[i] = !trigs[i];
      kick_synth.SetTrig(trigs[i], i);
      if (trigs[i])
        trig_button.style.backgroundColor = 'red';
      else
        trig_button.style.backgroundColor = 'gray';
    }, false);

    // Velocity Sliders
    const vel_slider = document.createElement('input');
    vel_slider.style.writingMode = 'vertical-lr';
    vel_slider.style.direction = 'rtl';
    vel_slider.style.height = '96px';
    vel_slider.type = 'range';
    vel_slider.min = '0';
    vel_slider.max = '1';
    vel_slider.value = '0.5';
    vel_slider.step = '0.1';
    vel_slider.oninput = () => {
      kick_synth.SetVelocity(vel_slider.value, i);
    };

    // Duration Sliders
    const dur_slider = document.createElement('input');
    dur_slider.style.writingMode = 'vertical-lr';
    dur_slider.style.direction = 'rtl';
    dur_slider.style.height = '96px';
    dur_slider.type = 'range';
    dur_slider.min = '0';
    dur_slider.max = '4';
    dur_slider.value = '0.5';
    dur_slider.step = '0.1';
    dur_slider.oninput = () => {
      kick_synth.SetDuration(dur_slider.value, i);
    };

    // Frequency Sliders
    const freq_slider = document.createElement('input');
    freq_slider.style.writingMode = 'vertical-lr';
    freq_slider.style.direction = 'rtl';
    freq_slider.style.height = '96px';
    freq_slider.type = 'range';
    freq_slider.min = '40';
    freq_slider.max = '160';
    freq_slider.value = '40';
    freq_slider.step = '1';
    freq_slider.oninput = () => {
      kick_synth.SetFrequency(freq_slider.value, i);
    };

    // Bend Sliders
    const bend_slider = document.createElement('input');
    bend_slider.style.writingMode = 'vertical-lr';
    bend_slider.style.direction = 'rtl';
    bend_slider.style.height = '96px';
    bend_slider.type = 'range';
    bend_slider.min = '0';
    bend_slider.max = '1';
    bend_slider.value = '0.5';
    bend_slider.step = '0.1';
    bend_slider.oninput = () => {
      kick_synth.SetBend(bend_slider.value, i);
    };

    // Duration Sliders
    const tone_slider = document.createElement('input');
    tone_slider.style.writingMode = 'vertical-lr';
    tone_slider.style.direction = 'rtl';
    tone_slider.style.height = '96px';
    tone_slider.type = 'range';
    tone_slider.min = '0';
    tone_slider.max = '1';
    tone_slider.value = '0.5';
    tone_slider.step = '0.1';
    tone_slider.oninput = () => {
      kick_synth.SetTone(tone_slider.value, i);
    };


    settings_div.append(trig_button);
    settings_div.append('V');
    settings_div.append(vel_slider);
    settings_div.append('D');
    settings_div.append(dur_slider);
    settings_div.append('F');
    settings_div.append(freq_slider);
    settings_div.append('B');
    settings_div.append(bend_slider);
    settings_div.append('T');
    settings_div.append(tone_slider);
    trig_div.append(settings_div);
  }
});
