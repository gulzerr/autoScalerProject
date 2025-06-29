import path from "path";
import axios from "axios";
import sharp from "sharp";
import fs from "fs";
import { PORT } from "./constants";

const TARGET_URL = `http://127.0.0.1:${PORT.dispatcher}/enqueue`;
const TARGET_URL_INFERER = `http://127.0.0.1:${PORT.inferer}/infer`;
const MAX_IMAGES = 1000; // Total number of unique images to process
const WORKLOAD_FILE = path.join(__dirname, "./workload.txt");

interface RequestResult {
  success: boolean;
  data?: any;
  error?: string;
  responseTime?: number;
}

async function encodeImageToBase64(imagePath: string): Promise<string> {
  const buffer = await sharp(imagePath).resize(256, 256).jpeg().toBuffer();
  return buffer.toString("base64");
}

async function sendRequest(base64Image: string): Promise<RequestResult> {
  const startTime = Date.now();
  try {
    const payload = {
      // data: base64Image,
      message: { imageBase64: base64Image },
    };
    const response = await axios.post(TARGET_URL, payload);
    const responseTime = Date.now() - startTime;

    console.log(`✅ Request completed in ${responseTime}ms: ${response.data}`);
    return {
      success: response.status === 200,
      data: response.data,
      responseTime,
    };
  } catch (err) {
    const responseTime = Date.now() - startTime;
    console.error(
      `❌ Request failed after ${responseTime}ms:`,
      (err as Error).message
    );
    return {
      success: false,
      error: (err as Error).message,
      responseTime,
    };
  }
}

