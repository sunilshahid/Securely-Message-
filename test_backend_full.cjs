const { io } = require("socket.io-client");
const http = require("http");

async function run() {
  console.log("=== Testing Backend Socket & REST Endpoints ===");

  // 1. Test REST Prekeys endpoint with PQ prekey
  const aliceId = "alice_" + Date.now();
  const bobId = "bob_" + Date.now();

  const registerBob = () => new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      securelyId: bobId,
      displayName: "Bob PQ",
      registrationId: 1337,
      identityKey: "base64IdentityKeyBob",
      signedPreKey: {
        keyId: 1,
        publicKey: "base64SignedPreKeyBob",
        signature: "base64SigBob"
      },
      preKeys: [{ keyId: 10, publicKey: "base64PreKey10" }],
      pqPreKey: { keyId: 100, publicKey: "base64MLKEM768PubKeyBob" }
    });

    const req = http.request("http://localhost:3000/api/v1/auth/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on("error", reject);
    req.write(postData);
    req.end();
  });

  const getPrekeys = (id) => new Promise((resolve, reject) => {
    http.get(`http://localhost:3000/api/v1/prekeys/${id}`, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });

  const getBundle = (id) => new Promise((resolve, reject) => {
    http.get(`http://localhost:3000/api/v1/bundle/${id}`, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });

  console.log("1. Registering Bob with ML-KEM-768 pqPreKey...");
  const regRes = await registerBob();
  console.log("   Registration response:", regRes);
  if (!regRes.success) throw new Error("Bob registration failed");

  console.log("2. Fetching prekeys for Bob (/api/v1/prekeys/:securelyId)...");
  const prekeysRes = await getPrekeys(bobId);
  console.log("   Prekeys response:", prekeysRes);
  if (!prekeysRes.pqPreKey || prekeysRes.pqPreKey.publicKey !== "base64MLKEM768PubKeyBob") {
    throw new Error("pqPreKey missing or incorrect in /api/v1/prekeys");
  }

  console.log("3. Fetching bundle for Bob (/api/v1/bundle/:id)...");
  const bundleRes = await getBundle(bobId);
  console.log("   Bundle response:", bundleRes);
  if (!bundleRes.pqPreKey || bundleRes.pqPreKey.publicKey !== "base64MLKEM768PubKeyBob") {
    throw new Error("pqPreKey missing or incorrect in /api/v1/bundle");
  }

  // 4. Test WebRTC Call Socket Events
  console.log("4. Testing WebRTC Call Socket Events...");
  await new Promise((resolve, reject) => {
    const s1 = io("http://localhost:3000", { transports: ["websocket"] });
    const s2 = io("http://localhost:3000", { transports: ["websocket"] });

    let offerReceived = false;
    let answerReceived = false;
    let candidateReceived = false;
    let endReceived = false;

    s1.on("connect", () => {
      s1.emit("register", { securelyId: aliceId, displayName: "Alice Minimal" });
    });

    s2.on("connect", () => {
      s2.emit("register", { securelyId: bobId, displayName: "Bob Minimal" });
      
      // Alice calls Bob
      setTimeout(() => {
        console.log("   Alice sends call_offer to Bob");
        s1.emit("call_offer", {
          recipientId: bobId,
          offer: { type: "offer", sdp: "dummy_sdp" },
          isVideo: false
        });
      }, 500);
    });

    s2.on("call_offer", (data) => {
      console.log("   Bob received call_offer:", data.senderId);
      offerReceived = true;
      // Bob answers
      s2.emit("call_answer", {
        recipientId: aliceId,
        answer: { type: "answer", sdp: "dummy_answer" }
      });
    });

    s1.on("call_answer", (data) => {
      console.log("   Alice received call_answer:", data.senderId);
      answerReceived = true;
      // Alice sends ICE candidate
      s1.emit("ice_candidate", {
        recipientId: bobId,
        candidate: { candidate: "candidate:123" }
      });
    });

    s2.on("ice_candidate", (data) => {
      console.log("   Bob received ice_candidate:", data.senderId);
      candidateReceived = true;
      // Bob ends call
      s2.emit("end_call", { recipientId: aliceId });
    });

    s1.on("end_call", (data) => {
      console.log("   Alice received end_call:", data.senderId);
      endReceived = true;
      s1.disconnect();
      s2.disconnect();
      if (offerReceived && answerReceived && candidateReceived && endReceived) {
        console.log("   All WebRTC call socket events passed!");
        resolve();
      } else {
        reject(new Error("Some WebRTC call events were not received"));
      }
    });

    setTimeout(() => {
      s1.disconnect();
      s2.disconnect();
      reject(new Error("WebRTC socket events timed out"));
    }, 6000);
  });

  console.log("=== All Backend Verification Checks Passed Successfully! ===");
  process.exit(0);
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
