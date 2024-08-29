import { ReactNode } from "react";
import { ColorPalette } from "./Colors";
import { isIOS } from "react-device-detect";

interface props {
  palette: number;
  children: ReactNode;
}
const BackgroundDiv = ({ palette, children }: props) => {
  return (
    <div
      className={
        (isIOS ? "h-svh max-h-svh " : "h-screen ") +
        "p-0 m-0 w-full bg-gradient-to-t via-40% to-100% overflow-hidden overscroll-none" +
        ColorPalette(palette).gradient_1 +
        ColorPalette(palette).gradient_2 +
        ColorPalette(palette).gradient_3
      }
    >
      {children}
    </div>
  );
};

export default BackgroundDiv;
