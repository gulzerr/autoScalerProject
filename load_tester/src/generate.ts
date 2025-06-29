import { saveLatencyHistogram } from "./chart";
import { latCacheKey, memoize } from "./cache/memoize";

export const generateReport = async (opts: { totalRequests: number }) => {
  const { totalRequests } = opts;
  try {
    const latencies = memoize.get<number[]>(latCacheKey) || [];

    // Calculate request statistics
    const successfulRequests = latencies.length;
    const actualFailedRequests = totalRequests - successfulRequests;
    const successRate =
      totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;
    const failureRate =
      totalRequests > 0 ? (actualFailedRequests / totalRequests) * 100 : 0;

    console.log("=== LOAD TEST RESULTS ===");
    console.log(`Total Requests: ${totalRequests}`);
    console.log(`Successful Requests: ${successfulRequests}`);
    console.log(`Failed Requests: ${actualFailedRequests}`);
    console.log(`Success Rate: ${successRate.toFixed(2)}%`);
    console.log(`Failure Rate: ${failureRate.toFixed(2)}%`);
    console.log("========================");

    // const latencies = response.data.data.latencyArray;
    if (latencies.length > 0) {
      const avg =
        latencies.reduce((a: number, b: number) => a + b, 0) / latencies.length;
      const min = Math.min(...latencies);
      const max = Math.max(...latencies);
      latencies.sort((a: number, b: number) => a - b);
      const p99 = latencies[Math.floor(latencies.length * 0.99)];
      console.log(`Average Latency: ${avg.toFixed(2)} ms`);
      console.log(`Min Latency: ${min} ms`);
      console.log(`Max Latency: ${max} ms`);
      console.log(`99th Percentile: ${p99} ms`);
      await saveLatencyHistogram({
        latencies,
        average: avg,
        minLat: min,
        maxLat: max,
        p99Lat: p99 ?? 0,
        filename: "latency_distribution.png",
      });
    }
  } catch (error) {
    console.error("Failed to fetch latency data:", error);
  }
};

// generateReport({})
//   .then(() => console.log("Report generated successfully"))
//   .catch((err) => console.error("Error generating report:", err));
