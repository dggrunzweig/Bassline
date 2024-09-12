import ToggleSlider from "./ToggleSlider";
import { ColorPalette } from "./Colors";
import { AudioMain } from "../audio/AudioMain";
import { SynthPreset } from "../Presets";
import InlineComboBox from "./InlineComboBox";
import { useState } from "react";
interface props {
  synth_settings: SynthPreset;
  setSynthSettings: (settings: SynthPreset) => void;
  audio_main: AudioMain;
  palette_index: number;
  setPalette: (index: number) => void;
  presets: string[];
  preset_index: number;
  setPreset: (index: number) => void;
}
const LowerSettingsPane = ({
  synth_settings,
  setSynthSettings,
  audio_main,
  palette_index,
  setPalette,
  presets,
  preset_index,
  setPreset,
}: props) => {
  // per step parameters
  audio_main.setOctave(synth_settings.octave ? 2 : 1);
  audio_main.setRootNote(synth_settings.root_note);
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
  const init_index = root_notes.indexOf(synth_settings.root_note);
  const root_note_index = init_index == -1 ? 3 : init_index;

  return (
    <div className="grid grid-row-2 w-full h-full pb-10">
      <div className="flex flex-row w-full h-full justify-start gap-9">
        <div className="flex flex-col gap-y-3">
          <ToggleSlider
            title="Octave"
            on_init={synth_settings.octave}
            text_color={ColorPalette(palette_index).text_1}
            border_color={ColorPalette(palette_index).knob_border}
            knob_color={" bg-slate-50 "}
            knob_active_color={" bg-slate-50 "}
            text_off="Low"
            text_on="High"
            onToggle={(on: boolean) => {
              setSynthSettings({ ...synth_settings, octave: on });
              audio_main.setOctave(on ? 2 : 1);
            }}
          />
          <ToggleSlider
            title="Colors"
            on_init={palette_index == 1}
            text_color={ColorPalette(palette_index).text_1}
            border_color={ColorPalette(palette_index).knob_border}
            knob_color={" bg-slate-50 "}
            knob_active_color={ColorPalette(1).knob_dot}
            text_off="Open Sky"
            text_on="Till Dawn"
            onToggle={(on: boolean) => {
              setPalette(on ? 1 : 0);
            }}
          />
        </div>
        <div className="flex flex-row gap-x-3 h-max w-full justify-end items-end">
          <InlineComboBox
            title="Note"
            items={root_notes}
            item_index={root_note_index}
            onSelectItem={(new_index: number) => {
              audio_main.setRootNote(root_notes[new_index]);
              setSynthSettings({
                ...synth_settings,
                root_note: root_notes[new_index],
              });
            }}
            text_color={ColorPalette(palette_index).text_1}
            bg_color=" bg-transparent "
            border_color={ColorPalette(palette_index).knob_border}
          />
          <InlineComboBox
            title="Preset"
            items={presets}
            item_index={preset_index}
            onSelectItem={(new_index: number) => {
              setPreset(new_index);
            }}
            text_color={ColorPalette(palette_index).text_1}
            bg_color=" bg-transparent "
            border_color={ColorPalette(palette_index).knob_border}
          />
          <button
            className={
              "rounded-xl text-sm border font-mono py-2 mb-2 h-min w-20 text-center " +
              ColorPalette(palette_index).text_1 +
              ColorPalette(palette_index).knob_border
            }
          >
            Save
          </button>
          <button
            className={
              "rounded-xl text-sm border font-mono py-2 mb-2 h-min w-20 text-center" +
              ColorPalette(palette_index).text_1 +
              ColorPalette(palette_index).knob_border
            }
          >
            Erase
          </button>
        </div>
      </div>

      <div className="flex h-full justify-end items-end">
        <div>
          <h1
            className={
              "text-xl font-mono text-right" +
              ColorPalette(palette_index).text_2
            }
          >
            Designed with love by David Grunzweig
          </h1>
          <p
            className={
              "text-md font-mono text-right mt-2" +
              ColorPalette(palette_index).text_2
            }
          >
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="https://greentwig.xyz"
              className={"underline italic" + ColorPalette(palette_index).link}
            >
              Green Twig Studios
            </a>
            , 2024
          </p>
        </div>
      </div>
    </div>
  );
};

export default LowerSettingsPane;
