import { useState, useRef, useEffect } from "react";

interface props {
  Toggle: (on: boolean, step_index: number) => void;
  XDragPrimary: (x: number, step_index: number) => void;
  YDragPrimary: (y: number, step_index: number) => void;
  XDragSecondary: (x: number, step_index: number) => void;
  YDragSecondary: (y: number, step_index: number) => void;
  step_index: number;
  selected_index: number;
  x_p_init: number;
  y_p_init: number;
  x_s_init: number;
  y_s_init: number;
}

const clamp = (x: number, min_x: number, max_x: number) => {
  return Math.max(min_x, Math.min(x, max_x));
};

const TwoDButton = (props: props) => {
  const element_ref = useRef(null);

  const [x, setXP] = useState(0);
  const [y, setYP] = useState(0);
  const [x_s, setXS] = useState(0);
  const [y_s, setYS] = useState(0);

  const [toggled, setToggle] = useState(false);
  const is_dragging = useRef(false);
  const [click_started, setClickStarted] = useState(false);

  useEffect(() => {
    if (element_ref.current) {
      // @ts-ignore
      const bounds = element_ref.current.getBoundingClientRect();
      setXP(props.x_p_init * bounds.width);
      setYP((1 - props.y_p_init) * bounds.height);
      setXS(props.x_s_init * bounds.width);
      setYS((1 - props.y_s_init) * bounds.height);
    }
  }, []);

  let button_bg = " bg-transparent";
  let button_outline =
    props.step_index % 4 == 0 ? "border-slate-100/80" : "border-slate-400/80";

  if (toggled) {
    button_bg = " bg-slate-50/30";
    button_outline = "bg-slate-50/60";
  }

  if (props.step_index == props.selected_index)
    button_outline =
      "border-orange-500 shadow-orange-300 shadow-[0_0_30px_0px_rgba(0,0,0,0.3)]";

  let secondary_color = "bg-orange-400/70";
  let primary_color = "bg-indigo-400/50";

  const toggle_button = (
    <>
      <div
        ref={element_ref}
        className={
          "flex flex-row h-full max-h-48 w-auto relative border-2 aspect-square rounded-lg " +
          button_outline +
          button_bg
        }
        onMouseDown={() => {
          setClickStarted(true);
        }}
        onMouseUp={() => {
          if (!is_dragging.current) {
            setToggle(!toggled);
            props.Toggle(!toggled, props.step_index);
          }
          is_dragging.current = false;
          setClickStarted(false);
        }}
        onMouseLeave={() => {
          is_dragging.current = false;
          setClickStarted(false);
        }}
        onMouseMove={(e) => {
          if (click_started) {
            is_dragging.current = true;
            const bounds = e.currentTarget.getBoundingClientRect();
            const x = clamp(e.clientX - bounds.x, 0, bounds.width);
            const y = clamp(e.clientY - bounds.y, 0, bounds.height);
            const primary = !e.shiftKey;
            if (primary) {
              props.XDragPrimary(x / bounds.width, props.step_index);
              props.YDragPrimary(1 - y / bounds.height, props.step_index);
              setXP(clamp(x, 10, bounds.width - 10));
              setYP(clamp(y, 10, bounds.height - 10));
            } else {
              props.XDragSecondary(x / bounds.width, props.step_index);
              props.YDragSecondary(1 - y / bounds.height, props.step_index);
              setXS(clamp(x, 10, bounds.width - 10));
              setYS(clamp(y, 10, bounds.height - 10));
            }
          }
        }}
      >
        {toggled && (
          <img
            src="./src/assets/button_grid.svg"
            className="object-fill w-full h-full select-none"
          />
        )}
        {toggled && (
          <div
            style={{
              transform: `translate(${x}px, ${y}px)`,
            }}
            className={
              "absolute -m-3 w-4 h-auto aspect-square rounded-full border border-slate-50 " +
              primary_color
            }
          ></div>
        )}
        {toggled && (
          <div
            style={{
              transform: `translate(${x_s}px, ${y_s}px)`,
            }}
            className={
              "absolute -m-2 w-4 h-auto aspect-square rounded-full border border-slate-50 " +
              secondary_color
            }
          ></div>
        )}
      </div>
    </>
  );
  return <div>{toggle_button}</div>;
};

export default TwoDButton;
