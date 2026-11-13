# Securely Message 🛡️⚛️

> **Zero-Knowledge, Post-Quantum End-to-End Encrypted Web Messenger**  
> Built with **Signal's PQXDH Protocol**, **NIST FIPS 203 ML-KEM-768**, the **Post-Quantum KEM Double Ratchet**, **WebRTC**, and a **Blind Post-Office** relay server.

---

## ⚡ Overview

**Securely** is a state-of-the-art, browser-native end-to-end encrypted messaging and calling platform designed to withstand both classical and future quantum cryptographic attacks. 

Traditional encrypted messengers rely exclusively on classical elliptic curve cryptography (such as Curve25519 or NIST P-256) for key agreements. While secure today, traffic intercepted and archived today can be retroactively decrypted by quantum computers running Shor's algorithm in the future (**Harvest Now, Decrypt Later** attacks).

Securely solves this by implementing **Signal's Post-Quantum Extended Diffie-Hellman (PQXDH)** specification combined with **NIST FIPS 203 ML-KEM-768** (formerly Kyber-768) and a **Hybrid Post-Quantum Double Ratchet**.

```
+-----------------------------------------------------------------------------------+
|                                CLIENT APPLICATION                                  |
|                                                                                   |
|  [Identity Keys]   [ML-KEM-768 PQ Keys]   [Curve25519 DH Keys]   [AES-256-GCM]    |
|         │                  │                       │                  │           |
|         └───────────┬──────┴───────────────────────┴──────────────────┘           |
|                     ▼                                                             |
|          Signal Hybrid PQXDH Handshake + Post-Quantum KEM Double Ratchet          |
+-----------------------------------------------------------------------------------+
                                      │ (Ciphertext Only)
                                      ▼
+-----------------------------------------------------------------------------------+
|                        BLIND POST-OFFICE RELAY SERVER                             |
|                                                                                   |
|  • Ephemeral Socket.IO Routing       • Encrypted Message Queue                    |
|  • Prekey & PQ-Prekey Distribution   • Zero-Knowledge: Cannot decrypt payloads    |
+-----------------------------------------------------------------------------------+
```

---

## 🔐 Cryptographic Architecture

### 1. Hybrid Post-Quantum Key Agreement (PQXDH)
When two users establish a session, Securely performs a hybrid key exchange combining classical Diffie-Hellman with lattice-based post-quantum cryptography:
- **Classical DH**: X25519 (Curve25519) key agreement for proven classical security.
- **Post-Quantum KEM**: NIST FIPS 203 **ML-KEM-768** (768-bit security level, equivalent to AES-192/256 security strength).
- **Hybrid Combination**: Derives the shared root key via HKDF-SHA256:
  $$\text{RootKey} = \text{HKDF-SHA256}(\text{DH}_{\text{classical}} \mathbin{\Vert} \text{SS}_{\text{ML-KEM-768}}, \text{salt})$$
  *Even if quantum computing breaks the classical DH component, ML-KEM-768 guarantees confidentiality; conversely, if a theoretical vulnerability were found in lattice cryptography, classical DH preserves security.*

### 2. Post-Quantum KEM Double Ratchet
- Every conversation turn ratchets the symmetric cipher state forward.
- Message keys are derived with forward secrecy (past messages cannot be decrypted even if current keys are compromised).
- Ratcheting incorporates fresh ML-KEM-768 key encapsulations on conversational turns to provide **Post-Compromise Security (Break-in Resistance)**.

### 3. Payload Encryption
- Individual messages and media attachments are encrypted locally using **AES-256-GCM** with authenticated data (AEAD) and cryptographically random 96-bit IVs.
- Attachment blobs are decrypted purely in memory using browser `Blob` / `ArrayBuffer` APIs, revoking Object URLs on unmount to prevent memory leaks.

### 4. 60-Digit Post-Quantum Safety Numbers
- Identity verification combines both users' 32-byte classical identity public keys and 1,184-byte ML-KEM-768 post-quantum public keys.
- Formatted into **12 blocks of 5 digits** (60 digits total) and an out-of-band scannable QR code to detect and eliminate Man-in-the-Middle (MITM) attacks.

---

## ✨ Features

- **🛡️ Post-Quantum Protection**: NIST FIPS 203 ML-KEM-768 hybrid ratcheting protects against current and quantum adversaries.
- **📬 Zero-Knowledge Blind Post-Office**: The server functions strictly as an untrusted message relay; it stores only encrypted ciphertexts and deletes delivered messages immediately upon delivery.
- **⏱️ Disappearing Messages**: Ephemeral messaging with custom self-destruct countdowns (30s, 5m, 1h, 24h, 7d) and automatic memory wipes.
- **📅 Client-Encrypted Scheduled Messaging**: Write messages to be delivered at a future timestamp. The payload is encrypted before leaving your browser and stored in an encrypted queue on the server until the trigger time.
- **📞 E2EE Audio & Video Calling**: Peer-to-peer WebRTC voice and video calls with secure ICE/STUN negotiation and camera/microphone controls.
- **📎 Secure Media Sharing**: End-to-end encrypted voice notes, images, videos, and documents.
- **🌙 Obsidian & Indigo Interface**: Dark glassmorphic design featuring responsive tabs, settings dashboard, real-time presence, and QR verification modals.

