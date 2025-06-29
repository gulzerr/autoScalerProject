// Create a new file, e.g., ws-client.js

import WebSocket from "ws";

const ws = new WebSocket("ws://localhost:3001");

ws.on("message", function message(data) {
  console.log("received: %s", data);
});
