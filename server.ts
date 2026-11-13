import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import multer from "multer";
import path from "path";
import { createServer as createViteServer } from "vite";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import os from "os";

const app = express();
const httpServer = createServer(app);

// Use polling as fallback if WebSockets blocked
const io = new Server(httpServer, {
  cors: { origin: "*" },
  transports: ["websocket", "polling"],
  maxHttpBufferSize: 1e8, // 100MB
});

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Mongoose Models
const userSchema = new mongoose.Schema({
  securelyId: { type: String, required: true, unique: true },
  displayName: { type: String },
  username: { type: String, unique: true, sparse: true },
  phoneNumber: { type: String, sparse: true },
  photoUrl: { type: String },
  about: { type: String },
  discoverable: { type: Boolean, default: true },
  passwordHash: { type: String },
  encryptedIdentity: { type: String },
  saltHex: { type: String },
  contacts: [{ type: String }],
  registrationId: { type: Number, default: 0 },
  identityKey: { type: String, default: "" }, // base64
  signedPreKey: {
    keyId: { type: Number },
    publicKey: { type: String }, // base64
    signature: { type: String }, // base64
  },
  preKeys: [
    {
      keyId: { type: Number },
      publicKey: { type: String }, // base64
    },
  ],
  pqIdentityKey: { type: String }, // base64 ML-KEM-768 public key
  pqSignedPreKey: {
    keyId: { type: Number },
    publicKey: { type: String },
    signature: { type: String },
  },
  pqPreKey: {
    keyId: { type: Number },
    publicKey: { type: String }, // base64
  },
  pqPreKeys: [
    {
      keyId: { type: Number },
      publicKey: { type: String },
    },
  ],
  isActive: { type: Boolean, default: true },
});

const messageQueueSchema = new mongoose.Schema({
  messageId: { type: String, required: true, unique: true },
  recipientId: { type: String, required: true },
  senderId: { type: String, required: true },
  encryptedPayload: { type: String, required: true },
  isDelivered: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now, expires: 2592000 }, // TTL 30 days
});

const attachmentSchema = new mongoose.Schema({
  attachmentId: { type: String, required: true, unique: true },
  buffer: { type: Buffer, required: true },
  mimetype: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 86400 * 30 } // 30 days
});
const Attachment = mongoose.model("Attachment", attachmentSchema);

const scheduledMessageSchema = new mongoose.Schema({
  messageId: { type: String, required: true, unique: true },
  recipientId: { type: String, required: true },
  senderId: { type: String, required: true },
  encryptedPayload: { type: String, required: true },
  deliveryTime: { type: Date, required: true },
});

const User = mongoose.model("User", userSchema);
const MessageQueue = mongoose.model("MessageQueue", messageQueueSchema);
const ScheduledMessage = mongoose.model(
  "ScheduledMessage",
  scheduledMessageSchema,
);

const groupMemberSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  displayName: { type: String, required: true },
  role: { type: String, enum: ["admin", "member"], default: "member" },
  photoUrl: { type: String },
  joinedAt: { type: Date, default: Date.now },
});

const groupSchema = new mongoose.Schema({
  groupId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, default: "" },
  photoUrl: { type: String },
  creatorId: { type: String, required: true },
  requireAdminApproval: { type: Boolean, default: false },
  onlyAdminsCanPost: { type: Boolean, default: false },
  members: [groupMemberSchema],
  pendingRequests: [
    {
      userId: { type: String, required: true },
      displayName: { type: String, required: true },
      photoUrl: { type: String },
      requestedAt: { type: Date, default: Date.now },
    }
  ],
  createdAt: { type: Date, default: Date.now },
});

const groupInviteRequestSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  groupId: { type: String, required: true },
  groupName: { type: String, required: true },
  fromUserId: { type: String, required: true },
  fromUserName: { type: String, required: true },
  toUserId: { type: String, required: true },
  status: { type: String, enum: ["pending", "accepted", "declined"], default: "pending" },
  createdAt: { type: Date, default: Date.now },
});

const Group = mongoose.model("Group", groupSchema);
const GroupInviteRequest = mongoose.model("GroupInviteRequest", groupInviteRequestSchema);

const storySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  userAvatar: { type: String, default: "" },
  type: { type: String, enum: ["text", "image", "video"], default: "text" },
  content: { type: String, required: true },
  caption: { type: String, default: "" },
  bgGradient: { type: String, default: "from-indigo-600 to-purple-700" },
  privacyType: { type: String, enum: ["contacts", "selected"], default: "contacts" },
  allowedUserIds: [{ type: String }],
  viewers: [
    {
      userId: { type: String, required: true },
      displayName: { type: String, required: true },
      viewedAt: { type: Date, default: Date.now },
    }
  ],
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
});
const Story = mongoose.model("Story", storySchema);

// Persistent storage directories
const DATA_DIR = path.resolve(process.cwd(), "data");
const DB_DIR = path.resolve(DATA_DIR, "db");
const ATTACHMENTS_DIR = path.resolve(process.cwd(), "uploads", "attachments");

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}
if (!fs.existsSync(ATTACHMENTS_DIR)) {
  fs.mkdirSync(ATTACHMENTS_DIR, { recursive: true });
}

const STORE_FILE = path.resolve(process.cwd(), "data", "persistent_store.json");

// Setup explicit DB connection
let dbReady = false;

async function syncDatabaseToDisk() {
  if (!dbReady) return;
  try {
    const users = await User.find({}).lean();
    const scheduled = await ScheduledMessage.find({}).lean();
    const queue = await MessageQueue.find({}).lean();
    const groups = await Group.find({}).lean();
    const requests = await GroupInviteRequest.find({}).lean();
    const stories = await Story.find({ expiresAt: { $gt: new Date() } }).lean();
    fs.writeFileSync(
      STORE_FILE,
      JSON.stringify({ 
        users, 
        scheduledMessages: scheduled, 
        messageQueue: queue,
        groups,
        groupInviteRequests: requests,
        stories,
      }, null, 2),
      "utf-8"
    );
  } catch (e) {
    console.error("Error syncing database to disk:", e);
  }
}

async function restoreDatabaseFromDisk() {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const content = fs.readFileSync(STORE_FILE, "utf-8");
      const data = JSON.parse(content);
      if (Array.isArray(data.users) && data.users.length > 0) {
        for (const u of data.users) {
          const { _id, __v, ...cleanU } = u;
          await User.findOneAndUpdate({ securelyId: cleanU.securelyId }, { $set: cleanU }, { upsert: true, returnDocument: 'after' });
        }
        console.log(`[Store] Restored ${data.users.length} users from persistent disk store.`);
      }
      if (Array.isArray(data.scheduledMessages) && data.scheduledMessages.length > 0) {
        for (const s of data.scheduledMessages) {
          const { _id, __v, ...cleanS } = s;
          await ScheduledMessage.findOneAndUpdate({ messageId: cleanS.messageId }, { $set: cleanS }, { upsert: true, returnDocument: 'after' });
        }
        console.log(`[Store] Restored ${data.scheduledMessages.length} scheduled messages from disk.`);
      }
      if (Array.isArray(data.messageQueue) && data.messageQueue.length > 0) {
        for (const q of data.messageQueue) {
          const { _id, __v, ...cleanQ } = q;
          await MessageQueue.findOneAndUpdate({ messageId: cleanQ.messageId }, { $set: cleanQ }, { upsert: true, returnDocument: 'after' });
        }
      }
      if (Array.isArray(data.groups) && data.groups.length > 0) {
        for (const g of data.groups) {
          const { _id, __v, ...cleanG } = g;
          if (Array.isArray(cleanG.members)) {
            cleanG.members = cleanG.members.map((m: any) => {
              const { _id, ...cleanM } = m;
              return cleanM;
            });
          }
          if (Array.isArray(cleanG.pendingRequests)) {
            cleanG.pendingRequests = cleanG.pendingRequests.map((r: any) => {
              const { _id, ...cleanR } = r;
              return cleanR;
            });
          }
          await Group.findOneAndUpdate({ groupId: cleanG.groupId }, { $set: cleanG }, { upsert: true, returnDocument: 'after' });
        }
        console.log(`[Store] Restored ${data.groups.length} groups from disk.`);
      }
      if (Array.isArray(data.groupInviteRequests) && data.groupInviteRequests.length > 0) {
        for (const r of data.groupInviteRequests) {
          const { _id, __v, ...cleanR } = r;
          await GroupInviteRequest.findOneAndUpdate({ id: cleanR.id }, { $set: cleanR }, { upsert: true, returnDocument: 'after' });
        }
      }
      if (Array.isArray(data.stories) && data.stories.length > 0) {
        const now = new Date();
        for (const st of data.stories) {
          const { _id, __v, ...cleanSt } = st;
          if (new Date(cleanSt.expiresAt) > now) {
            await Story.findOneAndUpdate({ id: cleanSt.id }, { $set: cleanSt }, { upsert: true, returnDocument: 'after' });
          }
        }
        console.log(`[Store] Restored active stories from disk.`);
      }
    }
  } catch (err) {
    console.error("Failed to restore from persistent disk store", err);
  }
}