function readWorkloadPattern(): number[] {
  try {
    const workloadContent = fs.readFileSync(WORKLOAD_FILE, "utf-8");
    let requestsPerSecond = workloadContent
      .trim()
      .split(/\s+/)
      .map((num) => parseInt(num.trim(), 10))
      .filter((num) => !isNaN(num) && num >= 0);

    console.log(
      `📊 Loaded workload pattern: ${requestsPerSecond.length} seconds`
    );
    console.log(
      `📈 Pattern: [${requestsPerSecond.slice(0, 10).join(", ")}${
        requestsPerSecond.length > 10 ? "..." : ""
      }]`
    );

    return requestsPerSecond;
  } catch (error) {
    console.error(`❌ Failed to read workload file: ${WORKLOAD_FILE}`);
    console.error(error);
    return [];
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendRequestsAtRate(
  imagePool: string[],
  requestsPerSecond: number,
  duration: number = 1000,
  imageQueue: string[]
): Promise<RequestResult[]> {
  if (requestsPerSecond === 0 || imageQueue.length === 0) {
    await sleep(duration);
    return [];
  }

  // Don't send more requests than images available
  const actualRequests = Math.min(requestsPerSecond, imageQueue.length);
  const intervalMs = duration / actualRequests;
  const promises: Promise<RequestResult>[] = [];

  console.log(
    `🚀 Sending ${actualRequests} requests over ${duration}ms (interval: ${intervalMs.toFixed(
      1
    )}ms) - ${imageQueue.length} images remaining`
  );

  for (let i = 0; i < actualRequests; i++) {
    const imageToSend = imageQueue.shift(); // Remove image from queue
    if (!imageToSend) break; // No more images

    // Schedule request after appropriate delay
    const delay = i * intervalMs;
    const requestPromise = sleep(delay).then(() => sendRequest(imageToSend));
    promises.push(requestPromise);
  }

  const results = await Promise.all(promises);

  // Calculate stats for this second
  const successful = results.filter((r) => r.success).length;
  const failed = results.length - successful;
  const avgResponseTime =
    results.length > 0
      ? Math.round(
          results.reduce((sum, r) => sum + (r.responseTime || 0), 0) /
            results.length
        )
      : 0;

  console.log(
    `📊 Results: ${successful} success, ${failed} failed, avg response: ${avgResponseTime}ms`
  );

  return results;
}

export async function runWorkloadBasedTest(
  opts: { maxImages?: number } = {}
): Promise<void> {
  const maxImages = opts.maxImages || MAX_IMAGES;
  const workloadPattern = readWorkloadPattern();

  if (workloadPattern.length === 0) {
    console.log(
      "❌ No valid workload pattern found. Please create workload.txt file."
    );
    return;
  }

  // Prepare image pool
  const imagesDir = path.join(__dirname, "../images");
  let imageFiles = fs
    .readdirSync(imagesDir)
    .filter((f) => /\.(jpg|jpeg|png)$/i.test(f));

  imageFiles = imageFiles.slice(0, maxImages);

  console.log(`📸 Prepared ${imageFiles.length} images for testing`);

  // Pre-encode all images to base64 for faster access
  console.log("🔄 Pre-encoding images to base64...");
  const imagePool: string[] = [];
  for (const file of imageFiles) {
    const imgPath = path.join(imagesDir, file);
    const base64 = await encodeImageToBase64(imgPath);
    imagePool.push(base64);
  }
  console.log(`✅ ${imagePool.length} images encoded and ready`);

  // Create a queue of images to process (each image will be sent exactly once)
  const imageQueue = [...imagePool]; // Copy the array so we can modify it
  const totalImagesToProcess = imageQueue.length;

  // Execute workload pattern
  console.log(
    `🎯 Starting workload-based test for ${workloadPattern.length} seconds`
  );
  console.log(
    `📸 Will process ${totalImagesToProcess} images total (each image sent exactly once)`
  );
  console.log(
    `⏰ Test will run for ${Math.floor(workloadPattern.length / 60)}m ${
      workloadPattern.length % 60
    }s total`
  );

  const overallStats = {
    totalRequests: 0,
    totalSuccessful: 0,
    totalFailed: 0,
    totalResponseTime: 0,
  };

  for (let second = 0; second < workloadPattern.length; second++) {
    const requestsThisSecond = workloadPattern[second] || 0;
    const startTime = Date.now();

    console.log(
      `\n⏱️  Second ${second + 1}/${
        workloadPattern.length
      }: ${requestsThisSecond} requests/sec`
    );

    const results = await sendRequestsAtRate(
      imagePool,
      requestsThisSecond,
      1000,
      imageQueue
    );

    // Update overall stats
    overallStats.totalRequests += results.length;
    overallStats.totalSuccessful += results.filter((r) => r.success).length;
    overallStats.totalFailed += results.filter((r) => !r.success).length;
    overallStats.totalResponseTime += results.reduce(
      (sum, r) => sum + (r.responseTime || 0),
      0
    );

    // Stop if we've processed all images
    if (imageQueue.length === 0) {
      console.log(
        `🏁 All ${totalImagesToProcess} images have been processed. Stopping test.`
      );
      break;
    }

    // Ensure we maintain 1-second intervals
    const elapsed = Date.now() - startTime;
    const remaining = 1000 - elapsed;
    if (remaining > 0) {
      await sleep(remaining);
    }
  }

  // Print final statistics
  console.log("\n🏁 Workload-based test completed!");
  console.log("📈 Final Statistics:");
  console.log(`   Total Requests: ${overallStats.totalRequests}`);
  console.log(
    `   Successful: ${overallStats.totalSuccessful} (${Math.round(
      (overallStats.totalSuccessful / overallStats.totalRequests) * 100
    )}%)`
  );
  console.log(
    `   Failed: ${overallStats.totalFailed} (${Math.round(
      (overallStats.totalFailed / overallStats.totalRequests) * 100
    )}%)`
  );

  if (overallStats.totalRequests > 0) {
    const avgResponseTime = Math.round(
      overallStats.totalResponseTime / overallStats.totalRequests
    );
    console.log(`   Average Response Time: ${avgResponseTime}ms`);
  }

  const totalDuration = workloadPattern.length;
  const avgRequestsPerSecond = Math.round(
    overallStats.totalRequests / totalDuration
  );
  console.log(
    `   Average Load: ${avgRequestsPerSecond} req/sec over ${totalDuration} seconds`
  );
}

// Start the workload-based test
console.log("🚀 Starting Workload Pattern Load Tester");
console.log(`📁 Workload file: ${WORKLOAD_FILE}`);
console.log(`🎯 Target: ${TARGET_URL}`);
console.log("=".repeat(60));

// runWorkloadBasedTest().catch(console.error);
