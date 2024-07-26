interface props {
  palette: number;
  onClose: Function;
  open: boolean;
}

const InstructionOverlay = ({ palette, open, onClose }: props) => {
  return (
    open && (
      <div
        className="absolute z-50 flex justify-center items-center w-full h-full overflow-hidden bg-slate-400/90"
        onClick={() => {
          onClose(false);
        }}
      >
        <p
          className={
            "w-3/4 text-md font-mono text-slate-100 p-10 rounded-lg" +
            (palette == 0 ? "  bg-slate-900/90 " : "  bg-stone-950/90 ")
          }
        >
          <span className="text-4xl">Welcome to Substrata</span> <br />
          <br />
          A percussion synthesizer built for hypnotic bassline sequences.
          <br />
          Click anywhere to close these instructions.
          <br />
          <br />
          <span className="text-2xl">Sequencer</span> <br />
          <br />
          Click on a square to add a drum to the sequence. <br />
          Drag on the square to set primary settings. <br />
          <span className="pl-10">x = decay time, y = volume</span> <br />
          Hold the "shift" key and drag on the square to set secondary settings.{" "}
          <br />
          <span className="pl-10">x = tone, y = pitch bend</span> <br /> <br />
          <span className="text-2xl">Control Panel</span> <br />
          <br />
          Press "Run" to start the sequencer. <br />
          Press "Record" to record 4 loops of the audio (sequencer must be
          running) <br />
          "Tempo" adjusts the speed of the sequence. <br />
          "Ring Freq" and "Ring Lvl" control the frequency and intensity of a
          ring modulation effect. <br />
          "Echo Lvl" and "Echo FB" control the level and feedback strength of an
          echo. <br />
          "HPF" controls the frequency of a high pass filter on the output.
          <br />
          Holding "shift" while turning knobs immediately sets to minimum or
          maximum value. <br />
          "Octave" switch will shift the frequency of the drum up or down an
          octave. <br />
          "Colors" switch will change the color scheme of the instrument.
        </p>
      </div>
    )
  );
};

export default InstructionOverlay;