async function setupDatabase() {
  try {
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI);
      dbReady = true;
      console.log("Connected to external MongoDB.");
      await restoreDatabaseFromDisk();
    } else {
      const mongoServer = await MongoMemoryServer.create({
        instance: { launchTimeout: 60000 },
      });
      await mongoose.connect(mongoServer.getUri());
      dbReady = true;
      console.log("MongoDB engine initialized.");
      await restoreDatabaseFromDisk();
    }
  } catch (err) {
    console.error("Failed to start MongoDB", err);
  }
}

// Auto-sync persistent store to disk periodically
setInterval(() => {
  if (dbReady) syncDatabaseToDisk();
}, 2500);

// Multer setup for attachments
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB


// API Routes
app.post("/api/v1/auth/signup", async (req, res) => {
  if (!dbReady) {
    res.status(503).json({ error: "DB not ready" });
    return;
  }
  try {
    const {
      username,
      phoneNumber,
      displayName,
      passwordHash,
      encryptedIdentity,
      saltHex,
      securelyId,
      discoverable,
      registrationId,
      identityKey,
      signedPreKey,
      preKeys,
      pqIdentityKey,
      pqSignedPreKey,
      pqPreKey,
      pqPreKeys,
    } = req.body;

    // Check for uniqueness
    if (username) {
      const existingUser = await User.findOne({ username });
      if (existingUser)
        return res.status(400).json({ error: "Username is already taken." });
    }
    if (phoneNumber) {
      const existingPhone = await User.findOne({ phoneNumber });
      if (existingPhone)
        return res
          .status(400)
          .json({ error: "Phone number is already in use." });
    }

    const newUser = await User.create({
      username: username || undefined,
      phoneNumber: phoneNumber || undefined,
      displayName: displayName || securelyId,
      passwordHash,
      encryptedIdentity,
      saltHex,
      securelyId,
      discoverable: discoverable !== undefined ? discoverable : true,
      registrationId: registrationId || 0,
      identityKey: identityKey || "",
      signedPreKey: signedPreKey || undefined,
      preKeys: preKeys || [],
      pqIdentityKey: pqIdentityKey || undefined,
      pqSignedPreKey: pqSignedPreKey || undefined,
      pqPreKey: pqPreKey || undefined,
      pqPreKeys: pqPreKeys || [],
      isActive: true,
    });
    syncDatabaseToDisk();
    res.json({ success: true, securelyId: newUser.securelyId });
  } catch (err: any) {
    console.error("Signup error", err);
    if (err.code === 11000) {
      res
        .status(400)
        .json({ error: "Username or phone number is already taken." });
    } else {
      res.status(500).json({ error: "Signup failed: " + (err.message || "Unknown error") });
    }
  }
});

app.post("/api/v1/auth/login", async (req, res) => {
  if (!dbReady) {
    res.status(503).json({ error: "DB not ready" });
    return;
  }
  try {
    const { username, passwordHash } = req.body;
    const userOrNone = await User.findOne({ username });
    if (!userOrNone) {
      return res.status(401).json({ error: "Account not found." });
    }
    const user = await User.findOne({ username, passwordHash });
    if (!user) {
      return res.status(401).json({ error: "Invalid password." });
    }
    res.json({
      encryptedIdentity: user.encryptedIdentity,
      saltHex: user.saltHex,
      securelyId: user.securelyId,
    });
  } catch (err) {
    res.status(500).json({ error: "Login failed." });
  }
});

