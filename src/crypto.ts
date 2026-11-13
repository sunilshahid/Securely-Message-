import { KeyHelper } from '@privacyresearch/libsignal-protocol-typescript';
import { ml_kem768 } from '@noble/post-quantum/ml-kem.js';
import { PQKeyPair, PQSessionState } from './types';

// SubtleCrypto helper supporting both browser and Node environments
function getSubtle(): SubtleCrypto {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    return window.crypto.subtle;
  }
  if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) {
    return globalThis.crypto.subtle;
  }
  throw new Error('WebCrypto SubtleCrypto not available in this environment');
}

// Convert ArrayBuffer or Uint8Array to Base64 String
export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString('base64');
  }
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert Base64 String to ArrayBuffer
export function base64ToBuffer(base64: string): ArrayBuffer {
  if (typeof Buffer !== 'undefined') {
    const buf = Buffer.from(base64, 'base64');
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  }
  const binary_string = atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  return bufferToBase64(bytes);
}

export function base64ToUint8Array(base64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }
  const binary_string = atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes;
}

export function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const hashArray = Array.from(buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function hexToBuffer(hex: string): ArrayBuffer {
  if (hex.length % 2 !== 0) throw new Error('Invalid hex string');
  const view = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    view[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return view.buffer;
}

export function hexToUint8Array(hex: string): Uint8Array {
  return new Uint8Array(hexToBuffer(hex));
}

// --- Post-Quantum ML-KEM-768 (NIST FIPS 203) Key Generation & KEM Operations ---

export function generatePQKeyPair(): PQKeyPair {
  const { secretKey, publicKey } = ml_kem768.keygen();
  return {
    publicKey: new Uint8Array(publicKey),
    secretKey: new Uint8Array(secretKey),
  };
}

export function pqEncapsulate(recipientPublicKey: Uint8Array): { ciphertext: Uint8Array; sharedSecret: Uint8Array } {
  const { cipherText, sharedSecret } = ml_kem768.encapsulate(recipientPublicKey);
  return {
    ciphertext: new Uint8Array(cipherText),
    sharedSecret: new Uint8Array(sharedSecret),
  };
}

export function pqDecapsulate(ciphertext: Uint8Array, secretKey: Uint8Array): Uint8Array {
  const sharedSecret = ml_kem768.decapsulate(ciphertext, secretKey);
  return new Uint8Array(sharedSecret);
}

/**
 * Hybrid KDF: combines classical shared secret with ML-KEM-768 post-quantum shared secret via HKDF-SHA256
 * Standard Signal PQXDH formulation: PQ_Root_Key = HKDF(classical_key, pq_shared_secret, info)
 */
export async function derivePQHybridKey(
  classicalKey: Uint8Array | ArrayBuffer,
  pqSharedSecret: Uint8Array | ArrayBuffer,
  info: string = 'Signal_PQXDH_ML-KEM-768_v1'
): Promise<Uint8Array> {
  const ikm = classicalKey instanceof Uint8Array ? classicalKey : new Uint8Array(classicalKey);
  const salt = pqSharedSecret instanceof Uint8Array ? pqSharedSecret : new Uint8Array(pqSharedSecret);
  const subtle = getSubtle();

  const keyMaterial = await subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const derivedBits = await subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: salt,
      info: new TextEncoder().encode(info),
    },
    keyMaterial,
    256 // 32 bytes (256 bits)
  );

  return new Uint8Array(derivedBits);
}

// --- Signal Identity Generation with PQ Extensions ---

export async function generateSignalIdentity() {
  const registrationId = KeyHelper.generateRegistrationId();
  const identityKeyPair = await KeyHelper.generateIdentityKeyPair();
  const signedPreKey = await KeyHelper.generateSignedPreKey(identityKeyPair, 1);
  const preKeys = [];
  for (let i = 0; i < 10; i++) {
    preKeys.push(await KeyHelper.generatePreKey(i));
  }

  // Generate Post-Quantum (ML-KEM-768) keys for PQXDH and PQ Double Ratchet
  const pqIdentityKeyPair = generatePQKeyPair();
  const pqSignedPreKey = {
    keyId: 1,
    keyPair: generatePQKeyPair(),
    signature: '',
  };
  const pqPreKeys = [];
  for (let i = 0; i < 10; i++) {
    pqPreKeys.push({
      keyId: i,
      keyPair: generatePQKeyPair(),
    });
  }

  // The Securely ID is the hex encoded public key (to be shareable)
  const securelyId = 'SM' + bufferToHex(identityKeyPair.pubKey);

  return {
    registrationId,
    identityKeyPair,
    signedPreKey,
    preKeys,
    pqIdentityKeyPair,
    pqSignedPreKey,
    pqPreKeys,
    securelyId,
  };
}

