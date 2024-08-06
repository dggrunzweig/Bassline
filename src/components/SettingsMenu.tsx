import { useState } from "react";
import { ListMidiInputs } from "../audio/midi_utility";
import InlineComboBox from "./InlineComboBox";
import { AudioMain } from "../audio/AudioMain";

interface props {
  palette: number;
  onClose: Function;
  isOpen: boolean;
  audio_main: AudioMain;
}

const SettingsMenu = ({ palette, isOpen, onClose, audio_main }: props) => {
  let midi_inputs = new Array<string>();
  let midi_access = audio_main.getMidiAccess();
  if (midi_access) midi_inputs = ListMidiInputs(midi_access);
  midi_inputs.unshift("None");
  const [input_index, setInputIndex] = useState(0);
  const root_notes = [
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B",
    "C",
    "C#",
    "D",
    "D#",
  ];
  const [root_note_index, setRootNodeIndex] = useState(3);
  const durations = [4, 8, 12, 16, 24, 32].map((val) => {
    return val.toString();
  });
  const [duration, setDuration] = useState(0);
  return (
    isOpen && (
      <div className="absolute z-50 flex justify-center items-center w-full h-full overflow-hidden bg-slate-400/90 select-none">
        <div
          className={
            "flex flex-col gap-8 w-3/4 text-md font-mono text-slate-100 p-10 rounded-lg" +
            (palette == 0 ? "  bg-slate-900/90 " : "  bg-stone-950/90 ")
          }
        >
          <div className="flex flex-row items-center justify-between w-full h-12">
            <h1 className="text-4xl">Settings</h1>
            <button
              className={
                "flex flex-col px-3 py-1 items-center justify-center bg-transparent border border-slate-50"
              }
              onClick={() => {
                onClose(false);
              }}
            >
              Close
            </button>
          </div>
          <h1 className="text-2xl">Midi Setup</h1>
          <div>
            {midi_access && (
              <InlineComboBox
                title="MIDI Clock Input"
                items={midi_inputs}
                item_index={input_index}
                onSelectItem={(new_index: number) => {
                  setInputIndex(new_index);
                  audio_main.setMidiDevice(midi_inputs[new_index]);
                }}
                text_color=" text-slate-50 "
                bg_color=" bg-slate-900 "
                border_color=" border-slate-50 "
              />
            )}
            {!midi_access && (
              <span className="">
                MIDI Not Available
                <br />
                Cannot use Safari or permission to use MIDI denied.
              </span>
            )}
          </div>
          <h1 className="text-2xl">Synth Settings</h1>
          <div className="grid grid-flow-col grid-rows-2">
            <InlineComboBox
              title="Note"
              items={root_notes}
              item_index={root_note_index}
              onSelectItem={(new_index: number) => {
                setRootNodeIndex(new_index);
                audio_main.setRootNote(root_notes[new_index]);
              }}
              text_color=" text-slate-50 "
              bg_color=" bg-slate-900 "
              border_color=" border-slate-50 "
            />
            <InlineComboBox
              title="Record Duration"
              items={durations}
              item_index={duration}
              onSelectItem={(new_index: number) => {
                setDuration(new_index);
                audio_main.SetRecordDuration(parseInt(durations[new_index]));
              }}
              text_color=" text-slate-50 "
              bg_color=" bg-slate-900 "
              border_color=" border-slate-50 "
            />
          </div>
        </div>
      </div>
    )
  );
};

export default SettingsMenu;
