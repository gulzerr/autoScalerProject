import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import annotationPlugin from "chartjs-plugin-annotation";

export async function saveLatencyHistogram(opts: {
  latencies: number[];
  average: number;
  minLat: number;
  maxLat: number;
  p99Lat: number;
  filename: string;
}) {
  const { latencies, average, minLat, maxLat, p99Lat, filename } = opts;
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

  const statsBox = {
    type: "label" as const,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderColor: "rgba(128, 128, 128, 0.8)",
    borderWidth: 1,
    content: [
      `Average Latency: ${average.toFixed(2)} ms`,
      `Min Latency: ${minLat} ms`,
      `Max Latency: ${maxLat} ms`,
      `99th Percentile: ${p99Lat} ms`,
    ],
    font: {
      size: 12,
      family: "Arial",
    },
    padding: {
      top: 8,
      left: 10,
      right: 10,
      bottom: 8,
    },
    position: {
      x: "end" as const,
      y: "start" as const,
    },
    xAdjust: 360,
    yAdjust: -220,
  };
  const configuration = {
    type: "line" as const,
    data: {
      labels,
      datasets: [
        {
          label: "Latency (ms)",
          data: bins,
          backgroundColor: "rgba(54, 162, 235, 0.7)",
          borderColor: "rgba(54, 162, 235, 1)",
          borderWidth: 2,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        annotation: {
          annotations: {
            statsBox,
            averageLine: {
              type: "line" as const,
              yMin: 0,
              yMax: Math.max(...bins),
              xMin: average,
              xMax: average,
              borderColor: "rgb(255, 99, 132)",
              borderWidth: 2,
              borderDash: [5, 5],
              label: {
                content: "Average",
                enabled: true,
                position: "end" as const,
              },
            },
          },
        },
        title: {
          display: true,
          text: "Request Latency Distribution",
          font: {
            size: 16,
          },
        },
        legend: {
          display: true,
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: "Latency (ms)",
            font: {
              size: 14,
            },
          },
        },
        y: {
          title: {
            display: true,
            text: "Frequency",
            font: {
              size: 14,
            },
          },
        },
      },
    },
  };

  const buffer = await chartJSNodeCanvas.renderToBuffer(configuration);
  require("fs").writeFileSync(filename, buffer);
  console.log(`\nLatency distribution plot saved to '${filename}'`);
}

// const latencies = [
//   272, 96, 170, 120, 121, 94, 88, 95, 102, 151, 200, 84, 142, 79, 125, 66, 107,
//   53, 94, 71, 124, 81, 123, 662, 472, 199, 266, 296, 401, 423, 134, 480, 47, 92,
//   139, 184, 110, 164, 212, 256, 68, 117, 165, 206, 76, 131, 181, 440, 83, 148,
//   232, 293, 63, 108, 183, 227, 62, 108, 162, 207, 101, 142, 76, 122, 70, 114,
//   78, 120, 76, 120, 82, 146, 73, 118, 69, 118, 59, 104, 63, 107, 87, 129, 83,
//   127, 89, 142, 77, 114, 82, 126, 75, 118, 197, 322, 72, 114, 59, 113, 79, 129,
// ];

// const average = 147.47,
//   minLat = 47,
//   maxLat = 662,
//   p99Lat = 662;

// saveLatencyHistogram({
//   latencies,
//   average,
//   minLat,
//   maxLat,
//   p99Lat,
//   filename: "latency_distribution.png",
// })
//   .then(() => console.log("Histogram saved successfully"))
//   .catch((err) => console.error("Error saving histogram:", err));