---

## 📁 Repository Structure

```
Securely-Message/
├── src/
│   ├── components/
│   │   ├── CallScreen.tsx           # WebRTC video/audio calling interface
│   │   ├── CallsTab.tsx            # Call history and incoming/outgoing logs
│   │   ├── ChatLayout.tsx          # Main messaging layout & message stream
│   │   ├── DecryptedAvatar.tsx     # Client-side decrypted user avatars
│   │   ├── DisappearingClock.tsx   # Visual self-destruct timers
│   │   ├── Onboarding.tsx          # Keypair generation & user registration
│   │   ├── SafetyNumberModal.tsx   # 60-digit PQ safety number verification
│   │   ├── ScheduledClock.tsx      # Scheduled message time indicator
│   │   ├── SettingsModal.tsx       # Dark obsidian settings & privacy dashboard
│   │   └── Toast.tsx               # Animated UI toast notifications
│   ├── crypto.ts                   # Core cryptographic engine (ML-KEM-768, PQXDH, ratchets)
│   ├── signalStore.ts              # Signal protocol key and session persistence
│   ├── types.ts                    # TypeScript domain interfaces and message types
│   ├── App.tsx                     # Top-level client orchestration & socket listener
│   └── main.tsx                    # React 19 entry point
├── server.ts                       # Express + Socket.IO blind post-office relay server
├── test_backend_full.cjs           # End-to-end test suite for server endpoints & WebRTC
├── test_offline.cjs                # Offline message queueing test suite
├── test_scheduled.cjs              # Scheduled message delivery test suite
├── Dockerfile                      # Container definition for production deployment
├── docker-compose.yml              # Multi-container orchestration (App + MongoDB)
├── vite.config.ts                  # Vite client build configuration
└── package.json                    # Project dependencies and build scripts
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** `>= 18.0.0` (Node 20+ or 22+ recommended)
- **npm** `>= 9.0.0` (or `bun` / `pnpm`)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/Securely-Message.git
cd Securely-Message
npm install
```

### 2. Configure Environment (Optional)
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default configuration:
```env
PORT=3000
# MONGODB_URI=mongodb://localhost:27017/securely
NODE_ENV=development
```
> **Note**: If `MONGODB_URI` is omitted, Securely automatically starts an embedded in-memory MongoDB server instance (`mongodb-memory-server`), requiring zero external database configuration to run locally!

### 3. Run in Development Mode
```bash
npm run dev
```
Visit `http://localhost:3000` in your browser. Open a secondary incognito window or separate browser to simulate real-time two-way post-quantum messaging between two accounts.

---

## 🧪 Testing & Verification

Securely includes automated test suites covering cryptography, server endpoints, and socket relays:

```bash
# 1. Typecheck the entire codebase
npm run lint

# 2. Run end-to-end backend and WebRTC socket verification
node test_backend_full.cjs

# 3. Test scheduled message delivery
node test_scheduled.cjs

# 4. Test offline message queueing and delivery sync
node test_offline.cjs
```

---

## 📦 Production Build & Deployment

### Production Node Build
```bash
# Builds the Vite frontend bundle and esbuild server bundle
npm run build

# Start the optimized production server
npm start
```

### Docker Deployment
Run Securely with a dedicated MongoDB container via Docker Compose:
```bash
docker-compose up --build -d
```
The application will be live at `http://localhost:3000`.

---

## 🔒 Threat Model & Security Considerations

| Threat | Classical E2EE Messenger | Securely with PQXDH |
| :--- | :--- | :--- |
| **Harvest Now, Decrypt Later (Quantum Computer)** | ❌ **Vulnerable** (Elliptic curves broken by Shor's algorithm) | ✅ **Protected** (Lattice-based ML-KEM-768 cannot be solved efficiently by quantum algorithms) |
| **Server Compromise / Subpoena** | ✅ Plaintext protected | ✅ **Zero-Knowledge** (Server stores zero keys; messages deleted after receipt) |
| **Session Key Leakage** | ✅ Forward secret | ✅ **Forward Secrecy + Post-Compromise Security** via KEM Double Ratchet |
| **Active Man-in-the-Middle (MITM)** | ⚠️ Requires manual classical safety number verification | ✅ **60-digit Post-Quantum Safety Numbers** incorporating ML-KEM-768 public keys |

---

## 📄 License

This project is open-source software licensed under the **MIT License**.
