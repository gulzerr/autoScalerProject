import express from "ultimate-express";
import bodyParser from "body-parser";
import cors from "cors";
import morganBody from "morgan-body";
import "./queue/queue";
import { cacheKey, chunkSizeCacheKey, memoize } from "./cache/cache";
import { queueArray } from "./queue/queue";

const app = express();

app.use(bodyParser.json());
morganBody(app);
app.use(cors());

app.get("/", (req, res) => {
  res.json({ message: "API is running" });
});

app.post("/enqueue", async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Missing message" });
  }
  try {
    queueArray.push(message.imageBase64);
    res.json({ status: "queued" });
  } catch (err) {
    res.status(500).json({
      error: "Failed to enqueue job",
      details: (err as Error).message,
    });
  }
});

app.get("/latency", async (req, res) => {
  try {
    const arr = memoize.get<number[]>(cacheKey) || [];
    if (arr.length === 0) {
      return res.status(404).json({ error: "No latency data found" });
    }
    res.json({
      status: "success",
      data: {
        latencyArray: arr,
      },
    });
  } catch (err) {
    res.status(500).json({
      error: "Failed to retrieve latency data",
      details: (err as Error).message,
    });
  }
});

app.delete("/clear-latency", (req, res) => {
  try {
    memoize.del(cacheKey);
    res.json({ status: "success", message: "Latency data cleared" });
  } catch (err) {
    res.status(500).json({
      error: "Failed to clear latency data",
      details: (err as Error).message,
    });
  }
});

app.get("/chunkSize", (req, res) => {
  try {
    const chunkSize = memoize.get<number>(chunkSizeCacheKey);
    res.json({ status: "success", chunkSize });
  } catch (err) {
    res.status(500).json({
      error: "Failed to retrieve chunk size",
      details: (err as Error).message,
    });
  }
});

app.post("/chunkSize", (req, res) => {
  const { chunkSize } = req.body;
  if (typeof chunkSize !== "number" || chunkSize <= 0) {
    return res.status(400).json({ error: "Invalid chunk size" });
  }
  try {
    console.log(
      `Setting chunkSize from ${
        memoize.get<number>(chunkSizeCacheKey) || "undefined"
      } to ${chunkSize}`
    );
    memoize.set(chunkSizeCacheKey, chunkSize, 3600);
    res.json({ status: "success", message: `Chunk size set to ${chunkSize}` });
  } catch (err) {
    res.status(500).json({
      error: "Failed to set chunk size",
      details: (err as Error).message,
    });
  }
});

export default app;
