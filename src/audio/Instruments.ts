
import { createBiquadFilter, createGain, createOscillator, db2mag, CreateNoiseOscillator } from "./Utilities.ts";

// Canonical instrument function
// instrument(audio_ctx, frequency, attack_time, decay_time, gain_db, at_time, output_node, params)

// add to this type if you create new instruments
export type InstrumentParam = KickBassParam | HiHatParam | ChordParam | FMParam;

function SetupOscillator(ctx: AudioContext, frequency: number, detune: number, type: OscillatorType | undefined, waveform: PeriodicWave | undefined): OscillatorNode {
    const osc = createOscillator(ctx, <OscillatorType>"sine", frequency, detune);
    if (type != undefined) {
        if (type == "custom") {
            const wave = waveform == undefined ? ctx.createPeriodicWave([1], [0]) : waveform;
            osc.setPeriodicWave(wave);
        } else {
            osc.type = type;
        }
    }
    return osc;
}

export type KickBassParam = {
    type?: OscillatorType; // oscillator type
    p_env_amt_hz?: number; // pitch envelop size in hertz, peak = frequency + p_env_amt_hz
    p_env_time?: number; // pitch envelop decay time
    waveform?: PeriodicWave; // custom waveform if using "custom" oscillator type
    fc?: number; // frequency cut off for low pass filter
}

export function KickBass(audio_ctx: AudioContext, frequency: number, attack_time: number, decay_time: number, gain_db: number, at_time: number, output_node: AudioNode, params: KickBassParam): void {
    const osc = SetupOscillator(audio_ctx, frequency, 0, params.type, params.waveform);
    const gain = createGain(audio_ctx, 0.0);
    if (params.fc != undefined) {
        const filter = createBiquadFilter(audio_ctx, "lowpass", params.fc, 1.0, 0);
        osc.connect(filter).connect(gain).connect(output_node);
    } else {
        osc.connect(gain).connect(output_node);
    }
    osc.start();
    // schedule envelops
    if (params != undefined) {
        if (params.p_env_amt_hz != undefined && params.p_env_time != undefined) {
            osc.frequency.setTargetAtTime(frequency + params.p_env_amt_hz, at_time, attack_time);
            osc.frequency.setTargetAtTime(frequency, at_time + attack_time, params.p_env_time / 3.5);
        }
    }

    gain.gain.setTargetAtTime(db2mag(gain_db), at_time, attack_time);
    gain.gain.setTargetAtTime(0, at_time + attack_time, decay_time / 2.5);

    const ct = audio_ctx.currentTime;
    setTimeout(() => {
        osc.stop();
        osc.disconnect();
        gain.disconnect();
    }, ((at_time - ct) + (attack_time + decay_time) * 5) * 1000);
}

export type HiHatParam = {
    Q?: number; // Sharpness of high pass fitler
    tone_gain?: number; // gain of oscillator component
    noise_gain?: number; // gain of noise component
    bend?: number; // pitch bend of oscillator, e.g. peak_hz = bend * frequency
}
export function HiHat(audio_ctx: AudioContext, frequency: number, attack_time: number, decay_time: number, gain_db: number, at_time: number, output_node: AudioNode, params: HiHatParam): void {
    const noise = CreateNoiseOscillator(audio_ctx);
    const osc = createOscillator(audio_ctx, "sine", frequency, 0);
    const q = params.Q == undefined ? 2.0 : params.Q;
    const filter = createBiquadFilter(audio_ctx, "highpass", frequency, q, 0.0);
    const env_gain = createGain(audio_ctx, 0.0);
    let tone_gain = -12;
    let bend = 2;
    let noise_gain_dB = 0;
    if (params != undefined) {
        if (params.tone_gain != undefined)
            tone_gain = params.tone_gain;
        if (params.bend != undefined)
            bend = params.bend;
        if (params.noise_gain != undefined)
            noise_gain_dB = params.noise_gain;
    }

    const osc_gain = createGain(audio_ctx, db2mag(tone_gain));
    const noise_gain = createGain(audio_ctx, db2mag(noise_gain_dB))
    noise.connect(noise_gain).connect(filter).connect(env_gain).connect(output_node);
    osc.connect(osc_gain).connect(env_gain);
    noise.start();
    osc.start();
    // envelop
    env_gain.gain.setTargetAtTime(db2mag(gain_db), at_time, attack_time);
    env_gain.gain.setTargetAtTime(0, at_time + attack_time, decay_time / 2.5);
    // pitch bend on osc
    osc.frequency.setTargetAtTime(bend * frequency, at_time, attack_time);
    osc.frequency.setTargetAtTime(frequency, at_time + attack_time, decay_time / 2.5);
    const ct = audio_ctx.currentTime;
    setTimeout(() => {
        noise.stop();
        osc.stop();
        osc.disconnect();
        noise.disconnect();
        filter.disconnect();
        osc_gain.disconnect();
        noise_gain.disconnect();
        env_gain.disconnect();
    }, ((at_time - ct) + (attack_time + decay_time) * 5) * 1000);
}

