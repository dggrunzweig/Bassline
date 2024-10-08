import { useState } from "react";
import { ColorPalette } from "./Colors";
import { clamp } from "../audio/Utilities";
interface props {
  name: string;
  units: string;
  onChange: (x: number) => void;
  init_value: number;
  min_value: number;
  max_value: number;
  palette: number;
  enabled: boolean;
  use_float: boolean;
}

const Knob = ({
  name,
  units,
  init_value,
  min_value,
  max_value,
  onChange,
  palette,
  enabled = true,
  use_float = false,
}: props) => {
  const rotation = Math.round(
    ((init_value - min_value) / (max_value - min_value)) * 270 - 135
  );

  const r_tag = "rotate(" + rotation + "deg)";
  const [mouse_clicked, setMouseClicked] = useState(false);
  return (
    <div
      className="flex flex-col max-h-48 justify-between items-center aspect-square bg-transparent "
      onMouseDown={() => {
        setMouseClicked(true);
      }}
      onMouseUp={() => {
        setMouseClicked(false);
      }}
      onMouseLeave={() => {
        setMouseClicked(false);
      }}
      onMouseMove={(e) => {
        if (mouse_clicked) {
          const bounds = e.currentTarget.getBoundingClientRect();
          const x = (e.clientX - bounds.left) / bounds.width;
          const y = 1 - (e.clientY - bounds.top) / bounds.height;
          let angle = (Math.atan2(x - 0.5, y - 0.5) * 180) / Math.PI + 180;
          angle = clamp(angle, 45, 315) - 45;
          let new_val = (angle / 270) * (max_value - min_value) + min_value;
          // 2 points of precision
          new_val = Math.floor(new_val * 100) / 100;
          if (!use_float) {
            new_val = Math.floor(new_val);
          }
          if (e.shiftKey) {
            if (angle < 180) new_val = min_value;
            else new_val = max_value;
          }
          if (enabled) {
            onChange(new_val);
          }
        }
      }}
    >
      <div
        className={
          "w-auto h-auto bg-transparent font-mono text-xl select-none py-1 text-nowrap" +
          ColorPalette(palette).text_1
        }
      >
        {name}
      </div>
      <div
        className={
          "flex flex-col aspect-square h-1/2 items-center bg-transparent text-xl border rounded-full cursor-grab" +
          ColorPalette(palette).knob_border
        }
        style={{ transform: r_tag }}
      >
        {enabled && (
          <div
            className={
              "aspect-square rounded-full h-1/6 mt-1 " +
              ColorPalette(palette).knob_dot
            }
          ></div>
        )}
      </div>
      <div
        className={
          "w-auto h-auto bg-transparent  font-mono py-1  text-xl select-none" +
          ColorPalette(palette).text_1
        }
      >
        {enabled ? init_value + units : "Disabled"}
      </div>
    </div>
  );
};

export default Knob;
