import axios from "axios";
import cron from "node-cron";
import { chunkSizeCacheKey, memoize } from "../cache/cache";

interface RequestResult {
  success: boolean;
  data?: any;
  error?: string;
}

export const queueArray: string[] = [];
const TARGET_URL =
  process.env.ML_INFERENCE_URL || "http://127.0.0.1:9999/infer";

async function sendRequest(base64Image: string): Promise<RequestResult> {
  try {
    const payload = {
      data: base64Image,
    };
    const timestamp = Date.now();
    const response = await axios.post(TARGET_URL, payload);
    const latency = Date.now() - timestamp;
    const latObj = {
      processing_time: response.data.processing_time * 1000,
      latency,
    };
    if (process.env.LOCAL_API_URL) {
      await axios.post(process.env.LOCAL_API_URL + "/storeLatency", latObj);
    } else {
      console.warn("LOCAL_API_URL is not defined. Skipping latency post.");
    }
    return { success: response.status === 200, data: response.data };
  } catch (err) {
    console.error("Error sending request:", err);
    return { success: false, error: (err as Error).message };
  }
}

cron.schedule("*/1 * * * * *", async () => {
  const chunkSize = memoize.get<number>(chunkSizeCacheKey) || 2;
  if (queueArray.length >= chunkSize) {
    const chunkEdArray = queueArray.splice(0, chunkSize);
    const promises: Promise<RequestResult>[] = [];
    for (const chunk of chunkEdArray) {
      promises.push(sendRequest(chunk));
    }
    await Promise.all(promises);
  }
  if (queueArray.length < chunkSize && queueArray.length > 0) {
    const promises: Promise<RequestResult>[] = [];
    for (const item of queueArray) {
      promises.push(sendRequest(item));
    }
    queueArray.length = 0; // Clear the queue after processing
    await Promise.all(promises);
  } else {
    console.log("Queue processed, current length:", queueArray.length);
  }
});
