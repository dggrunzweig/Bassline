import { ReactNode } from "react";
import { ColorPalette } from "./Colors";

interface props {
  palette: number;
  children: ReactNode;
}
const BackgroundDiv = ({ palette, children }: props) => {
  return (
    <div
      className={
        "p-0 m-0 w-full h-screen bg-gradient-to-t via-40% to-100%" +
        ColorPalette(palette).gradient_1 +
        ColorPalette(palette).gradient_2 +
        ColorPalette(palette).gradient_3
      }
    >
      <div className="w-full h-screen bg-noise bg-repeat">{children}</div>
    </div>
  );
};

export default BackgroundDiv;