// --- Post-Quantum Double Ratchet & Session Management ---

export async function initPQSession(
  peerId: string,
  peerPqPublicKey: Uint8Array,
  peerPqPreKey: Uint8Array,
  classicalSharedKey: Uint8Array | ArrayBuffer
): Promise<{ session: PQSessionState; initialCiphertext: Uint8Array }> {
  // Alice encapsulates to Bob's ML-KEM-768 prekey
  const { ciphertext: initialCiphertext, sharedSecret: pqSharedSecret } = pqEncapsulate(peerPqPreKey);

  // Derive initial hybrid PQ root key
  const rootKey = await derivePQHybridKey(
    classicalSharedKey,
    pqSharedSecret,
    'Signal_PQXDH_ML-KEM-768_v1'
  );

  // Generate local PQ keypair for Bob's ratchet turns
  const localPqKeyPair = generatePQKeyPair();

  const session: PQSessionState = {
    peerId,
    isPostQuantum: true,
    algorithm: 'Signal PQXDH (ML-KEM-768 + X25519)',
    rootKey: uint8ArrayToBase64(rootKey),
    localPqPrivateKey: uint8ArrayToBase64(localPqKeyPair.secretKey),
    localPqPublicKey: uint8ArrayToBase64(localPqKeyPair.publicKey),
    peerPqPublicKey: uint8ArrayToBase64(peerPqPreKey), // Alice encapsulates to Bob's prekey on turn 1
    ratchetStep: 0,
    createdAt: Date.now(),
    lastRatchetAt: Date.now(),
  };

  return { session, initialCiphertext };
}

export async function processInitialPQXDH(
  peerId: string,
  initialCiphertext: Uint8Array,
  localPqPreKeySecret: Uint8Array,
  peerPqPublicKey: Uint8Array,
  classicalSharedKey: Uint8Array | ArrayBuffer,
  peerRatchetKey?: Uint8Array
): Promise<PQSessionState> {
  // Bob decapsulates Alice's initial PQ encapsulation
  const pqSharedSecret = pqDecapsulate(initialCiphertext, localPqPreKeySecret);

  // Derive identical initial hybrid PQ root key
  const rootKey = await derivePQHybridKey(
    classicalSharedKey,
    pqSharedSecret,
    'Signal_PQXDH_ML-KEM-768_v1'
  );

  const session: PQSessionState = {
    peerId,
    isPostQuantum: true,
    algorithm: 'Signal PQXDH (ML-KEM-768 + X25519)',
    rootKey: uint8ArrayToBase64(rootKey),
    localPqPrivateKey: uint8ArrayToBase64(localPqPreKeySecret), // Bob uses this prekey secret to decapsulate turn 1
    localPqPublicKey: '',
    peerPqPublicKey: uint8ArrayToBase64(peerRatchetKey || peerPqPublicKey),
    ratchetStep: 0,
    createdAt: Date.now(),
    lastRatchetAt: Date.now(),
  };

  return session;
}

/**
 * Encrypt a payload with Post-Quantum Double Ratchet KEM turn:
 * 1. Encapsulates against peer's current PQ public key.
 * 2. Advances the root key with KEM shared secret via HKDF.
 * 3. Derives message-level AES-256-GCM key.
 * 4. Generates a fresh ML-KEM key pair so the peer can encapsulate back (Continuous Forward Secrecy & Break-in Recovery).
 */
