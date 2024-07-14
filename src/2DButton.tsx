import { useState } from "react";
import Draggable, { DraggableData, DraggableEvent } from "react-draggable";

interface props {
  Toggle: (on: boolean, step_index: number) => void;
  XDragPrimary: (x: number, step_index: number) => void;
  YDragPrimary: (y: number, step_index: number) => void;
  XDragSecondary: (x: number, step_index: number) => void;
  YDragSecondary: (y: number, step_index: number) => void;
  step_index: number;
}

const clamp = (x: number, min_x: number, max_x: number) => {
  return Math.max(min_x, Math.min(x, max_x));
};

const TwoDButton = (props: props) => {
  const [toggled, setToggle] = useState(false);

  const [is_dragging, setDrag] = useState(false);
  const [click_started, setClickStarted] = useState(false);

  let button_outline = "border-slate-200";
  if (toggled) {
    button_outline =
      "border-red-500 shadow-red-500 shadow-[0_0_15px_0px_rgba(0,0,0,0.3)]";
  }
  const toggle_button = (
    <>
      <div
        className={
          "w-full border-2 bg-transparent h-auto aspect-square rounded-3xl " +
          button_outline
        }
        // onClick={() => {}}
        onMouseDown={() => {
          setClickStarted(true);
        }}
        onMouseUp={() => {
          if (!is_dragging) {
            props.Toggle(!toggled, props.step_index);
            setToggle(!toggled);
          }
          setDrag(false);
          setClickStarted(false);
        }}
        // onMouseMove={(e) => {
        //   if (click_started) {
        //     setDrag(true);
        //     const bounds = e.currentTarget.getBoundingClientRect();
        //     const x =
        //       clamp(e.clientX - bounds.x, 0, bounds.width) / bounds.width;
        //     const y =
        //       clamp(e.clientY - bounds.y, 0, bounds.height) / bounds.height;
        //     const primary = !e.shiftKey;
        //     if (primary) {
        //       setYP(1 - y);
        //       setXP(x);
        //     } else {
        //       setXS(x);
        //       setYS(1 - y);
        //     }
        //   }
        // }}
      >
        <Draggable
          onDrag={(e: DraggableEvent, data: DraggableData) => {
            setDrag(true);
            const bounds = data.node.parentElement.getBoundingClientRect();
            const x = clamp(data.x, 0, bounds.width) / bounds.width;
            const y = clamp(data.y, 0, bounds.height) / bounds.height;
            props.XDragPrimary(x, props.step_index);
            props.YDragPrimary(1 - y, props.step_index);
          }}
        >
          <div className="w-1/12 h-auto aspect-square rounded-full bg-orange-500"></div>
        </Draggable>
        <Draggable
          onDrag={(e: DraggableEvent, data: DraggableData) => {
            setDrag(true);
            const bounds = data.node.parentElement.getBoundingClientRect();
            const x = clamp(data.x, 0, bounds.width) / bounds.width;
            const y = clamp(data.y, 0, bounds.height) / bounds.height;
            props.XDragSecondary(x, props.step_index);
            props.YDragSecondary(1 - y, props.step_index);
          }}
        >
          <div className="w-1/12 h-auto aspect-square rounded-full bg-blue-500"></div>
        </Draggable>
      </div>
    </>
  );
  return <div>{toggle_button}</div>;
};

export default TwoDButton;
