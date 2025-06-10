import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import annotationPlugin from "chartjs-plugin-annotation";

export async function saveLatencyHistogram(
  latencies: number[],
  average: number,
  filename: string
) {
  const width = 800;
  const height = 600;
  const chartJSNodeCanvas = new ChartJSNodeCanvas({
    width,
    height,
    backgroundColour: "white",
    plugins: { modern: [annotationPlugin] },
  });

  // Create histogram bins
  const binCount = 50;
  const min = Math.min(...latencies);
  const max = Math.max(...latencies);
  const binSize = (max - min) / binCount;
  const bins = Array(binCount).fill(0);

  latencies.forEach((latency) => {
    let idx = Math.floor((latency - min) / binSize);
    if (idx >= binCount) idx = binCount - 1;
    bins[idx]++;
  });

  const labels = Array.from({ length: binCount }, (_, i) =>
    (min + i * binSize).toFixed(0)
  );
  const annotation1 = {
    type: "label",
    backgroundColor: "rgba(245, 245, 245, 0.5)",
    content: (ctx: any) => "Maximum value is " + max,
    font: {
      size: 16,
    },
    padding: {
      top: 6,
      left: 6,
      right: 6,
      bottom: 12,
    },
    position: {
      x: (ctx: any) => (max <= 3 ? "start" : max >= 10 ? "end" : "center"),
      y: "end",
    },
    xValue: (ctx: any) => max,
    yAdjust: -6,
    yValue: (ctx: any) => max,
  };
  const configuration = {
    type: "line" as const,
    data: {
      labels,
      datasets: [
        {
          label: "Latency (ms)",
          data: bins,
          // backgroundColor: "rgba(54, 162, 235, 0.7)",
        },
      ],
    },
    options: {
      plugins: {
        annotationPlugin: {
          annotations: {
            annotation1,
            line1: {
              type: "bar",
              yMin: average,
              yMax: average,
              borderColor: "rgb(255, 99, 132)",
              borderWidth: 5,
            },
          },
        },
        title: {
          display: true,
          text: "Request Latency Distribution",
        },
      },
      scales: {
        x: {
          title: { display: true, text: "Latency (ms)" },
        },
        y: {
          title: { display: true, text: "Frequency" },
        },
      },
    },
  };

  const buffer = await chartJSNodeCanvas.renderToBuffer(configuration);
  require("fs").writeFileSync(filename, buffer);
  console.log(`\nLatency distribution plot saved to '${filename}'`);
}