export async function pqRatchetEncrypt(
  session: PQSessionState,
  plaintextBytes: Uint8Array
): Promise<{
  updatedSession: PQSessionState;
  ciphertext: Uint8Array;
  iv: Uint8Array;
  kemCiphertext: Uint8Array;
  nextRatchetKey: Uint8Array;
}> {
  const peerPqPub = base64ToUint8Array(session.peerPqPublicKey);
  const { ciphertext: kemCiphertext, sharedSecret: pqShared } = pqEncapsulate(peerPqPub);

  const currentRoot = base64ToUint8Array(session.rootKey);
  const nextStep = session.ratchetStep + 1;

  // Step root key
  const newRootKey = await derivePQHybridKey(
    currentRoot,
    pqShared,
    `Signal_PQ_Ratchet_Step_${nextStep}`
  );

  // Derive message key from root key
  const msgKeyBytes = await derivePQHybridKey(
    newRootKey,
    new TextEncoder().encode(`msg_key_${nextStep}`),
    'Signal_PQ_Message_Key_v1'
  );

  const subtle = getSubtle();
  const iv = (typeof window !== 'undefined' ? window.crypto : globalThis.crypto).getRandomValues(new Uint8Array(12));
  const aesKey = await subtle.importKey('raw', msgKeyBytes, { name: 'AES-GCM' }, false, ['encrypt']);
  const cipherBuffer = await subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, plaintextBytes);

  // Generate new local keypair for the next receive turn (break-in recovery)
  const freshLocalKey = generatePQKeyPair();

  const updatedSession: PQSessionState = {
    ...session,
    rootKey: uint8ArrayToBase64(newRootKey),
    localPqPrivateKey: uint8ArrayToBase64(freshLocalKey.secretKey),
    localPqPublicKey: uint8ArrayToBase64(freshLocalKey.publicKey),
    ratchetStep: nextStep,
    lastRatchetAt: Date.now(),
  };

  return {
    updatedSession,
    ciphertext: new Uint8Array(cipherBuffer),
    iv,
    kemCiphertext,
    nextRatchetKey: freshLocalKey.publicKey,
  };
}

/**
 * Decrypt a payload with Post-Quantum Double Ratchet KEM turn:
 * 1. Decapsulates KEM ciphertext using local private key.
 * 2. Advances root key identically via HKDF.
 * 3. Derives message-level AES-256-GCM key.
 * 4. Updates peer's next ratchet public key for subsequent send operations.
 */
export async function pqRatchetDecrypt(
  session: PQSessionState,
  ciphertext: Uint8Array,
  iv: Uint8Array,
  kemCiphertext: Uint8Array,
  nextRatchetKey?: Uint8Array
): Promise<{
  updatedSession: PQSessionState;
  plaintext: Uint8Array;
}> {
  const localSecret = base64ToUint8Array(session.localPqPrivateKey);
  const pqShared = pqDecapsulate(kemCiphertext, localSecret);

  const currentRoot = base64ToUint8Array(session.rootKey);
  const nextStep = session.ratchetStep + 1;

  // Step root key identically
  const newRootKey = await derivePQHybridKey(
    currentRoot,
    pqShared,
    `Signal_PQ_Ratchet_Step_${nextStep}`
  );

  // Derive message key
  const msgKeyBytes = await derivePQHybridKey(
    newRootKey,
    new TextEncoder().encode(`msg_key_${nextStep}`),
    'Signal_PQ_Message_Key_v1'
  );

  const subtle = getSubtle();
  const aesKey = await subtle.importKey('raw', msgKeyBytes, { name: 'AES-GCM' }, false, ['decrypt']);
  const plainBuffer = await subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, ciphertext);

  const updatedSession: PQSessionState = {
    ...session,
    rootKey: uint8ArrayToBase64(newRootKey),
    peerPqPublicKey: nextRatchetKey ? uint8ArrayToBase64(nextRatchetKey) : session.peerPqPublicKey,
    ratchetStep: nextStep,
    lastRatchetAt: Date.now(),
  };

  return {
    updatedSession,
    plaintext: new Uint8Array(plainBuffer),
  };
}

// --- Post-Quantum Safety Numbers / Fingerprint ---

