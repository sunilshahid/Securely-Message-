const { io } = require("socket.io-client");
const socket1 = io("http://localhost:3000", { transports: ["websocket"] });
const socket2 = io("http://localhost:3000", { transports: ["websocket"] });

let s1id = "test_user_1";
let s2id = "test_user_2";
let received = false;

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
  if (msg.messageId === "msg_123") {
    received = true;
    console.log("SUCCESS: Scheduled message delivered directly to online recipient!");
    socket1.disconnect();
    socket2.disconnect();
    process.exit(0);
  }
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
    deliverAt: new Date(Date.now() + 1500).toISOString(),
    messageId: "msg_123"
  });
}, 1000);

setTimeout(() => {
  if (received) {
    process.exit(0);
  } else {
    console.error("FAILURE: Scheduled message was not received within timeout");
    process.exit(1);
  }
}, 8000);
