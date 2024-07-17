import { useState } from "react";

interface props {
  name: string;
  units: string;
  onChange: (x: number) => void;
  init_value: number;
  min_value: number;
  max_value: number;
}

const Knob = ({
  name,
  units,
  init_value,
  min_value,
  max_value,
  onChange,
}: props) => {
  const [current_val, setValue] = useState(init_value);

  const rotation = Math.round(
    ((current_val - min_value) / (max_value - min_value)) * 270 - 135
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
      onMouseMove={(e) => {
        if (mouse_clicked) {
          const bounds = e.currentTarget.getBoundingClientRect();
          const x = (e.clientX - bounds.left) / bounds.width;
          const y = 1 - (e.clientY - bounds.top) / bounds.height;
          const angle = (Math.atan2(x - 0.5, y - 0.5) * 180) / Math.PI + 180;
          let new_val = Math.floor(
            (angle / 360) * (max_value - min_value) + min_value
          );
          if (e.shiftKey) {
            if (angle < 180) new_val = min_value;
            else new_val = max_value;
          }
          onChange(new_val);
          setValue(new_val);
        }
      }}
    >
      <div className="w-auto h-auto bg-transparent font-mono text-slate-50 text-xl select-none py-1 text-nowrap">
        {name}
      </div>
      <div
        className="flex flex-col aspect-square h-1/2 items-center bg-transparent text-slate-50 text-xl border border-slate-50 rounded-full cursor-grab"
        style={{ transform: r_tag }}
      >
        <div className="aspect-square rounded-full h-1/6 bg-slate-50 mt-1 "></div>
      </div>
      <div className="w-auto h-auto bg-transparent  font-mono py-1 text-slate-50 text-xl select-none">
        {current_val + units}
      </div>
    </div>
  );
};

export default Knob;