function generateDigitsFromHash(hashBytes: Uint8Array, count: number): string {
  let digits = '';
  for (let i = 0; i < hashBytes.length - 3 && digits.length < count; i += 4) {
    const val = (hashBytes[i] << 24) | (hashBytes[i + 1] << 16) | (hashBytes[i + 2] << 8) | hashBytes[i + 3];
    const num = Math.abs(val) % 100000;
    digits += num.toString().padStart(5, '0');
  }
  return digits.substring(0, count);
}

/**
 * Calculates Signal-standard 60-digit safety numbers combining classical Curve25519 identity keys
 * and NIST ML-KEM-768 post-quantum identity keys.
 * Formatted into twelve 5-digit blocks: XXXXX XXXXX ...
 */
export async function calculateSafetyNumber(
  localId: string,
  localClassicalPub: ArrayBuffer | Uint8Array,
  localPQPub: Uint8Array | null | undefined,
  peerId: string,
  peerClassicalPub: ArrayBuffer | Uint8Array,
  peerPQPub: Uint8Array | null | undefined
): Promise<{
  safetyNumber: string;
  blocks: string[];
  qrCodeData: string;
  isPostQuantum: boolean;
}> {
  const subtle = getSubtle();
  const localClBytes = localClassicalPub instanceof Uint8Array ? localClassicalPub : new Uint8Array(localClassicalPub);
  const peerClBytes = peerClassicalPub instanceof Uint8Array ? peerClassicalPub : new Uint8Array(peerClassicalPub);

  const isPQ = !!(localPQPub && peerPQPub);

  // Deterministically sort the two identities lexicographically
  let firstId = localId;
  let firstCl = localClBytes;
  let firstPq = localPQPub;

  let secondId = peerId;
  let secondCl = peerClBytes;
  let secondPq = peerPQPub;

  if (localId.localeCompare(peerId) > 0) {
    firstId = peerId;
    firstCl = peerClBytes;
    firstPq = peerPQPub;

    secondId = localId;
    secondCl = localClBytes;
    secondPq = localPQPub;
  }

  // Construct combined key buffers
  const enc = new TextEncoder();
  const party1Bytes = new Uint8Array([
    ...enc.encode(firstId),
    ...firstCl,
    ...(firstPq || new Uint8Array(0)),
    ...(isPQ ? enc.encode('ML-KEM-768') : []),
  ]);

  const party2Bytes = new Uint8Array([
    ...enc.encode(secondId),
    ...secondCl,
    ...(secondPq || new Uint8Array(0)),
    ...(isPQ ? enc.encode('ML-KEM-768') : []),
  ]);

  const hash1 = new Uint8Array(await subtle.digest('SHA-256', party1Bytes));
  const hash2 = new Uint8Array(await subtle.digest('SHA-256', party2Bytes));

  const digits1 = generateDigitsFromHash(hash1, 30);
  const digits2 = generateDigitsFromHash(hash2, 30);

  const full60 = digits1 + digits2;
  const blocks: string[] = [];
  for (let i = 0; i < 60; i += 5) {
    blocks.push(full60.substring(i, i + 5));
  }

  const formattedSafetyNumber = blocks.join(' ');
  const qrCodeData = JSON.stringify({
    v: isPQ ? 'signal-pq-v1' : 'signal-v1',
    p1: firstId,
    p2: secondId,
    sn: full60,
    pq: isPQ,
  });

  return {
    safetyNumber: formattedSafetyNumber,
    blocks,
    qrCodeData,
    isPostQuantum: isPQ,
  };
}

// --- File Encryption & Decryption ---

export async function encryptFile(file: File): Promise<{ encryptedBlob: Blob; keyHex: string; mimeType: string }> {
  const subtle = getSubtle();
  const aesKey = await subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  const iv = (typeof window !== 'undefined' ? window.crypto : globalThis.crypto).getRandomValues(new Uint8Array(12));
  const fileBuffer = await file.arrayBuffer();
  const cipherBuffer = await subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    fileBuffer
  );

  const rawKey = await subtle.exportKey('raw', aesKey);
  const keyHex = bufferToHex(iv) + ':' + bufferToHex(rawKey);

  return { encryptedBlob: new Blob([cipherBuffer]), keyHex, mimeType: file.type };
}

