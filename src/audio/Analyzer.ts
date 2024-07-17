import { createGain, linearRampToValueAtTime, db2mag } from "./Utilities.ts";

class Analyzer {
    private c: AudioContext;
    private i: GainNode;
    private a_l: AnalyserNode;
    private a_r: AnalyserNode;
    constructor(context: AudioContext) {
        this.c = context;
        this.i = createGain(context, 1.0);
        this.a_l = context.createAnalyser();
        this.a_r = context.createAnalyser();
        const splitter = context.createChannelSplitter(2);

        // connect up the graph
        this.i.connect(splitter);
        splitter.connect(this.a_l, 0);
        splitter.connect(this.a_r, 1);
    }
    getInputNode(): GainNode {
        return this.i;
    }
    setInputGain(db_gain: number): void {
        linearRampToValueAtTime(this.c, this.i.gain, db2mag(db_gain), 0.1);
    }
    getBufferData(channel = 0): Float32Array {
        const buffer_length = this.a_l.frequencyBinCount;
        const data_array = new Float32Array(buffer_length);
        if (channel == 0)
            this.a_l.getFloatTimeDomainData(data_array);
        else if (channel == 1)
            this.a_r.getFloatTimeDomainData(data_array);
        return data_array;
    }
    getMagnitudeData(fft_size = 256, min_db = -90, max_db = -20, channel = 0): Float32Array {
        this.a_l.fftSize = fft_size;
        this.a_r.fftSize = fft_size;
        const buffer_length = this.a_l.frequencyBinCount;
        const data_array = new Float32Array(buffer_length);
        if (channel == 0)
            this.a_l.getFloatFrequencyData(data_array);
        else if (channel == 1)
            this.a_r.getFloatFrequencyData(data_array);
        const scaled_data = data_array.map((v) => {
            return Math.min(Math.max(v, min_db), max_db);
        });
        return scaled_data;
    }
    getBarkBandCutoffs(): number[] {
        return new Array<number>(20, 100, 200, 300, 400, 510, 630, 770, 920, 1080, 1270, 1480, 1720, 2000, 2320, 2700, 3150, 4400, 5300, 6400, 7700, 9500, 12000, 15500, this.c.sampleRate);
    }
    getBarkBandData(fft_size = 256, min_db = -90, max_db = -20, channel = 0): number[] {
        // get data
        const fft_data = this.getMagnitudeData(fft_size, min_db, max_db, channel);

        const num_bins = fft_data.length;
        const hz_per_bin = (this.c.sampleRate / 2) / num_bins;

        // bark bands, lower thresholds
        const bb_f_low = this.getBarkBandCutoffs();
        // draw frequency indicator lines and data
        let bb_sum = new Array(bb_f_low.length - 1).fill(0);
        // console.log(fft_data.slice(num_bins - 25, num_bins - 1));

        for (let b = 0; b < bb_f_low.length - 1; ++b) {
            const index_low = Math.floor(bb_f_low[b] / hz_per_bin);
            const index_high = Math.min(Math.floor(bb_f_low[b + 1] / hz_per_bin), num_bins);
            let width = index_high - index_low;
            for (let i = index_low; i < index_high; ++i) {
                const lin = db2mag(fft_data[i]);
                bb_sum[b] += (lin * lin); // power
            }
            bb_sum[b] /= width;
            width = 0;
        }

        for (let i = 0; i < bb_sum.length; ++i) {
            if (bb_sum[i] == 0)
                bb_sum[i] = min_db;
            else
                bb_sum[i] = 10 * Math.log10(bb_sum[i]); // power to dB
        }
        return bb_sum;
    }
}

export default Analyzer;