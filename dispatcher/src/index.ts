import app from "./app";
import cluster from "cluster";
import os from "os";

const port = 3002;

async function startServer() {
  try {
    if (cluster.isPrimary) {
      // Cluster mode for production
      const numCPUs = Math.min(os.cpus().length, 3);
      console.log(`Starting ${numCPUs} worker processes...`);

      for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
      }

      cluster.on("exit", (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died. Restarting...`);
        cluster.fork();
      });
    } else {
      // Single process mode or worker process
      app.listen(port, () => {
        const processId = cluster.isWorker
          ? `Worker ${process.pid}`
          : `Single process ${process.pid}`;
        console.log(`${processId} running on port ${port}`);
      });
    }
  } catch (error) {
    console.error("Server startup error:", error);
    process.exit(1);
  }
}

startServer();
