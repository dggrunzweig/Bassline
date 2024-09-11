import ToggleSlider from "./ToggleSlider";
import { ColorPalette } from "./Colors";
import { AudioMain } from "../audio/AudioMain";
import { SynthPreset } from "../Presets";
interface props {
  synth_settings: SynthPreset;
  setSynthSettings: (settings: SynthPreset) => void;
  audio_main: AudioMain;
  palette_index: number;
  setPalette: (index: number) => void;
}
const LowerSettingsPane = ({
  synth_settings,
  setSynthSettings,
  audio_main,
  palette_index,
  setPalette,
}: props) => {
  // per step parameters
  audio_main.setOctave(synth_settings.octave ? 2 : 1);

  return (
    <div className="grid grid-row-2 w-full h-full pb-10">
      <div className="flex flex-col gap-y-3 h-full">
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
