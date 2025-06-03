import express, { Request, Response } from "ultimate-express";
import multer from "multer";

const app = express();
const port = 8001;

// Queue to store images in memory
const queue: { data: string }[] = [];
const MAX_QUEUE_SIZE = 1000;

const upload = multer();

app.post("/enqueue", upload.single("file"), (req: Request, res: Response) => {
  const data = req.body.data;
  if (!data) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  if (queue.length >= MAX_QUEUE_SIZE) {
    return res.status(503).json({ error: "Queue is full" });
  }

  queue.push({ data });
  return res.json({ status: "enqueued", queueSize: queue.length });
});

app.get("/dequeue", (req: Request, res: Response) => {
  if (queue.length === 0) {
    return res.status(204).json({ error: "Queue is empty" });
  }

  const { data } = queue.shift()!;
  res.setHeader("Content-Type", "image/jpeg");
  res.setHeader("X-Filename", filename);
  res.send(buffer);
});

app.listen(port, () => {
  console.log(`Dispatcher running at http://localhost:${port}`);
});
