import { BPMToTime, lcm, clamp } from "./Utilities.ts";
import { InstrumentParam } from "./Instruments.ts";

interface SequenceMetadata {
    trigs: number[];
    frequencies: number[];
    attack_times: number[];
    release_times: number[];
    gains: number[];
    probability: number[];
    params: InstrumentParam[];
    length: number;
}

interface InstrumentTrack {
    inst_function: Function;
    sequence: SequenceMetadata,
}

interface ParamTrack {
    p: AudioParam;
    v: number[];
    s: number;
}

interface TrackUpdate {
    track_index: number;
    sequence: SequenceMetadata,
}

class DrumSequencer {
    private c: AudioContext;
    private i_t = new Array<InstrumentTrack>(); // inst tracks 
    private t_o = new Array<AudioNode>(); // track output nodes
    private p_t = new Array<ParamTrack>(); // param tracks
    private u_p = new Array<TrackUpdate>(); // update pool
    private t_l = 16; // max length of sequence
    private tick = new Array<number>(2); // duration of time step, 2 values for swing
    private t = 0; // current time
    private index = 0; // position in the sequence
    private scheduler = 0; // timer
    constructor(audio_ctx: AudioContext, bpm: number, step_size = 16, swing = 0.5) {
        // step_size = 16 means 16th step
        this.c = audio_ctx;

        // time step size
        this.tick = new Array(2).fill(BPMToTime(bpm, 1 / step_size));
        this.tick[0] *= swing / 0.5;
        this.tick[1] *= (1 - swing) / 0.5;
    }

    public start() {
        this.t = this.c.currentTime + 1;
        this.index = 0;
        this.schedule(2);
        this.scheduler = setInterval(() => { this.schedule(2) }, 500);
    }

    public stop() {
        clearTimeout(this.scheduler);
    }

    public getStep(): number {
        return this.index;
    }

    public addParamTrack(param: AudioParam, values: number[], smooth_time = 1.0) {
        smooth_time = clamp(smooth_time, 0.001, 1.0);
        this.p_t.push({ p: param, v: values, s: smooth_time });
    }

    public createSequenceMetadata(trigs: number[], frequency: number, attack_time: number, release_time: number, gain_dB: number, probability: number, param: InstrumentParam, accents?: number[], gain_accent_dB?: number): SequenceMetadata {
        const len = trigs.length;
        const metadata = {
            trigs: trigs,
            frequencies: new Array<number>(len).fill(frequency),
            attack_times: new Array<number>(len).fill(attack_time),
            release_times: new Array<number>(len).fill(release_time),
            gains: new Array<number>(len).fill(gain_dB),
            probability: new Array<number>(len).fill(probability),
            params: new Array<InstrumentParam>(len).fill(param),
            length: len
        }
        if (accents != undefined && gain_accent_dB != undefined) {
            if (accents.length == trigs.length) {
                accents.forEach((step, i) => {
                    if (step == 1) metadata.gains[i] = gain_accent_dB;
                });
            } else {
                console.log("Accents sequence length not equal to instrument sequence length");
            }
        }
        return metadata;
    }

    public addInstrumentTrack(inst_function: Function, seq_metadata: SequenceMetadata, track_out: AudioNode) {
        // mix params
        // level = mix level in dB
        // send_a = send A level in dB
        // send_b = send A level in dB
        // pan = pan (-1 to 1)
        // make sure they're all the same length
        let equal_lens = this.SequenceValid(seq_metadata);
        if (equal_lens) {
            this.i_t.push({
                inst_function: inst_function,
                sequence: seq_metadata,
            });
            this.t_o.push(track_out);
            // set total pattern length as lowest common denominator of all sequence lengths
            this.t_l = this.i_t.length == 1 ? seq_metadata.length : lcm(this.t_l, seq_metadata.length);
            return this.i_t.length - 1;
        } else {
            console.log("All input arrays must be equal length. If not using Params, set to null");
            return -1;
        }
    }

    public updateInstrumentTrack(track_index: number, track_md: SequenceMetadata) {
        if (track_index < 0 || track_index >= this.i_t.length) {
            console.log("Invalid Track ID");
            return;
        }
        let equal_lens = this.SequenceValid(track_md);

        if (equal_lens) {
            this.u_p.push({
                track_index: track_index,
                sequence: track_md,
            });
            // update total pattern length, possible bug here if constantly 
            // updating tracks and lcm between current t_l and new track 
            // length keeps getting larger
            this.t_l = this.i_t.length == 1 ? track_md.length : lcm(this.t_l, track_md.length);
        } else {
            console.log("All input arrays must be equal length. If not using Params, set to null");
        }
    }

    private schedule(la: number) {
        const ct = this.c.currentTime;
        let updates_available = this.u_p.length > 0;
        while (this.t < ct + la) {
            this.i_t.forEach((inst, track_index) => {
                const l = inst.sequence.length;
                const step = this.index % l;
                // handle track update if needed
                if (step == 0 && updates_available) {
                    this.u_p.forEach((update, i) => {
                        if (update.track_index == track_index) {
                            this.i_t[track_index].sequence = update.sequence;
                            // remove from update pool
                            this.u_p.splice(i, 1);
                            // check if any remaining items exist
                            updates_available = this.u_p.length > 0;
                        }
                    });
                }
                // create trig
                if (inst.sequence.trigs[step] == 1) {
                    // use step probability
                    if (Math.random() <= inst.sequence.probability[step]) {
                        const params = inst.sequence.params == undefined ? null : inst.sequence.params[step];
                        inst.inst_function(this.c, inst.sequence.frequencies[step], inst.sequence.attack_times[step], inst.sequence.release_times[step], inst.sequence.gains[step], this.t, this.t_o[track_index], params);
                    }
                }
            })
            // parameter track
            this.p_t.forEach((pt) => {
                const step = this.index % pt.v.length;
                pt.p.setTargetAtTime(pt.v[step], this.t, pt.s * this.tick[0] / 3.5);
            })
            this.index = (this.index + 1) % this.t_l;
            this.t += this.tick[this.index % 2];
        }
    }

    private SequenceValid(md: SequenceMetadata): boolean {
        const lengths = [md.trigs.length, md.frequencies.length, md.attack_times.length, md.release_times.length, md.gains.length, md.probability.length];
        if (md.params != undefined)
            lengths.push(md.params.length);
        let equal_lens = true;
        const seq_len = md.length;
        lengths.forEach((l) => { if (l != seq_len) equal_lens = false; });
        return equal_lens;
    }
}


export default DrumSequencer;