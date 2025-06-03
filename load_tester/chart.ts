import { ChartJSNodeCanvas } from "chartjs-node-canvas";

// ...existing code...

export async function saveLatencyHistogram(
  latencies: number[],
  filename: string
) {
  const width = 800;
  const height = 600;
  const chartJSNodeCanvas = new ChartJSNodeCanvas({
    width,
    height,
    backgroundColour: "white",
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

  const configuration = {
    type: "bar" as const,
    data: {
      labels,
      datasets: [
        {
          label: "Latency (ms)",
          data: bins,
          backgroundColor: "rgba(54, 162, 235, 0.7)",
        },
      ],
    },
    options: {
      plugins: {
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
