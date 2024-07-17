import { ReactNode } from "react";

interface props {
  children: ReactNode;
}
const BackgroundDiv = ({ children }: props) => {
  return (
    <div className="p-0 m-0 w-full h-screen bg-gradient-to-t from-indigo-50 via-indigo-300 via-40% to-blue-950 to-100%">
      <div className="w-full h-screen bg-noise bg-repeat">{children}</div>
    </div>
  );
};

export default BackgroundDiv;
