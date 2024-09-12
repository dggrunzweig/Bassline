import { useEffect, useRef, useState } from "react";
import BackgroundDiv from "./components/BackgroundDiv";
import { isMobileOnly } from "react-device-detect";
import { ColorPalette } from "./components/Colors";

import { AudioMain } from "./audio/AudioMain";
import { kDefaultPreset, SynthPreset } from "./Presets";
import InstructionOverlay from "./components/InstructionOverlay";
import SettingsMenu from "./components/SettingsMenu";
import LowerSettingsPane from "./components/LowerSettingsPane";
import UpperSettingsPane from "./components/UpperSettingsPane";
import Sequencer from "./components/Sequencer";

import { useCookies } from "react-cookie";
interface props {
  num_steps: number;
  audio_main: AudioMain;
}

const App = ({ num_steps, audio_main }: props) => {
  // color palette
  const [palette, setPalette] = useState(0);

  // presets
  let settings = kDefaultPreset;
  const [synth_settings, setSynthSettings] = useState(settings);
  const preset_list = useRef(["Default"]);
  const preset_settings = useRef([kDefaultPreset]);
  const preset_index = useRef(0);

  // preset cookies
  const loaded_cookies = useRef(false);
  const [preset_cookie, setPresetCookie] = useCookies([
    "substrata-synth-current-settings",
  ]);

  if (
    preset_cookie["substrata-synth-current-settings"] &&
    !loaded_cookies.current
  ) {
    settings = preset_cookie["substrata-synth-current-settings"];
    preset_settings.current.push(settings);
    preset_list.current.push("Last Session");
    preset_index.current = 1;
    setSynthSettings(settings);
    loaded_cookies.current = true;
  }

  const updateSynthAndCookies = (settings: SynthPreset) => {
    preset_settings.current[1] = settings;
    setPresetCookie("substrata-synth-current-settings", settings);
    setSynthSettings(settings);
  };

  const setPreset = (new_preset_index: number) => {
    const settings = preset_settings.current[new_preset_index];
    if (settings) {
      preset_index.current = new_preset_index;
      // don't overwrite cookies if switching to default preset
      if (new_preset_index > 0) updateSynthAndCookies(settings);
      else setSynthSettings(settings);
    } else console.log("Not A Valid Preset Index");
  };

  // prevent use on mobile platforms
  if (isMobileOnly) {
    return (
      <div>
        <BackgroundDiv palette={palette}>
          <p
            className={
              "flex flex-col justify-center items-center h-full text-center font-mono text-xl text-wrap" +
              ColorPalette(palette).text_1
            }
          >
            This App is Only Available on Desktop 😭
          </p>
        </BackgroundDiv>
      </div>
    );
  }

  // track window width to prevent window from becoming too small
  const [validDimensions, setValidDimensions] = useState(true);
  useEffect(() => {
    const window_resize = () => {
      if (window.innerWidth < 1024) {
        setValidDimensions(false);
      } else {
        setValidDimensions(true);
      }
    };
    window.addEventListener("resize", window_resize);
    return () => {
      window.removeEventListener("resize", window_resize);
    };
  });

  // states
  const [view_instructions, setViewInstructions] = useState(true);
  const [view_settings_menu, setViewSettingsMenu] = useState(false);

  // Prevent display is the window is too narrow
  if (!validDimensions) {
    return (
      <div>
        <BackgroundDiv palette={palette}>
          <p
            className={
              "flex flex-col w-full items-center justify-center h-full text-center font-mono text-xl  text-wrap" +
              ColorPalette(palette).text_1
            }
          >
            Window is too narrow!!!
          </p>
        </BackgroundDiv>
      </div>
    );
  }

  // Full App
  return (
    <>
      <BackgroundDiv palette={palette}>
        <div className="flex flex-col w-full h-full items-center overflow-hidden select-none">
          <InstructionOverlay
            open={view_instructions}
            onClose={setViewInstructions}
            palette={palette}
          />
          <SettingsMenu
            isOpen={view_settings_menu}
            onClose={setViewSettingsMenu}
            palette={palette}
            audio_main={audio_main}
          />
          <div className="flex flex-col w-full h-full px-20 pt-10 gap-10 max-w-screen-2xl overflow-hidden">
            <div className="flex flex-row justify-between items-end">
              <h1
                className={
                  "text-8xl font-mono -ml-2" + ColorPalette(palette).text_header
                }
              >
                SUBSTRATA
              </h1>
              <div className="flex flex-row gap-4">
                <button
                  className={
                    "text-md h-max w-max rounded-xl border font-mono p-3" +
                    ColorPalette(palette).text_1 +
                    ColorPalette(palette).knob_border
                  }
                  onClick={() => {
                    setViewInstructions(true);
                  }}
                >
                  Instructions
                </button>
                <button
                  className={
                    "text-md h-max w-max rounded-xl border font-mono p-3" +
                    ColorPalette(palette).text_1 +
                    ColorPalette(palette).knob_border
                  }
                  onClick={() => {
                    setViewSettingsMenu(true);
                  }}
                >
                  Settings
                </button>
              </div>
            </div>
            <UpperSettingsPane
              synth_settings={synth_settings}
              setSynthSettings={updateSynthAndCookies}
              audio_main={audio_main}
              palette={palette}
            />
            <Sequencer
              synth_settings={synth_settings}
              setSynthSettings={updateSynthAndCookies}
              audio_main={audio_main}
              num_steps={num_steps}
              palette={palette}
            />
            <LowerSettingsPane
              synth_settings={synth_settings}
              setSynthSettings={updateSynthAndCookies}
              palette_index={palette}
              setPalette={setPalette}
              audio_main={audio_main}
              presets={preset_list.current}
              preset_index={preset_index.current}
              setPreset={setPreset}
            />
          </div>
        </div>
      </BackgroundDiv>
    </>
  );
};

export default App;