export async function decryptFile(encryptedBlob: Blob, keyHex: string, mimeType: string): Promise<Blob> {
  const subtle = getSubtle();
  const [ivHex, rawKeyHex] = keyHex.split(':');
  const iv = hexToBuffer(ivHex);
  const rawKey = hexToBuffer(rawKeyHex);

  const aesKey = await subtle.importKey(
    'raw',
    rawKey,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const cipherBuffer = await encryptedBlob.arrayBuffer();
  const decrypted = await subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(iv) },
    aesKey,
    cipherBuffer
  );

  return new Blob([decrypted], { type: mimeType });
}

// --- Identity Serialization (Export & Import) with Post-Quantum Support ---

export function exportIdentity(identity: any): string {
  const payload: any = {
    registrationId: identity.registrationId,
    securelyId: identity.securelyId,
    displayName: identity.displayName,
    username: identity.username,
    phoneNumber: identity.phoneNumber,
    photoUrl: identity.photoUrl,
    about: identity.about,
    identityKeyPair: {
      pubKey: bufferToBase64(identity.identityKeyPair.pubKey),
      privKey: bufferToBase64(identity.identityKeyPair.privKey),
    },
    signedPreKey: {
      keyId: identity.signedPreKey.keyId,
      keyPair: {
        pubKey: bufferToBase64(identity.signedPreKey.keyPair.pubKey),
        privKey: bufferToBase64(identity.signedPreKey.keyPair.privKey),
      },
      signature: bufferToBase64(identity.signedPreKey.signature),
    },
    preKeys: identity.preKeys.map((pk: any) => ({
      keyId: pk.keyId,
      keyPair: {
        pubKey: bufferToBase64(pk.keyPair.pubKey),
        privKey: bufferToBase64(pk.keyPair.privKey),
      },
    })),
  };

  // Add post-quantum keys if present
  if (identity.pqIdentityKeyPair) {
    payload.pqIdentityKeyPair = {
      pubKey: bufferToBase64(identity.pqIdentityKeyPair.publicKey || identity.pqIdentityKeyPair.pubKey),
      privKey: bufferToBase64(identity.pqIdentityKeyPair.secretKey || identity.pqIdentityKeyPair.privKey),
    };
  }

  if (identity.pqSignedPreKey) {
    payload.pqSignedPreKey = {
      keyId: identity.pqSignedPreKey.keyId,
      keyPair: {
        pubKey: bufferToBase64(identity.pqSignedPreKey.keyPair.publicKey || identity.pqSignedPreKey.keyPair.pubKey),
        privKey: bufferToBase64(identity.pqSignedPreKey.keyPair.secretKey || identity.pqSignedPreKey.keyPair.privKey),
      },
      signature: identity.pqSignedPreKey.signature ? bufferToBase64(identity.pqSignedPreKey.signature) : '',
    };
  }

  if (identity.pqPreKeys && Array.isArray(identity.pqPreKeys)) {
    payload.pqPreKeys = identity.pqPreKeys.map((pk: any) => ({
      keyId: pk.keyId,
      keyPair: {
        pubKey: bufferToBase64(pk.keyPair.publicKey || pk.keyPair.pubKey),
        privKey: bufferToBase64(pk.keyPair.secretKey || pk.keyPair.privKey),
      },
    }));
  }

  return JSON.stringify(payload);
}

