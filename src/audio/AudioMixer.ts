import { createGain, createStereoPanner, db2mag, GetMaxAbsValue, GetRMS } from "./Utilities.ts"

export enum MixComponent {
    level = 1,
    send_a,
    send_b,
    pan
}
class AudioMixer {
    // input levels
    private i = new Array<GainNode>;
    // send a levels
    private sa_l = new Array<GainNode>
    // send b levels
    private sb_l = new Array<GainNode>
    // panning
    private p = new Array<StereoPannerNode>
    // level analyzers
    private a = new Array<AnalyserNode>
    // output
    private o: AudioNode;
    // send a input node
    private sa: AudioNode;
    // send b input node
    private sb: AudioNode;
    constructor(mixer_out: AudioNode, send_a_out_node: AudioNode, send_b_out_node: AudioNode) {
        this.o = mixer_out;
        this.sa = send_a_out_node;
        this.sb = send_b_out_node;
    }
    public AddTrack(audio_ctx: AudioContext, level_dB: number, send_a_dB: number, send_b_dB: number, panning: number): GainNode {
        const gain_in = createGain(audio_ctx, db2mag(level_dB)); // mixer level
        const pan = createStereoPanner(audio_ctx, panning) // panning
        const send_a = createGain(audio_ctx, db2mag(send_a_dB)); // send A (post mix)
        const send_b = createGain(audio_ctx, db2mag(send_b_dB)); // send B (post mix)
        const analyzer = audio_ctx.createAnalyser();
        gain_in.connect(analyzer);
        gain_in.connect(pan).connect(this.o);
        gain_in.connect(send_a).connect(this.sa);
        gain_in.connect(send_b).connect(this.sb);
        this.i.push(gain_in);
        this.sa_l.push(send_a);
        this.sb_l.push(send_b);
        this.p.push(pan);
        this.a.push(analyzer);
        return gain_in;
    }
    public GetMixerLevels(rms = true): number[] {
        const levels = new Array<number>();
        this.a.forEach((a) => {
            const data_array = new Float32Array(a.fftSize);
            a.getFloatTimeDomainData(data_array);
            const val = rms ? GetRMS(data_array) : GetMaxAbsValue(data_array);
            levels.push(val);
        });
        return levels;
    }
    public UpdateMixerComponent(channel: number, component: MixComponent, value: number, at_time: number, smoothing_time = 0.01) {
        if (channel < this.i.length) {
            switch (component) {
                case MixComponent.level:
                    this.i[channel].gain.setTargetAtTime(db2mag(value), at_time, smoothing_time);
                    break;
                case MixComponent.send_a:
                    this.sa_l[channel].gain.setTargetAtTime(db2mag(value), at_time, smoothing_time);
                    break;
                case MixComponent.send_b:
                    this.sb_l[channel].gain.setTargetAtTime(db2mag(value), at_time, smoothing_time);
                    break;
                case MixComponent.pan:
                    this.p[channel].pan.setTargetAtTime(value, at_time, smoothing_time);
                    break;
                default:
                    break;
            }
        } else {
            console.log("Channel index exceeds number of channels. Number of Channels:", this.i.length);
        }
    }
    public Input(index: number): GainNode | undefined {
        if (this.ValidIndex(index))
            return this.i[index];
        else
            return undefined;
    }
    public SendA(index: number): GainNode | undefined {
        if (this.ValidIndex(index))
            return this.sa_l[index];
        else
            return undefined;
    }
    public SendB(index: number): GainNode | undefined {
        if (this.ValidIndex(index))
            return this.sb_l[index];
        else
            return undefined;
    }
    public Pan(index: number): StereoPannerNode | undefined {
        if (this.ValidIndex(index))
            return this.p[index];
        else
            return undefined;
    }
    public ChannelCount() {
        return this.i.length;
    }
    private ValidIndex(index: number): boolean {
        return index < this.i.length;
    }
}

export default AudioMixer