import { useState, useRef, useEffect } from "react";
import { ColorPalette } from "./Colors";
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
  toggle_init: boolean;
  palette: number;
}

const clamp = (x: number, min_x: number, max_x: number) => {
  return Math.max(min_x, Math.min(x, max_x));
};

const ConvertXYToPos = (
  x: number,
  y: number,
  width: number,
  height: number
): number[] => {
  x = clamp(x * width, 10, width - 10);
  y = clamp((1 - y) * height, 10, height - 10);
  return [x, y];
};

const TwoDButton = (props: props) => {
  const element_ref = useRef(null);
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });

  // resize observer ensures that the dots move to the correct position if the window is resized
  const resize_observer = new ResizeObserver(
    (entries: ResizeObserverEntry[]) => {
      entries.forEach((entry) => {
        setDimensions({
          w: entry.contentRect.width,
          h: entry.contentRect.height,
        });
      });
    }
  );

  const x = props.x_p_init;
  const y = props.y_p_init;
  const x_s = props.x_s_init;
  const y_s = props.y_s_init;

  const toggled = props.toggle_init;

  const is_dragging = useRef(false);
  const [click_started, setClickStarted] = useState(false);

  useEffect(() => {
    if (element_ref.current) {
      // @ts-ignore
      resize_observer.observe(element_ref.current);
      return () => {
        if (element_ref.current) resize_observer.unobserve(element_ref.current);
      };
    }
  }, []);

  let button_bg = " bg-transparent";
  let button_outline =
    props.step_index % 4 == 0
      ? ColorPalette(props.palette).border_button_accent
      : ColorPalette(props.palette).border_button_standard;

  if (toggled) {
    button_bg = ColorPalette(props.palette).button_bg;
    button_outline = ColorPalette(props.palette).border_button_active;
  }

  if (props.step_index == props.selected_index)
    button_outline =
      ColorPalette(props.palette).border_button_step +
      "shadow-[0_0_30px_0px_rgba(0,0,0,0.3)]";

  let primary_color = ColorPalette(props.palette).dot_1_bg;
  let secondary_color = ColorPalette(props.palette).dot_2_bg;

  const primary_pos = ConvertXYToPos(x, y, dimensions.w, dimensions.h);
  const secondary_pos = ConvertXYToPos(x_s, y_s, dimensions.w, dimensions.h);

  const mouseDown = () => {
    setClickStarted(true);
  };

  const mouseUp = () => {
    if (!is_dragging.current) {
      props.Toggle(!toggled, props.step_index);
    }
    is_dragging.current = false;
    setClickStarted(false);
  };

  const mouseLeave = () => {
    is_dragging.current = false;
    setClickStarted(false);
  };

  const mouseMove = (e: React.MouseEvent) => {
    if (click_started) {
      is_dragging.current = true;
      const bounds = e.currentTarget.getBoundingClientRect();
      const x = clamp(e.clientX - bounds.x, 0, bounds.width) / bounds.width;
      const y =
        1 - clamp(e.clientY - bounds.y, 0, bounds.height) / bounds.height;
      const primary = !e.shiftKey;
      if (primary) {
        props.XDragPrimary(x, props.step_index);
        props.YDragPrimary(y, props.step_index);
      } else {
        props.XDragSecondary(x, props.step_index);
        props.YDragSecondary(y, props.step_index);
      }
    }
  };

  const touchMove = (e: React.TouchEvent) => {
    if (click_started) {
      is_dragging.current = true;
      const bounds = e.currentTarget.getBoundingClientRect();
      const x =
        clamp(e.touches[0].clientX - bounds.x, 0, bounds.width) / bounds.width;
      const y =
        1 -
        clamp(e.touches[0].clientY - bounds.y, 0, bounds.height) /
          bounds.height;
      const primary = !e.shiftKey;
      if (primary) {
        props.XDragPrimary(x, props.step_index);
        props.YDragPrimary(y, props.step_index);
      } else {
        props.XDragSecondary(x, props.step_index);
        props.YDragSecondary(y, props.step_index);
      }
    }
  };

  const toggle_button = (
    <>
      <div
        ref={element_ref}
        className={
          "flex flex-row h-full max-h-48 w-auto relative border-2 aspect-square rounded-lg select-none" +
          button_outline +
          button_bg
        }
        onMouseDown={mouseDown}
        onMouseUp={mouseUp}
        onMouseLeave={mouseLeave}
        onMouseMove={mouseMove}
        onTouchStart={mouseDown}
        onTouchEnd={mouseUp}
        onTouchCancel={mouseLeave}
        onTouchMove={touchMove}
      >
        {toggled && (
          <img
            src="./assets/button_grid.svg"
            className="object-fill w-full h-full select-none"
            draggable={false}
          />
        )}
        {toggled && (
          <div
            style={{
              transform: `translate(${primary_pos[0]}px, ${primary_pos[1]}px)`,
            }}
            className={
              "absolute -m-3 w-4 h-auto aspect-square rounded-full border " +
              ColorPalette(props.palette).dot_border +
              primary_color
            }
          ></div>
        )}
        {toggled && (
          <div
            style={{
              transform: `translate(${secondary_pos[0]}px, ${secondary_pos[1]}px)`,
            }}
            className={
              "absolute -m-2 w-4 h-auto aspect-square rounded-full border" +
              ColorPalette(props.palette).dot_border +
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