export function importIdentity(jsonStr: string): any {
  const exp = JSON.parse(jsonStr);

  const imported: any = {
    registrationId: exp.registrationId,
    securelyId: exp.securelyId,
    displayName: exp.displayName,
    username: exp.username,
    phoneNumber: exp.phoneNumber,
    photoUrl: exp.photoUrl,
    about: exp.about,
    identityKeyPair: {
      pubKey: base64ToBuffer(exp.identityKeyPair.pubKey),
      privKey: base64ToBuffer(exp.identityKeyPair.privKey),
    },
    signedPreKey: {
      keyId: exp.signedPreKey.keyId,
      keyPair: {
        pubKey: base64ToBuffer(exp.signedPreKey.keyPair.pubKey),
        privKey: base64ToBuffer(exp.signedPreKey.keyPair.privKey),
      },
      signature: base64ToBuffer(exp.signedPreKey.signature),
    },
    preKeys: exp.preKeys.map((pk: any) => ({
      keyId: pk.keyId,
      keyPair: {
        pubKey: base64ToBuffer(pk.keyPair.pubKey),
        privKey: base64ToBuffer(pk.keyPair.privKey),
      },
    })),
  };

  // Restore or seamlessly auto-upgrade to post-quantum ML-KEM-768 keys
  if (exp.pqIdentityKeyPair) {
    imported.pqIdentityKeyPair = {
      publicKey: base64ToUint8Array(exp.pqIdentityKeyPair.pubKey),
      secretKey: base64ToUint8Array(exp.pqIdentityKeyPair.privKey),
      pubKey: base64ToUint8Array(exp.pqIdentityKeyPair.pubKey),
      privKey: base64ToUint8Array(exp.pqIdentityKeyPair.privKey),
    };
  } else {
    imported.pqIdentityKeyPair = generatePQKeyPair();
  }

  if (exp.pqSignedPreKey) {
    imported.pqSignedPreKey = {
      keyId: exp.pqSignedPreKey.keyId,
      keyPair: {
        publicKey: base64ToUint8Array(exp.pqSignedPreKey.keyPair.pubKey),
        secretKey: base64ToUint8Array(exp.pqSignedPreKey.keyPair.privKey),
        pubKey: base64ToUint8Array(exp.pqSignedPreKey.keyPair.pubKey),
        privKey: base64ToUint8Array(exp.pqSignedPreKey.keyPair.privKey),
      },
      signature: exp.pqSignedPreKey.signature ? base64ToUint8Array(exp.pqSignedPreKey.signature) : '',
    };
  } else {
    imported.pqSignedPreKey = {
      keyId: 1,
      keyPair: generatePQKeyPair(),
      signature: '',
    };
  }

  if (exp.pqPreKeys && Array.isArray(exp.pqPreKeys)) {
    imported.pqPreKeys = exp.pqPreKeys.map((pk: any) => ({
      keyId: pk.keyId,
      keyPair: {
        publicKey: base64ToUint8Array(pk.keyPair.pubKey),
        secretKey: base64ToUint8Array(pk.keyPair.privKey),
        pubKey: base64ToUint8Array(pk.keyPair.pubKey),
        privKey: base64ToUint8Array(pk.keyPair.privKey),
      },
    }));
  } else {
    imported.pqPreKeys = [];
    for (let i = 0; i < 10; i++) {
      imported.pqPreKeys.push({
        keyId: i,
        keyPair: generatePQKeyPair(),
      });
    }
  }

  return imported;
}

export async function sha256Hex(text: string): Promise<string> {
  const subtle = getSubtle();
  const hashBuffer = await subtle.digest('SHA-256', new TextEncoder().encode(text));
  return bufferToHex(hashBuffer);
}

export async function encryptIdentityWithPassword(identityJson: string, password: string) {
  const subtle = getSubtle();
  const enc = new TextEncoder();
  const keyMaterial = await subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']);
  const salt = (typeof window !== 'undefined' ? window.crypto : globalThis.crypto).getRandomValues(new Uint8Array(16));
  const key = await subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt']
  );
  const iv = (typeof window !== 'undefined' ? window.crypto : globalThis.crypto).getRandomValues(new Uint8Array(12));
  const cipherBuffer = await subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(identityJson));
  return {
    encryptedHex: bufferToHex(iv) + ':' + bufferToHex(cipherBuffer),
    saltHex: bufferToHex(salt),
  };
}

export async function decryptIdentityWithPassword(encryptedHex: string, saltHex: string, password: string) {
  const subtle = getSubtle();
  const enc = new TextEncoder();
  const keyMaterial = await subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']);
  const key = await subtle.deriveKey(
    { name: 'PBKDF2', salt: hexToBuffer(saltHex), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['decrypt']
  );
  const [ivHex, cipherHex] = encryptedHex.split(':');
  const iv = hexToBuffer(ivHex);
  const cipherBuffer = hexToBuffer(cipherHex);
  const decrypted = await subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(iv) }, key, cipherBuffer);
  return new TextDecoder().decode(decrypted);
}
