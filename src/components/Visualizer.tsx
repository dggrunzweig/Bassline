import { useEffect, useRef } from "react";
import { ColorPalette } from "./Colors";

interface props {
  analyzer: AnalyserNode;
}

const Visualizer = ({ analyzer }: props) => {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      const canvas = ref.current as HTMLCanvasElement;
      const ctx = canvas.getContext("2d");
      let requestID = 0;
      const render = () => {
        const fft_size = 512;
        const data = new Float32Array(fft_size);
        analyzer.getFloatTimeDomainData(data);
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.strokeStyle = "#f8fafc";
          ctx.lineWidth = 3;
          const half_height = Math.floor(canvas.height / 2);
          ctx.beginPath();
          let x = 0;
          let y = half_height;
          for (let i = 0; i < fft_size; ++i) {
            const sample = data[i];
            ctx.moveTo(x, y);
            x = (i / fft_size) * canvas.width;
            y = half_height - half_height * sample;
            ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.stroke();
        }

        requestID = requestAnimationFrame(render);
      };

      render();

      return () => {
        cancelAnimationFrame(requestID);
      };
    }
  });

  return (
    <div className="flex flex-col items-center">
      <canvas
        ref={ref}
        className={
          "w-3/4 aspect-square rounded-xl bg-transparent border" +
          ColorPalette(0).knob_border
        }
      />
    </div>
  );
};

export default Visualizer;
