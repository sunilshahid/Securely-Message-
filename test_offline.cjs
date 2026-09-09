const { io } = require("socket.io-client");

let s1id = "test_offline_1";
let s2id = "test_offline_2";

const socket1 = io("http://localhost:3000", { transports: ["websocket"] });

socket1.on("connect", () => {
  socket1.emit("register", { securelyId: s1id, displayName: "Test 1" });
  console.log("Socket 1 connected");
  
  // Schedule a message for 2 seconds from now
  setTimeout(() => {
    console.log("Scheduling message from Socket 1 to Socket 2");
    socket1.emit("send_message", {
      type: "scheduled",
      recipientId: s2id,
      payload: JSON.stringify({ type: 1, body: "test_offline" }),
      deliverAt: new Date(Date.now() + 2000).toISOString(),
      messageId: "msg_offline_123"
    });
  }, 1000);
});

socket1.on("message_sent", (msg) => {
  console.log("Socket 1 message sent (cron fired):", msg);
  
  // Now connect Socket 2 to see if it receives the synced message
  const socket2 = io("http://localhost:3000", { transports: ["websocket"] });
  socket2.on("connect", () => {
    console.log("Socket 2 connected (after cron)");
    socket2.emit("register", { securelyId: s2id, displayName: "Test 2" });
  });
  
  socket2.on("sync_messages", (msgs) => {
    console.log("Socket 2 synced messages:", msgs);
    process.exit(0);
  });
});

setTimeout(() => {
  console.log("Timeout");
  process.exit(1);
}, 20000);