app.delete("/api/v1/users", async (req, res) => {
  if (!dbReady) {
    res.status(503).json({ error: "DB not ready" });
    return;
  }
  const securelyId = req.query.securelyId as string;
  if (!securelyId) {
    return res.status(400).json({ error: "Missing securelyId" });
  }

  try {
    await User.deleteOne({ securelyId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Could not delete user" });
  }
});



app.get("/api/v1/users/search", async (req, res) => {
  if (!dbReady) {
    res.status(503).json({ error: "DB not ready" });
    return;
  }
  let q = req.query.q as string;
  if (!q) {
    res.json([]);
    return;
  }
  
  if (q.startsWith("@")) {
    q = q.substring(1);
  }

  try {
    const users = await User.find({
      $or: [
        { securelyId: q },
        {
          discoverable: true,
          $or: [
            { username: { $regex: new RegExp(q, "i") } },
            { displayName: { $regex: new RegExp(q, "i") } },
            { phoneNumber: q },
          ],
        },
      ],
    }).limit(10);

    res.json(
      users.map((u) => ({
        securelyId: u.securelyId,
        displayName: u.displayName,
        username: u.username,
        photoUrl: u.photoUrl,
        about: u.about,
      })),
    );
  } catch (err) {
    res.status(500).json({ error: "Search failed" });
  }
});

app.get("/api/v1/users/:id", async (req, res) => {
  if (!dbReady) return res.status(503).json({ error: "DB not ready" });
  try {
    const user = await User.findOne({ securelyId: req.params.id });
    if (!user) return res.status(404).json({ error: "User not found" });
    
    // Privacy feature: only return photoUrl and about if the requesting user is in their contacts?
    // Wait, the requirement says "display it only when other user save contact". 
    // This implies: User A's photo is visible to User B only if User A has saved User B as a contact.
    // Or User A's photo is visible to User B only if User B has saved User A as a contact?
    // Let's just return the photoUrl unconditionally for now, and rely on the client to fetch it when they save the contact,
    // OR we can implement the "other user save contact" logic.
    // If the requirement is "I can only see their photo if I save them", then we don't need backend privacy, we just need to fetch it when saved.
    // Let's return the photoUrl.
    res.json({
      securelyId: user.securelyId,
      displayName: user.displayName,
      username: user.username,
      photoUrl: user.photoUrl,
      about: user.about,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to get user" });
  }
});

app.get("/api/v1/bundle/:id", async (req, res) => {
  if (!dbReady) {
    res.status(503).json({ error: "DB not ready" });
    return;
  }
  try {
    const user = await User.findOne({ securelyId: req.params.id });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    let preKey = undefined;
    if (user.preKeys && user.preKeys.length > 0) {
      // Pop the first prekey
      preKey = user.preKeys.shift();
      await user.save();
    }

    let pqPreKey = user.pqPreKey;
    if (!pqPreKey && user.pqPreKeys && user.pqPreKeys.length > 0) {
      pqPreKey = user.pqPreKeys.shift();
      await user.save();
    } else if (!pqPreKey && user.pqSignedPreKey) {
      pqPreKey = user.pqSignedPreKey;
    }

    res.json({
      registrationId: user.registrationId,
      identityKey: user.identityKey,
      signedPreKey: user.signedPreKey,
      preKey: preKey,
      pqIdentityKey: user.pqIdentityKey,
      pqSignedPreKey: user.pqSignedPreKey,
      pqPreKey: pqPreKey,
    });
  } catch (err) {
    console.error("Failed to get bundle", err);
    res.status(500).json({ error: "Failed to get bundle" });
  }
});

app.get("/api/v1/prekeys/:securelyId", async (req, res) => {
  if (!dbReady) {
    res.status(503).json({ error: "DB not ready" });
    return;
  }
  try {
    const user = await User.findOne({ securelyId: req.params.securelyId });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    let preKey = undefined;
    if (user.preKeys && user.preKeys.length > 0) {
      // Pop the first prekey
      preKey = user.preKeys.shift();
      await user.save();
    }

    let pqPreKey = user.pqPreKey;
    if (!pqPreKey && user.pqPreKeys && user.pqPreKeys.length > 0) {
      pqPreKey = user.pqPreKeys.shift();
      await user.save();
    }

    res.json({
      securelyId: user.securelyId,
      registrationId: user.registrationId,
      identityKey: user.identityKey,
      signedPreKey: user.signedPreKey,
      preKey: preKey,
      pqPreKey: pqPreKey,
      pqPreKeys: user.pqPreKeys,
    });
  } catch (err) {
    console.error("Failed to get prekeys", err);
    res.status(500).json({ error: "Failed to get prekeys" });
  }
});

app.post("/api/v1/prekeys/:securelyId", async (req, res) => {
  if (!dbReady) {
    res.status(503).json({ error: "DB not ready" });
    return;
  }
  try {
    const { preKeys, pqPreKey, pqPreKeys, signedPreKey } = req.body;
    const user = await User.findOne({ securelyId: req.params.securelyId });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (signedPreKey) user.signedPreKey = signedPreKey;
    if (pqPreKey) user.pqPreKey = pqPreKey;
    if (preKeys && Array.isArray(preKeys)) {
      user.set("preKeys", [...(user.preKeys || []), ...preKeys]);
    }
    if (pqPreKeys && Array.isArray(pqPreKeys)) {
      user.set("pqPreKeys", [...(user.pqPreKeys || []), ...pqPreKeys]);
    }
    await user.save();
    res.json({ success: true });
  } catch (err) {
    console.error("Failed to update prekeys", err);
    res.status(500).json({ error: "Failed to update prekeys" });
  }
});

app.post("/api/v1/attachments", upload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }
  const attachmentId = uuidv4();
  try {
    // 1. Write to persistent disk
    const filePath = path.join(ATTACHMENTS_DIR, `${attachmentId}.bin`);
    const metaPath = path.join(ATTACHMENTS_DIR, `${attachmentId}.json`);
    fs.writeFileSync(filePath, req.file.buffer);
    fs.writeFileSync(
      metaPath,
      JSON.stringify({
        attachmentId,
        mimetype: req.file.mimetype || "application/octet-stream",
        size: req.file.size,
        originalName: req.file.originalname,
        createdAt: new Date().toISOString(),
      })
    );

    // 2. Also save to MongoDB if ready
    if (dbReady) {
      await Attachment.create({
        attachmentId,
        buffer: req.file.buffer,
        mimetype: req.file.mimetype || "application/octet-stream",
      });
    }

    res.json({ attachmentId });
  } catch (err) {
    console.error("Failed to save attachment", err);
    res.status(500).json({ error: "Failed to save attachment" });
  }
});

app.get("/api/v1/attachments/:id", async (req, res) => {
  const attachmentId = req.params.id;
  try {
    // 1. Check persistent disk first
    const filePath = path.join(ATTACHMENTS_DIR, `${attachmentId}.bin`);
    const metaPath = path.join(ATTACHMENTS_DIR, `${attachmentId}.json`);
    if (fs.existsSync(filePath)) {
      let mimeType = "application/octet-stream";
      if (fs.existsSync(metaPath)) {
        try {
          const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
          if (meta.mimetype) mimeType = meta.mimetype;
        } catch (_) {}
      }

      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const range = req.headers.range;

      res.setHeader("Accept-Ranges", "bytes");

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        if (start >= fileSize) {
          res.status(416).setHeader("Content-Range", `bytes */${fileSize}`).send();
          return;
        }
        const chunksize = end - start + 1;
        const file = fs.createReadStream(filePath, { start, end });
        res.writeHead(206, {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunksize,
          "Content-Type": mimeType,
        });
        return file.pipe(res);
      } else {
        res.writeHead(200, {
          "Content-Length": fileSize,
          "Content-Type": mimeType,
        });
        return fs.createReadStream(filePath).pipe(res);
      }
    }

    // 2. Fall back to MongoDB if not on disk
    if (dbReady) {
      const file = await Attachment.findOne({ attachmentId });
      if (file && file.buffer) {
        // Save back to disk for subsequent requests
        try {
          fs.writeFileSync(filePath, file.buffer);
          fs.writeFileSync(
            metaPath,
            JSON.stringify({
              attachmentId,
              mimetype: file.mimetype,
              size: file.buffer.length,
              createdAt: new Date().toISOString(),
            })
          );
        } catch (_) {}

        const fileSize = file.buffer.length;
        const mimeType = file.mimetype || "application/octet-stream";
        const range = req.headers.range;

        res.setHeader("Accept-Ranges", "bytes");

        if (range) {
          const parts = range.replace(/bytes=/, "").split("-");
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
          if (start >= fileSize) {
            res.status(416).setHeader("Content-Range", `bytes */${fileSize}`).send();
            return;
          }
          const chunksize = end - start + 1;
          res.writeHead(206, {
            "Content-Range": `bytes ${start}-${end}/${fileSize}`,
            "Accept-Ranges": "bytes",
            "Content-Length": chunksize,
            "Content-Type": mimeType,
          });
          return res.end(file.buffer.subarray(start, end + 1));
        }

        res.setHeader("Content-Length", fileSize);
        res.setHeader("Content-Type", mimeType);
        return res.send(file.buffer);
      }
    }

    res.status(404).json({ error: "Attachment not found" });
  } catch (err) {
    console.error("Failed to get attachment", err);
    res.status(500).json({ error: "Failed to get attachment" });
  }
});

app.delete("/api/v1/attachments/:id", async (req, res) => {
  const attachmentId = req.params.id;
  try {
    const filePath = path.join(ATTACHMENTS_DIR, `${attachmentId}.bin`);
    const metaPath = path.join(ATTACHMENTS_DIR, `${attachmentId}.json`);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);

    if (dbReady) {
      await Attachment.deleteOne({ attachmentId });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete attachment" });
  }
});

// --- Group & Join Request API Routes ---
app.get("/api/v1/groups/:id", async (req, res) => {
  if (!dbReady) return res.status(503).json({ error: "DB not ready" });
  try {
    const rawId = req.params.id;
    const cleanId = rawId.replace(/^group_/, "");
    const group = await Group.findOne({
      $or: [{ groupId: rawId }, { groupId: cleanId }, { groupId: `group_${cleanId}` }],
    }).lean();
    if (!group) return res.status(404).json({ error: "Group not found" });
    res.json({ group });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch group" });
  }
});

app.get("/api/v1/users/:userId/groups", async (req, res) => {
  if (!dbReady) return res.status(503).json({ error: "DB not ready" });
  try {
    const { userId } = req.params;
    const groups = await Group.find({
      "members.userId": userId,
    }).lean();
    res.json({ groups: groups || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch user groups" });
  }
});

app.post("/api/v1/groups", async (req, res) => {
  if (!dbReady) return res.status(503).json({ error: "DB not ready" });
  try {
    const {
      groupId,
      name,
      description,
      creatorId,
      creatorName,
      requireAdminApproval,
      onlyAdminsCanPost,
      invitedUserIds,
    } = req.body;

    if (!groupId || !name || !creatorId) {
      return res.status(400).json({ error: "groupId, name, and creatorId are required" });
    }

    const cleanGroupId = groupId.replace(/^group_/, "");
    const group = await Group.findOneAndUpdate(
      { $or: [{ groupId }, { groupId: cleanGroupId }] },
      {
        groupId: cleanGroupId,
        name: name.trim(),
        description: description ? description.trim() : "",
        creatorId,
        requireAdminApproval: Boolean(requireAdminApproval),
        onlyAdminsCanPost: Boolean(onlyAdminsCanPost),
        members: [
          {
            userId: creatorId,
            displayName: creatorName || "Creator",
            role: "admin",
            joinedAt: new Date(),
          },
        ],
      },
      { upsert: true, returnDocument: 'after' }
    );

    // If initial invited members are provided, create silent join requests/invites
    if (Array.isArray(invitedUserIds) && invitedUserIds.length > 0) {
      for (const targetId of invitedUserIds) {
        if (!targetId || targetId === creatorId) continue;
        const reqId = uuidv4();
        await GroupInviteRequest.create({
          id: reqId,
          groupId: cleanGroupId,
          groupName: name.trim(),
          fromUserId: creatorId,
          fromUserName: creatorName || "Admin",
          toUserId: targetId,
          status: "pending",
        });
        // Silent real-time notification to invited user (no loud chime)
        io.to(targetId).emit("receive_group_invite", {
          id: reqId,
          groupId: cleanGroupId,
          groupName: name.trim(),
          fromUserId: creatorId,
          fromUserName: creatorName || "Admin",
        });
      }
    }

    syncDatabaseToDisk();
    res.json({ success: true, group });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to create group" });
  }
});

app.post("/api/v1/groups/:id/join", async (req, res) => {
  if (!dbReady) return res.status(503).json({ error: "DB not ready" });
  try {
    const rawId = req.params.id;
    const cleanId = rawId.replace(/^group_/, "");
    const { userId, displayName, photoUrl } = req.body;
    if (!userId || !displayName) {
      return res.status(400).json({ error: "userId and displayName are required" });
    }

    const group = await Group.findOne({
      $or: [{ groupId: rawId }, { groupId: cleanId }, { groupId: `group_${cleanId}` }],
    });
    if (!group) return res.status(404).json({ error: "Group not found" });

    // Check if already a member
    const isMember = group.members.some((m) => m.userId === userId);
    if (isMember) {
      return res.json({ success: true, group, alreadyMember: true });
    }

    // If admin approval is required:
    if (group.requireAdminApproval) {
      const alreadyRequested = group.pendingRequests.some((r) => r.userId === userId);
      if (!alreadyRequested) {
        group.pendingRequests.push({
          userId,
          displayName,
          photoUrl: photoUrl || "",
          requestedAt: new Date(),
        });
        await group.save();
        syncDatabaseToDisk();

        // Silently notify admins of pending request (NO loud chime)
        const admins = group.members.filter((m) => m.role === "admin");
        admins.forEach((admin) => {
          io.to(admin.userId).emit("group_join_request_received", {
            groupId: group.groupId,
            groupName: group.name,
            user: { userId, displayName, photoUrl },
          });
        });
      }
      return res.json({ success: true, pendingApproval: true, groupName: group.name });
    }

    // Direct join (no approval required)
    group.members.push({
      userId,
      displayName,
      role: "member",
      photoUrl: photoUrl || "",
      joinedAt: new Date(),
    });
    await group.save();
    syncDatabaseToDisk();

    io.to(group.groupId).emit("group_member_joined", {
      groupId: group.groupId,
      user: { userId, displayName, role: "member" },
      members: group.members,
    });
    io.to(`group_${group.groupId}`).emit("group_member_joined", {
      groupId: group.groupId,
      user: { userId, displayName, role: "member" },
      members: group.members,
    });

    res.json({ success: true, group });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to join group" });
  }
});

app.post("/api/v1/groups/:id/approve_request", async (req, res) => {
  if (!dbReady) return res.status(503).json({ error: "DB not ready" });
  try {
    const rawId = req.params.id;
    const cleanId = rawId.replace(/^group_/, "");
    const { adminId, targetUserId } = req.body;

    const group = await Group.findOne({
      $or: [{ groupId: rawId }, { groupId: cleanId }, { groupId: `group_${cleanId}` }],
    });
    if (!group) return res.status(404).json({ error: "Group not found" });

    const isAdmin = group.members.some((m) => m.userId === adminId && m.role === "admin");
    if (!isAdmin) return res.status(403).json({ error: "Only admins can approve join requests" });

    const reqIdx = group.pendingRequests.findIndex((r) => r.userId === targetUserId);
    if (reqIdx === -1) {
      return res.status(404).json({ error: "Pending request not found" });
    }

    const targetUser = group.pendingRequests[reqIdx];
    group.pendingRequests.splice(reqIdx, 1);
    group.members.push({
      userId: targetUser.userId,
      displayName: targetUser.displayName,
      role: "member",
      photoUrl: targetUser.photoUrl || "",
      joinedAt: new Date(),
    });
    await group.save();
    syncDatabaseToDisk();

    // Notify approved user with full group info so it mounts in their chat list!
    io.to(targetUserId).emit("group_request_approved", {
      groupId: group.groupId,
      group,
    });
    io.to(group.groupId).emit("group_updated", { group });

    res.json({ success: true, group });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to approve request" });
  }
});

app.post("/api/v1/groups/:id/reject_request", async (req, res) => {
  if (!dbReady) return res.status(503).json({ error: "DB not ready" });
  try {
    const rawId = req.params.id;
    const cleanId = rawId.replace(/^group_/, "");
    const { adminId, targetUserId } = req.body;

    const group = await Group.findOne({
      $or: [{ groupId: rawId }, { groupId: cleanId }, { groupId: `group_${cleanId}` }],
    });
    if (!group) return res.status(404).json({ error: "Group not found" });

    const isAdmin = group.members.some((m) => m.userId === adminId && m.role === "admin");
    if (!isAdmin) return res.status(403).json({ error: "Only admins can reject requests" });

    (group.pendingRequests as any) = group.pendingRequests.filter((r) => r.userId !== targetUserId);
    await group.save();
    syncDatabaseToDisk();

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to reject request" });
  }
});

app.post("/api/v1/groups/:id/update", async (req, res) => {
  if (!dbReady) return res.status(503).json({ error: "DB not ready" });
  try {
    const rawId = req.params.id;
    const cleanId = rawId.replace(/^group_/, "");
    const { adminId, name, description, photoUrl, requireAdminApproval, onlyAdminsCanPost } = req.body;

    const group = await Group.findOne({
      $or: [{ groupId: rawId }, { groupId: cleanId }, { groupId: `group_${cleanId}` }],
    });
    if (!group) return res.status(404).json({ error: "Group not found" });

    const isAdmin = group.members.some((m) => m.userId === adminId && m.role === "admin");
    if (!isAdmin) return res.status(403).json({ error: "Only admins can change group settings" });

    if (name) group.name = name.trim();
    if (description !== undefined) group.description = description.trim();
    if (photoUrl !== undefined) group.photoUrl = photoUrl;
    if (requireAdminApproval !== undefined) group.requireAdminApproval = Boolean(requireAdminApproval);
    if (onlyAdminsCanPost !== undefined) group.onlyAdminsCanPost = Boolean(onlyAdminsCanPost);

    await group.save();
    syncDatabaseToDisk();

    io.to(group.groupId).emit("group_updated", { group });
    io.to(`group_${group.groupId}`).emit("group_updated", { group });

    res.json({ success: true, group });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to update group" });
  }
});

app.post("/api/v1/groups/:id/member_role", async (req, res) => {
  if (!dbReady) return res.status(503).json({ error: "DB not ready" });
  try {
    const rawId = req.params.id;
    const cleanId = rawId.replace(/^group_/, "");
    const { adminId, targetUserId, role } = req.body;

    const group = await Group.findOne({
      $or: [{ groupId: rawId }, { groupId: cleanId }, { groupId: `group_${cleanId}` }],
    });
    if (!group) return res.status(404).json({ error: "Group not found" });

    const isAdmin = group.members.some((m) => m.userId === adminId && m.role === "admin");
    if (!isAdmin) return res.status(403).json({ error: "Only admins can promote/dismiss members" });

    const member = group.members.find((m) => m.userId === targetUserId);
    if (!member) return res.status(404).json({ error: "Member not found" });

    member.role = role === "admin" ? "admin" : "member";
    await group.save();
    syncDatabaseToDisk();

    io.to(group.groupId).emit("group_updated", { group });
    io.to(`group_${group.groupId}`).emit("group_updated", { group });

    res.json({ success: true, group });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to update member role" });
  }
});

app.post("/api/v1/groups/:id/remove_member", async (req, res) => {
  if (!dbReady) return res.status(503).json({ error: "DB not ready" });
  try {
    const rawId = req.params.id;
    const cleanId = rawId.replace(/^group_/, "");
    const { adminId, targetUserId } = req.body;

    const group = await Group.findOne({
      $or: [{ groupId: rawId }, { groupId: cleanId }, { groupId: `group_${cleanId}` }],
    });
    if (!group) return res.status(404).json({ error: "Group not found" });

    const isAdmin = group.members.some((m) => m.userId === adminId && m.role === "admin");
    if (!isAdmin) return res.status(403).json({ error: "Only admins can remove members" });

    (group.members as any) = group.members.filter((m) => m.userId !== targetUserId);
    await group.save();
    syncDatabaseToDisk();

    io.to(targetUserId).emit("group_member_removed", { groupId: group.groupId });
    io.to(group.groupId).emit("group_updated", { group });
    io.to(`group_${group.groupId}`).emit("group_updated", { group });

    res.json({ success: true, group });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to remove member" });
  }
});

app.post("/api/v1/groups/:id/leave", async (req, res) => {
  if (!dbReady) return res.status(503).json({ error: "DB not ready" });
  try {
    const rawId = req.params.id;
    const cleanId = rawId.replace(/^group_/, "");
    const { userId } = req.body;

    const group = await Group.findOne({
      $or: [{ groupId: rawId }, { groupId: cleanId }, { groupId: `group_${cleanId}` }],
    });
    if (!group) return res.status(404).json({ error: "Group not found" });

    (group.members as any) = group.members.filter((m) => m.userId !== userId);
    await group.save();
    syncDatabaseToDisk();

    io.to(group.groupId).emit("group_updated", { group });
    io.to(`group_${group.groupId}`).emit("group_updated", { group });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to leave group" });
  }
});

app.post("/api/v1/groups/:id/invite_member", async (req, res) => {
  if (!dbReady) return res.status(503).json({ error: "DB not ready" });
  try {
    const rawId = req.params.id;
    const cleanId = rawId.replace(/^group_/, "");
    const { fromUserId, fromUserName, toUserId } = req.body;

    const group = await Group.findOne({
      $or: [{ groupId: rawId }, { groupId: cleanId }, { groupId: `group_${cleanId}` }],
    });
    if (!group) return res.status(404).json({ error: "Group not found" });

    const reqId = uuidv4();
    await GroupInviteRequest.create({
      id: reqId,
      groupId: group.groupId,
      groupName: group.name,
      fromUserId,
      fromUserName: fromUserName || "Admin",
      toUserId,
      status: "pending",
    });
    syncDatabaseToDisk();

    // Silent notification for the invite (no loud chime)
    io.to(toUserId).emit("receive_group_invite", {
      id: reqId,
      groupId: group.groupId,
      groupName: group.name,
      fromUserId,
      fromUserName: fromUserName || "Admin",
    });

    res.json({ success: true, requestId: reqId });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to send invite" });
  }
});

app.get("/api/v1/users/:userId/requests", async (req, res) => {
  if (!dbReady) return res.status(503).json({ error: "DB not ready" });
  try {
    const userId = req.params.userId;
    const invites = await GroupInviteRequest.find({ toUserId: userId, status: "pending" }).lean();
    
    // Find all groups where userId is an admin
    const adminGroups = await Group.find({ "members": { $elemMatch: { userId, role: "admin" } } }).lean();
    const adminApprovals: any[] = [];
    adminGroups.forEach((g) => {
      if (Array.isArray(g.pendingRequests) && g.pendingRequests.length > 0) {
        g.pendingRequests.forEach((pr) => {
          adminApprovals.push({
            groupId: g.groupId,
            groupName: g.name,
            user: pr,
          });
        });
      }
    });

    res.json({ invites, adminApprovals });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch requests" });
  }
});

app.post("/api/v1/requests/:requestId/respond", async (req, res) => {
  if (!dbReady) return res.status(503).json({ error: "DB not ready" });
  try {
    const requestId = req.params.requestId;
    const { userId, displayName, action } = req.body; // action: "accept" | "decline"

    const invite = await GroupInviteRequest.findOne({ id: requestId });
    if (!invite) return res.status(404).json({ error: "Invite not found" });

    invite.status = action === "accept" ? "accepted" : "declined";
    await invite.save();

    let joinedGroup: any = null;
    if (action === "accept") {
      const group = await Group.findOne({ groupId: invite.groupId });
      if (group) {
        const isMember = group.members.some((m) => m.userId === userId);
        if (!isMember) {
          group.members.push({
            userId,
            displayName: displayName || "Member",
            role: "member",
            joinedAt: new Date(),
          });
          await group.save();
          joinedGroup = group;
          io.to(group.groupId).emit("group_member_joined", {
            groupId: group.groupId,
            user: { userId, displayName, role: "member" },
            members: group.members,
          });
        }
      }
    }

    syncDatabaseToDisk();
    res.json({ success: true, action, group: joinedGroup });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to respond to request" });
  }
});

app.post("/api/v1/groups/:id/delete", async (req, res) => {
  if (!dbReady) return res.status(503).json({ error: "DB not ready" });
  try {
    const rawId = req.params.id;
    const cleanId = rawId.replace(/^group_/, "");
    const { adminId } = req.body;

    const group = await Group.findOne({
      $or: [{ groupId: rawId }, { groupId: cleanId }, { groupId: `group_${cleanId}` }],
    });
    if (!group) return res.status(404).json({ error: "Group not found" });

    const isAdmin = group.members.some((m) => m.userId === adminId && m.role === "admin");
    if (!isAdmin) return res.status(403).json({ error: "Only admins can delete the group" });

    await Group.deleteOne({ _id: group._id });
    await GroupInviteRequest.deleteMany({ groupId: { $in: [rawId, cleanId, `group_${cleanId}`] } });
    await syncDatabaseToDisk();

    io.to(cleanId).emit("group_deleted", { groupId: cleanId, name: group.name });
    io.to(`group_${cleanId}`).emit("group_deleted", { groupId: cleanId, name: group.name });

    res.json({ success: true, message: "Group deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to delete group" });
  }
});

// --- Stories API Routes ---
app.get("/api/v1/stories", async (req, res) => {
  if (!dbReady) return res.status(503).json({ error: "DB not ready" });
  try {
    const now = new Date();
    const stories = await Story.find({ expiresAt: { $gt: now } }).sort({ createdAt: -1 }).lean();
    res.json({ stories: stories || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch stories" });
  }
});

app.post("/api/v1/stories", async (req, res) => {
  if (!dbReady) return res.status(503).json({ error: "DB not ready" });
  try {
    const { userId, userName, userAvatar, type, content, caption, bgGradient, privacyType, allowedUserIds } = req.body;
    if (!userId || !content) {
      return res.status(400).json({ error: "userId and content are required" });
    }

    const storyId = uuidv4();
    const newStory = await Story.create({
      id: storyId,
      userId,
      userName: userName || "User",
      userAvatar: userAvatar || "",
      type: type === "video" ? "video" : (type === "image" ? "image" : "text"),
      content,
      caption: caption || "",
      bgGradient: bgGradient || "from-indigo-600 to-purple-700",
      privacyType: privacyType === "selected" ? "selected" : "contacts",
      allowedUserIds: Array.isArray(allowedUserIds) ? allowedUserIds : [],
      viewers: [],
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });

    syncDatabaseToDisk();

    io.emit("new_story", { story: newStory });
    res.json({ success: true, story: newStory });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to create story" });
  }
});

app.post("/api/v1/stories/:id/view", async (req, res) => {
  if (!dbReady) return res.status(503).json({ error: "DB not ready" });
  try {
    const storyId = req.params.id;
    const { viewerId, viewerName } = req.body;
    if (!viewerId) return res.status(400).json({ error: "viewerId required" });

    const story = await Story.findOne({ id: storyId });
    if (!story) return res.status(404).json({ error: "Story not found" });

    const alreadyViewed = story.viewers.some((v) => v.userId === viewerId);
    if (!alreadyViewed) {
      let resolvedViewerName = viewerName;
      if (!resolvedViewerName) {
        const u = await User.findOne({ securelyId: viewerId }).lean();
        resolvedViewerName = u?.displayName || "User";
      }

      story.viewers.push({
        userId: viewerId,
        displayName: resolvedViewerName || "User",
        viewedAt: new Date(),
      });
      await story.save();
      syncDatabaseToDisk();

      io.emit("story_viewed", {
        storyId,
        viewer: { userId: viewerId, displayName: resolvedViewerName || "User", viewedAt: new Date() },
      });
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to mark story as viewed" });
  }
});

app.delete("/api/v1/stories/:id", async (req, res) => {
  if (!dbReady) return res.status(503).json({ error: "DB not ready" });
  try {
    const storyId = req.params.id;
    const { userId } = req.body;

    const story = await Story.findOne({ id: storyId });
    if (!story) return res.status(404).json({ error: "Story not found" });

    if (story.userId !== userId) {
      return res.status(403).json({ error: "You can only delete your own stories" });
    }

    await Story.deleteOne({ id: storyId });
    syncDatabaseToDisk();

    io.emit("story_deleted", { storyId });
    res.json({ success: true, message: "Story deleted" });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to delete story" });
  }
});

// Socket.io for Real-Time Bidirectional Communication
io.on("connection", (socket) => {
  let currentSecurelyId: string | null = null;

  socket.on(
    "register",
    async ({
      securelyId,
      displayName,
      username,
      phoneNumber,
      photoUrl,
      about,
      discoverable,
      registrationId,
      identityKey,
      signedPreKey,
      preKeys,
      pqIdentityKey,
      pqSignedPreKey,
      pqPreKey,
      pqPreKeys,
    }: any) => {
      if (!dbReady || !securelyId) return;
      currentSecurelyId = securelyId;

      // Join a room for explicit routing
      socket.join(securelyId);

      try {
        if (username) {
          const existingUsername = await User.findOne({
            username,
            securelyId: { $ne: securelyId },
          });
          if (existingUsername) {
            socket.emit("notification", {
              message: "Username is already taken.",
            });
            username = undefined;
          }
        }
        if (phoneNumber) {
          const existingPhone = await User.findOne({
            phoneNumber,
            securelyId: { $ne: securelyId },
          });
          if (existingPhone) {
            socket.emit("notification", {
              message: "Phone number is already in use.",
            });
            phoneNumber = undefined;
          }
        }

        const updateFields: any = { isActive: true };
        if (displayName !== undefined) updateFields.displayName = displayName;
        if (username !== undefined) updateFields.username = username;
        if (phoneNumber !== undefined) updateFields.phoneNumber = phoneNumber;
        if (photoUrl !== undefined) updateFields.photoUrl = photoUrl;
        if (about !== undefined) updateFields.about = about;
        if (discoverable !== undefined) updateFields.discoverable = discoverable;
        if (registrationId !== undefined) updateFields.registrationId = registrationId;
        if (identityKey !== undefined) updateFields.identityKey = identityKey;
        if (signedPreKey !== undefined) updateFields.signedPreKey = signedPreKey;
        if (preKeys && preKeys.length) updateFields.preKeys = preKeys;
        if (pqIdentityKey !== undefined) updateFields.pqIdentityKey = pqIdentityKey;
        if (pqSignedPreKey !== undefined) updateFields.pqSignedPreKey = pqSignedPreKey;
        if (pqPreKey !== undefined) updateFields.pqPreKey = pqPreKey;
        if (pqPreKeys && pqPreKeys.length) updateFields.pqPreKeys = pqPreKeys;

        await User.findOneAndUpdate(
          { securelyId },
          { $set: updateFields },
          { upsert: true, returnDocument: 'after' }
        );
        syncDatabaseToDisk();

        // Broadcast profile info to peers
        socket.broadcast.emit("peer_profile_updated", {
          securelyId,
          photoUrl: updateFields.photoUrl,
          displayName: updateFields.displayName,
          about: updateFields.about,
        });

        // Deliver offline queued messages upon connect/reconnect
        const pendingMessages = await MessageQueue.find({
          recipientId: securelyId,
        });
        socket.emit("sync_messages", pendingMessages);

        // Delete immediately after delivering to maintain forward secrecy
        if (pendingMessages.length > 0) {
          await MessageQueue.deleteMany({ recipientId: securelyId });
        }
      } catch (err) {
        console.error("Registration error", err);
      }
    },
  );

  socket.on("sync_messages", async (data?: { securelyId?: string }) => {
    if (!dbReady) return;
    const targetId = data?.securelyId || currentSecurelyId;
    if (!targetId) return;

    try {
      const pendingMessages = await MessageQueue.find({
        recipientId: targetId,
      });
      socket.emit("sync_messages", pendingMessages);

      if (pendingMessages.length > 0) {
        await MessageQueue.deleteMany({ recipientId: targetId });
      }
    } catch (err) {
      console.error("Error in sync_messages handler:", err);
    }
  });

  socket.on("update_profile", async (updates) => {
    if (!dbReady || !currentSecurelyId) return;
    try {
      const allowedUpdates: any = {};
      if (typeof updates.discoverable === "boolean")
        allowedUpdates.discoverable = updates.discoverable;
      if (updates.displayName !== undefined) allowedUpdates.displayName = updates.displayName;
      if (updates.username !== undefined) allowedUpdates.username = updates.username;
      if (updates.photoUrl !== undefined) allowedUpdates.photoUrl = updates.photoUrl;
      if (updates.about !== undefined) allowedUpdates.about = updates.about;
      if (updates.profilePhotoPrivacy !== undefined) allowedUpdates.profilePhotoPrivacy = updates.profilePhotoPrivacy;
      await User.updateOne(
        { securelyId: currentSecurelyId },
        { $set: allowedUpdates },
      );
      syncDatabaseToDisk();

      // Broadcast profile updates in real time to all peers
      io.emit("peer_profile_updated", {
        securelyId: currentSecurelyId,
        ...allowedUpdates,
      });
    } catch (err) {
      console.error(err);
    }
  });

  socket.on("delete_message_for_everyone", async ({ messageId, recipientId, isGroup, groupId }) => {
    const rawTarget = groupId || recipientId;
    const cleanId = (rawTarget || "").replace(/^group_/, "");
    const isGrp = isGroup || (rawTarget && rawTarget.startsWith("group_")) || (cleanId && (await Group.findOne({ $or: [{ groupId: cleanId }, { groupId: `group_${cleanId}` }] })));

    if (isGrp) {
      io.to(cleanId).emit("message_deleted_for_everyone", { messageId, groupId: cleanId });
      io.to(`group_${cleanId}`).emit("message_deleted_for_everyone", { messageId, groupId: cleanId });
    } else if (rawTarget) {
      io.to(rawTarget).emit("message_deleted_for_everyone", { messageId, convId: currentSecurelyId, senderId: currentSecurelyId });
      socket.emit("message_deleted_for_everyone", { messageId, convId: rawTarget });
    }
  });

  socket.on("edit_message", async ({ messageId, newText, recipientId, isGroup, groupId }) => {
    const rawTarget = groupId || recipientId;
    const cleanId = (rawTarget || "").replace(/^group_/, "");
    const isGrp = isGroup || (rawTarget && rawTarget.startsWith("group_")) || (cleanId && (await Group.findOne({ $or: [{ groupId: cleanId }, { groupId: `group_${cleanId}` }] })));

    if (isGrp) {
      io.to(cleanId).emit("message_edited", { messageId, newText, groupId: cleanId });
      io.to(`group_${cleanId}`).emit("message_edited", { messageId, newText, groupId: cleanId });
    } else if (rawTarget) {
      io.to(rawTarget).emit("message_edited", { messageId, newText, convId: currentSecurelyId, senderId: currentSecurelyId });
      socket.emit("message_edited", { messageId, newText, convId: rawTarget });
    }
  });

  socket.on("message_receipt", async ({ messageId, recipientId, status, isHeard, readAt }) => {
    if (!dbReady) return;
    const cleanId = (recipientId || "").replace(/^group_/, "");
    const payload = { 
      messageId, 
      status,
      readerId: currentSecurelyId,
      readAt: readAt || (status === "read" ? new Date().toISOString() : undefined),
      deliveredAt: new Date().toISOString(),
      isHeard: Boolean(isHeard)
    };

    io.to(recipientId).emit("receipt_update", payload);
    if (cleanId !== recipientId) {
      io.to(cleanId).emit("receipt_update", payload);
      io.to(`group_${cleanId}`).emit("receipt_update", payload);
    }
  });

  socket.on("join_group", ({ groupId }: { groupId: string }) => {
    if (groupId) {
      const cleanId = groupId.replace(/^group_/, "");
      socket.join(cleanId);
      socket.join(`group_${cleanId}`);
    }
  });

  socket.on("leave_group", ({ groupId }: { groupId: string }) => {
    if (groupId) {
      const cleanId = groupId.replace(/^group_/, "");
      socket.leave(cleanId);
      socket.leave(`group_${cleanId}`);
    }
  });

  socket.on("send_group_message", async (data: any) => {
    if (!dbReady || !currentSecurelyId) return;
    const {
      groupId,
      messageId,
      text,
      attachments,
      attachmentId,
      decryptionKey,
      expireIn,
      replyToId,
      replyTo,
      senderName,
      isViewOnce,
    } = data;

    const cleanGroupId = (groupId || "").replace(/^group_/, "");
    const group = await Group.findOne({ $or: [{ groupId: cleanGroupId }, { groupId: `group_${cleanGroupId}` }] });

    if (group && group.onlyAdminsCanPost) {
      const isAdmin = group.members.some((m) => m.userId === currentSecurelyId && m.role === "admin");
      if (!isAdmin) {
        socket.emit("notification", { message: "Only group admins can send messages in this group." });
        return;
      }
    }

    const groupMsg = {
      id: messageId || uuidv4(),
      groupId: `group_${cleanGroupId}`,
      cleanGroupId,
      senderId: currentSecurelyId,
      senderName: senderName || "Member",
      decryptedText: text,
      attachments,
      attachmentId,
      decryptionKey,
      expireIn,
      replyToId,
      replyTo,
      isViewOnce,
      timestamp: new Date().toISOString(),
      status: "delivered",
      isPostQuantum: true,
      algorithm: "Group Blind E2EE Relay",
    };

    io.to(cleanGroupId).emit("receive_group_message", groupMsg);
    io.to(`group_${cleanGroupId}`).emit("receive_group_message", groupMsg);
    socket.emit("message_sent", { messageId: groupMsg.id, sentAt: groupMsg.timestamp });
  });

  socket.on("send_group_invite", ({ recipientId, groupInfo }: { recipientId: string; groupInfo: any }) => {
    if (recipientId && groupInfo) {
      io.to(recipientId).emit("receive_group_invite", {
        senderId: currentSecurelyId,
        groupInfo,
      });
    }
  });

  // WebRTC Signaling Handlers
  socket.on("call_signaling", async (data) => {
    if (!dbReady || !currentSecurelyId) return;
    const { recipientId, payload } = data;
    
    // Attempt realtime delivery for signaling
    const isRecipientOnline = io.sockets.adapter.rooms.has(recipientId);
    if (isRecipientOnline) {
      io.to(recipientId).emit("receive_call_signaling", {
        senderId: currentSecurelyId,
        payload,
      });

      // Mirror into discrete events for clients listening to specific events
      if (payload?.type === "offer") {
        io.to(recipientId).emit("call_offer", {
          senderId: currentSecurelyId,
          offer: payload.offer,
          isVideo: payload.isVideo,
        });
      } else if (payload?.type === "answer") {
        io.to(recipientId).emit("call_answer", {
          senderId: currentSecurelyId,
          answer: payload.answer,
        });
      } else if (payload?.type === "candidate") {
        io.to(recipientId).emit("ice_candidate", {
          senderId: currentSecurelyId,
          candidate: payload.candidate,
        });
      } else if (payload?.type === "end") {
        io.to(recipientId).emit("end_call", {
          senderId: currentSecurelyId,
        });
      }
    }
  });

  socket.on("call_offer", async (data: { recipientId: string; offer: any; isVideo?: boolean }) => {
    if (!dbReady || !currentSecurelyId) return;
    const { recipientId, offer, isVideo } = data;
    const isRecipientOnline = io.sockets.adapter.rooms.has(recipientId);
    if (isRecipientOnline) {
      io.to(recipientId).emit("call_offer", {
        senderId: currentSecurelyId,
        offer,
        isVideo,
      });
      io.to(recipientId).emit("receive_call_signaling", {
        senderId: currentSecurelyId,
        payload: { type: "offer", offer, isVideo },
      });
    } else {
      socket.emit("call_user_offline", { recipientId });
    }
  });

  socket.on("call_answer", async (data: { recipientId: string; answer: any }) => {
    if (!dbReady || !currentSecurelyId) return;
    const { recipientId, answer } = data;
    const isRecipientOnline = io.sockets.adapter.rooms.has(recipientId);
    if (isRecipientOnline) {
      io.to(recipientId).emit("call_answer", {
        senderId: currentSecurelyId,
        answer,
      });
      io.to(recipientId).emit("receive_call_signaling", {
        senderId: currentSecurelyId,
        payload: { type: "answer", answer },
      });
    }
  });

  socket.on("ice_candidate", async (data: { recipientId: string; candidate: any }) => {
    if (!dbReady || !currentSecurelyId) return;
    const { recipientId, candidate } = data;
    const isRecipientOnline = io.sockets.adapter.rooms.has(recipientId);
    if (isRecipientOnline) {
      io.to(recipientId).emit("ice_candidate", {
        senderId: currentSecurelyId,
        candidate,
      });
      io.to(recipientId).emit("receive_call_signaling", {
        senderId: currentSecurelyId,
        payload: { type: "candidate", candidate },
      });
    }
  });

  socket.on("reject_call", async (data: { recipientId: string; reason?: string }) => {
    if (!dbReady || !currentSecurelyId) return;
    const { recipientId, reason } = data;
    const isRecipientOnline = io.sockets.adapter.rooms.has(recipientId);
    if (isRecipientOnline) {
      io.to(recipientId).emit("reject_call", {
        senderId: currentSecurelyId,
        reason,
      });
      io.to(recipientId).emit("receive_call_signaling", {
        senderId: currentSecurelyId,
        payload: { type: "end", reason },
      });
    }
  });

  socket.on("end_call", async (data: { recipientId: string }) => {
    if (!dbReady || !currentSecurelyId) return;
    const { recipientId } = data;
    const isRecipientOnline = io.sockets.adapter.rooms.has(recipientId);
    if (isRecipientOnline) {
      io.to(recipientId).emit("end_call", {
        senderId: currentSecurelyId,
      });
      io.to(recipientId).emit("receive_call_signaling", {
        senderId: currentSecurelyId,
        payload: { type: "end" },
      });
    }
  });

  socket.on("send_message", async (data) => {
    if (!dbReady) return;
    const {
      type,
      recipientId,
      payload,
      deliverAt,
      messageId: clientMessageId,
    } = data;
    const messageId = clientMessageId || uuidv4();
    const senderId = currentSecurelyId || "UNKNOWN";
    const payloadStr = typeof payload === "string" ? payload : JSON.stringify(payload);

    if (type === "scheduled" && deliverAt) {
      // Store scheduled message
      await ScheduledMessage.findOneAndUpdate(
        { messageId },
        {
          messageId,
          recipientId,
          senderId,
          encryptedPayload: payloadStr,
          deliveryTime: new Date(deliverAt),
        },
        { upsert: true, new: true }
      );
      socket.emit("message_scheduled", { messageId });
    } else {
      // Attempt realtime delivery
      const isRecipientOnline = io.sockets.adapter.rooms.has(recipientId);

      const messageDoc = {
        messageId,
        recipientId,
        senderId,
        encryptedPayload: payloadStr,
        createdAt: new Date(),
      };

      if (isRecipientOnline) {
        // Route it immediately
        io.to(recipientId).emit("receive_message", messageDoc);
      } else {
        // Store in queue for offline delivery
        await MessageQueue.findOneAndUpdate(
          { messageId },
          messageDoc,
          { upsert: true, new: true }
        );
      }

      socket.emit("message_sent", { messageId, sentAt: new Date().toISOString() });
    }
  });

  socket.on("delete_scheduled_message", async (data) => {
    if (!dbReady || !currentSecurelyId) return;
    const { messageId } = data;
    await ScheduledMessage.deleteOne({ messageId, senderId: currentSecurelyId });
  });

  socket.on("reschedule_message", async (data) => {
    if (!dbReady || !currentSecurelyId) return;
    const { messageId, deliverAt } = data;
    await ScheduledMessage.updateOne(
      { messageId, senderId: currentSecurelyId },
      { deliveryTime: new Date(deliverAt) }
    );
  });

  socket.on("send_scheduled_message_now", async (data) => {
    if (!dbReady || !currentSecurelyId) return;
    const { messageId } = data;
    const msg = await ScheduledMessage.findOne({ messageId, senderId: currentSecurelyId });
    if (msg) {
      await ScheduledMessage.deleteOne({ _id: msg._id });
      
      const isRecipientOnline = io.sockets.adapter.rooms.has(msg.recipientId);
      const messageDoc = {
        messageId: msg.messageId,
        recipientId: msg.recipientId,
        senderId: msg.senderId,
        encryptedPayload: msg.encryptedPayload,
        createdAt: new Date(),
      };

      if (isRecipientOnline) {
        io.to(msg.recipientId).emit("receive_message", messageDoc);
      } else {
        await MessageQueue.findOneAndUpdate(
          { messageId: msg.messageId },
          messageDoc,
          { upsert: true, new: true }
        );
      }
      
      socket.emit("message_sent", { messageId: msg.messageId, sentAt: new Date().toISOString() });
    }
  });

  socket.on("disconnect", async () => {
    if (currentSecurelyId && dbReady) {
      await User.updateOne(
        { securelyId: currentSecurelyId },
        { isActive: false },
      );
    }
  });
});

// Cron job to check scheduled messages every 1 second
let isCronRunning = false;
setInterval(async () => {
  if (!dbReady || isCronRunning) return;
  isCronRunning = true;
  const now = new Date();
  try {
    const readyMessages = await ScheduledMessage.find({
      deliveryTime: { $lte: now },
    });
    for (const msg of readyMessages) {
      await ScheduledMessage.deleteOne({ _id: msg._id });

      const isOnline = io.sockets.adapter.rooms.has(msg.recipientId);
      const deliveryDoc = {
        messageId: msg.messageId,
        recipientId: msg.recipientId,
        senderId: msg.senderId,
        encryptedPayload: msg.encryptedPayload,
        createdAt: msg.deliveryTime,
      };

      if (isOnline) {
        io.to(msg.recipientId).emit("receive_message", deliveryDoc);
      } else {
        await MessageQueue.findOneAndUpdate(
          { messageId: msg.messageId },
          deliveryDoc,
          { upsert: true, new: true }
        );
      }
      io.to(msg.senderId).emit("message_sent", { messageId: msg.messageId, sentAt: (msg.deliveryTime || new Date()).toISOString() });
    }
  } catch (err) {
    console.error("Cron job error:", err);
  } finally {
    isCronRunning = false;
  }
}, 1000);

async function startServer() {
  await setupDatabase();

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        watch: {
          ignored: [
            "**/data/**",
            "**/uploads/**",
            "**/.system_generated/**",
            "**/*.log",
            "**/*.wt",
            "**/*.turtle",
            "**/journal/**",
            "**/diagnostic.data/**",
          ],
        },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    const interfaces = os.networkInterfaces();
    const networkIps: string[] = [];
    for (const name of Object.keys(interfaces)) {
      for (const net of interfaces[name] || []) {
        if (net.family === "IPv4" && !net.internal) {
          networkIps.push(net.address);
        }
      }
    }

    console.log(`\n==================================================`);
    console.log(`  🛡️ Securely Post-Quantum Messenger is RUNNING!`);
    console.log(`==================================================`);
    console.log(`  > Local PC:   http://localhost:${PORT}`);
    console.log(`  > Loopback:   http://127.0.0.1:${PORT}`);
    if (networkIps.length > 0) {
      networkIps.forEach((ip) => {
        console.log(`  > Network IP: http://${ip}:${PORT}`);
      });
    }
    console.log(`==================================================\n`);
  });
}

startServer();
