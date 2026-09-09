const { io } = require("socket.io-client");
const socket1 = io("http://localhost:3000", { transports: ["websocket"] });
const socket2 = io("http://localhost:3000", { transports: ["websocket"] });

let s1id = "test_user_1";
let s2id = "test_user_2";

socket1.on("connect", () => {
  socket1.emit("register", { securelyId: s1id, displayName: "Test 1" });
  console.log("Socket 1 connected");
});

socket2.on("connect", () => {
  socket2.emit("register", { securelyId: s2id, displayName: "Test 2" });
  console.log("Socket 2 connected");
});

socket2.on("receive_message", (msg) => {
  console.log("Socket 2 received message:", msg);
});

socket1.on("message_scheduled", (msg) => {
  console.log("Socket 1 message scheduled:", msg);
});

socket1.on("message_sent", (msg) => {
  console.log("Socket 1 message sent:", msg);
});

setTimeout(() => {
  console.log("Scheduling message from Socket 1 to Socket 2");
  socket1.emit("send_message", {
    type: "scheduled",
    recipientId: s2id,
    payload: JSON.stringify({ type: 1, body: "test" }),
    deliverAt: new Date(Date.now() + 2000).toISOString(),
    messageId: "msg_123"
  });
}, 1000);

setTimeout(() => {
  console.log("Test finished");
  process.exit(0);
}, 15000);
