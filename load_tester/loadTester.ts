import path from "path";
import axios from "axios";
import sharp from "sharp";
import { saveLatencyHistogram } from "./chart";

const TARGET_URL = "http://127.0.0.1:52311/infer";
const IMAGE_PATH = path.join(__dirname, "berlin.jpg");
const NUM_REQUESTS = 40;
const CONCURRENCY = 20;

async function encodeImageToBase64(imagePath: string): Promise<string> {
  const buffer = await sharp(imagePath).resize(256, 256).jpeg().toBuffer();
  return buffer.toString("base64");
}

interface RequestResult {
  success: boolean;
  latency: number | null;
  data?: any;
  error?: string;
}

let responseTimeStamp: number[] = [];
let start: number;

async function sendRequest(base64Image: string): Promise<RequestResult> {
  try {
    const payload = { data: base64Image };
    responseTimeStamp.length === 0 ? (start = Date.now()) : null;
    const response = await axios.post(TARGET_URL, payload, { timeout: 10000 });
    responseTimeStamp.push(Date.now());
    const latency =
      responseTimeStamp.length === 1
        ? Date.now() - start
        : Date.now() - responseTimeStamp[responseTimeStamp.length - 2];
    console.log("🚀 ~ sendRequest ~ latency:", latency);
    return { success: response.status === 200, latency, data: response.data };
  } catch (err: any) {
    return { success: false, latency: null, error: err.message };
  }
}

async function runLoadTest(): Promise<void> {
  const base64Image = await encodeImageToBase64(IMAGE_PATH);
  const url =
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR_yHO01kdWo3NTUR6J-U6uIN8H2pbkGjdbGg&s";
  let successCount = 0;
  let failureCount = 0;
  let latencies: number[] = [];

  const batches = Math.ceil(NUM_REQUESTS / CONCURRENCY);

  for (let i = 0; i < batches; i++) {
    const batchSize = Math.min(CONCURRENCY, NUM_REQUESTS - i * CONCURRENCY);
    const promises: Promise<RequestResult>[] = [];
    for (let j = 0; j < batchSize; j++) {
      promises.push(sendRequest(url));
    }
    const results = await Promise.all(promises);
    for (const result of results) {
      if (result.success) {
        successCount++;
        if (result.latency !== null) {
          // console.log("🚀 ~ runLoadTest ~ latency:", result.latency);
          latencies.push(result.latency);
        }
      } else {
        failureCount++;
      }
    }
    process.stdout.write(
      `\rCompleted: ${successCount + failureCount}/${NUM_REQUESTS}`
    );
  }

  // Report
  console.log("\n\nTest Results:");
  console.log(`Total Requests: ${successCount + failureCount}`);
  console.log(`Successful Requests: ${successCount}`);
  console.log(`Failed Requests: ${failureCount}`);
  if (latencies.length > 0) {
    const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const min = Math.min(...latencies);
    const max = Math.max(...latencies);
    latencies.sort((a, b) => a - b);
    const p95 = latencies[Math.floor(latencies.length * 0.99)];
    console.log(`Average Latency: ${avg.toFixed(2)} ms`);
    console.log(`Min Latency: ${min} ms`);
    console.log(`Max Latency: ${max} ms`);
    console.log(`99th Percentile: ${p95} ms`);
    await saveLatencyHistogram(latencies, avg, "latency_distribution.png");
  }
}

runLoadTest();
