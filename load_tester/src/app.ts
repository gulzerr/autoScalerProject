import express from "ultimate-express";
import bodyParser from "body-parser";
import cors from "cors";
import morganBody from "morgan-body";
import { latCacheKey, memoize } from "./cache/memoize";
import { runWorkloadBasedTest } from "./workloadLoadTester";
import { generateReport } from "./generate";

const app = express();

app.use(bodyParser.json());
morganBody(app);
app.use(cors());

app.get("/", (req, res) => {
  res.json({ message: "API is running" });
});

app.get("/latency", async (req, res) => {
  try {
    const { key } = req.query;
    const values = memoize.get(key as string);
    res.json({
      status: "success",
      data: {
        key,
        values,
      },
    });
  } catch (err) {
    res.status(500).json({
      error: "Failed to retrieve latency data",
      details: (err as Error).message,
    });
  }
});

app.post("/storeLatency", async (req, res) => {
  const { latency, processing_time } = req.body;
  try {
    let latencies = memoize.get<number[]>(latCacheKey) || [];
    latencies.push(latency);
    memoize.set(latCacheKey, latencies, 3600);
    res.json({ status: "success", message: "Latency stored successfully" });
  } catch (err) {
    res.status(500).json({
      error: "Failed to set chunk size",
      details: (err as Error).message,
    });
  }
});

app.delete("/clear-latency", (req, res) => {
  const { key } = req.query;
  try {
    memoize.del(key as string);
    res.json({ status: "success", message: "Cache data cleared" });
  } catch (err) {
    res.status(500).json({
      error: "Failed to clear latency data",
      details: (err as Error).message,
    });
  }
});

app.post("/runLoadTest", async (req, res) => {
  const { maxImages } = req.body;
  try {
    await runWorkloadBasedTest({ maxImages });
    res.json({ status: "success", message: "Load test completed" });
  } catch (err) {
    res.status(500).json({
      error: "Failed to run load test",
      details: (err as Error).message,
    });
  }
});

app.post("/generateReport", async (req, res) => {
  try {
    const { totalRequests } = req.body;
    await generateReport({ totalRequests });
    res.json({ status: "success", message: "Report generated successfully" });
  } catch (err) {
    res.status(500).json({
      error: "Failed to generate report",
      details: (err as Error).message,
    });
  }
});

export default app;
