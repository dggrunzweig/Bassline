import { useState } from "react";

interface props {
  title: string;
  on_init: boolean;
  text_color: string;
  border_color: string;
  knob_color: string;
  knob_active_color: string;
  text_off: string;
  text_on: string;
  onToggle: (on: boolean) => void;
}

const ToggleSlider = ({
  title,
  on_init,
  text_color,
  border_color,
  knob_color,
  knob_active_color,
  text_off,
  text_on,
  onToggle,
}: props) => {
  const on = on_init;
  const [is_dragging, setDrag] = useState(false);
  const setState = (enabled: boolean) => {
    onToggle(enabled);
  };
  return (
    <div className="flex flex-row gap-3 w-max">
      <h1 className={"text-md font-mono w-18" + text_color}>{title}</h1>
      <div
        className={"w-12 h-6 rounded-3xl border" + border_color}
        onMouseDown={() => {
          setDrag(true);
        }}
        onMouseUp={(e) => {
          const bounds = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - bounds.left;
          if (x < bounds.width / 2) setState(false);
          else setState(true);
          setDrag(false);
        }}
        onMouseLeave={() => {
          setDrag(false);
        }}
        onMouseMove={(e) => {
          if (is_dragging) {
            const bounds = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - bounds.left;
            if (x < bounds.width / 2) setState(false);
            else setState(true);
          }
        }}
      >
        <div
          className={
            "h-full aspect-square rounded-full " +
            (on ? knob_active_color : knob_color) +
            (on ? " translate-x-6 " : "")
          }
        ></div>
      </div>
      <h1 className={"text-md font-mono w-18" + text_color}>
        {on ? text_on : text_off}
      </h1>
    </div>
  );
};

export default ToggleSlider;