export type ChordParam = {
    n_voices: number; // number of voices in the chord
    intervals: number[]; // intervals of chord as float multiples of frequency. e.g [1, 1.5, 2] (root, fifth, octave)
    fc?: number; // filter cutoff frequency
    f_type?: BiquadFilterType; // filter type
    Q?: number; // Q of filter
    type?: OscillatorType; // oscillator type
    waveform?: PeriodicWave; // waveform if using custom type
}

export function Chord(audio_ctx: AudioContext, frequency: number, attack_time: number, decay_time: number, gain_db: number, at_time: number, output_node: AudioNode, params: ChordParam): void {
    const gain = createGain(audio_ctx, 0.0);
    if (params.fc != undefined) {
        const Q = params.Q == undefined ? 1.0 : params.Q;
        const f_type = params.f_type == undefined ? "lowpass" : params.f_type;
        // 2 filters for 24db
        const filter = createBiquadFilter(audio_ctx, f_type, params.fc, Q, 0);
        const filter_2 = createBiquadFilter(audio_ctx, f_type, params.fc, Q, 0);
        gain.connect(filter).connect(filter_2).connect(output_node);
    } else {
        gain.connect(output_node);
    }

    let oscs = new Array<OscillatorNode>;
    for (let i = 0; i < params.n_voices; ++i) {
        oscs.push(SetupOscillator(audio_ctx, frequency * params.intervals[i], 10 * Math.random(), params.type, params.waveform));
        oscs[i].connect(gain);
        oscs[i].start();
    }

    gain.gain.setTargetAtTime(db2mag(gain_db), at_time, attack_time);
    gain.gain.setTargetAtTime(0, at_time + attack_time, decay_time / 2.5);

    const ct = audio_ctx.currentTime;
    setTimeout(() => {
        oscs.forEach((o) => { o.stop(); o.disconnect(); });
        gain.disconnect();
    }, ((at_time - ct) + (attack_time + decay_time) * 5) * 1000);
}

export type FMParam = {
    type?: OscillatorType; // main osc type : "sine", "triangle", "sawtooth", "square", "custom"
    waveform?: PeriodicWave; // the custom waveform to use
    mod_type?: OscillatorType; //oscillator type of modifier: "sine", "triangle", "sawtooth", "square", "custom"
    mod_waveform?: PeriodicWave; // custom waveform for modulation oscillator
    mod_f_mult?: number; // modulator frequency = mod_f_mult * frequency
    mod_depth_hz?: number; //  intensity of modulator in hz
    fc?: number; // cut off of low pass filter
}
export function FM(audio_ctx: AudioContext, frequency: number, attack_time: number, decay_time: number, gain_db: number, at_time: number, output_node: AudioNode, params: FMParam): void {
    const osc = SetupOscillator(audio_ctx, frequency, 0, params.type, params.waveform);
    const mod_f = params.mod_f_mult == undefined ? 1 : frequency * params.mod_f_mult;
    const mod_osc = SetupOscillator(audio_ctx, mod_f, 0, params.mod_type, params.mod_waveform);
    const mod_depth_hz = params.mod_depth_hz == undefined ? 0 : params.mod_depth_hz;
    const mod_gain = createGain(audio_ctx, mod_depth_hz);
    const gain = createGain(audio_ctx, 0.0);

    // connect
    if (params.fc != undefined) {
        const filter = createBiquadFilter(audio_ctx, "lowpass", params.fc, 1.0, 0);
        osc.connect(filter).connect(gain).connect(output_node);
    } else {
        osc.connect(gain).connect(output_node);
    }
    mod_osc.connect(mod_gain).connect(osc.frequency);
    // start oscs
    osc.start();
    mod_osc.start();
    // schedule envelops
    gain.gain.setTargetAtTime(db2mag(gain_db), at_time, attack_time);
    gain.gain.setTargetAtTime(0, at_time + attack_time, decay_time / 2.5);

    const ct = audio_ctx.currentTime;
    setTimeout(() => {
        osc.stop();
        osc.disconnect();
        mod_osc.stop();
        mod_osc.disconnect();
        mod_gain.disconnect();
        gain.disconnect();
    }, ((at_time - ct) + (attack_time + decay_time) * 5) * 1000);
}

