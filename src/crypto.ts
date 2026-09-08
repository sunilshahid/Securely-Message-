import { KeyHelper } from '@privacyresearch/libsignal-protocol-typescript';

// Convert ArrayBuffer to Base64 String
export function bufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Convert Base64 String to ArrayBuffer
export function base64ToBuffer(base64: string): ArrayBuffer {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

export function bufferToHex(buffer: ArrayBuffer): string {
  const hashArray = Array.from(new Uint8Array(buffer));
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

export async function generateSignalIdentity() {
  const registrationId = KeyHelper.generateRegistrationId();
  const identityKeyPair = await KeyHelper.generateIdentityKeyPair();
  const signedPreKey = await KeyHelper.generateSignedPreKey(identityKeyPair, 1);
  const preKeys = [];
  for (let i = 0; i < 10; i++) {
    preKeys.push(await KeyHelper.generatePreKey(i));
  }

  // The Securely ID is just the hex encoded public key (to be shareable)
  const securelyId = 'SM' + bufferToHex(identityKeyPair.pubKey);

  return { registrationId, identityKeyPair, signedPreKey, preKeys, securelyId };
}

export async function encryptFile(file: File): Promise<{ encryptedBlob: Blob, keyHex: string, mimeType: string }> {
  const aesKey = await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const fileBuffer = await file.arrayBuffer();
  const cipherBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    fileBuffer
  );

  const rawKey = await window.crypto.subtle.exportKey('raw', aesKey);
  const keyHex = bufferToHex(iv) + ':' + bufferToHex(rawKey);

  return { encryptedBlob: new Blob([cipherBuffer]), keyHex, mimeType: file.type };
}

export async function decryptFile(encryptedBlob: Blob, keyHex: string, mimeType: string): Promise<Blob> {
  const [ivHex, rawKeyHex] = keyHex.split(':');
  const iv = hexToBuffer(ivHex);
  const rawKey = hexToBuffer(rawKeyHex);

  const aesKey = await window.crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const cipherBuffer = await encryptedBlob.arrayBuffer();
  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(iv) },
    aesKey,
    cipherBuffer
  );

  return new Blob([decrypted], { type: mimeType });
}

export function exportIdentity(identity: any): string {
  return JSON.stringify({
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
      signature: bufferToBase64(identity.signedPreKey.signature)
    },
    preKeys: identity.preKeys.map((pk: any) => ({
      keyId: pk.keyId,
      keyPair: {
        pubKey: bufferToBase64(pk.keyPair.pubKey),
        privKey: bufferToBase64(pk.keyPair.privKey),
      }
    }))
  });
}

export function importIdentity(jsonStr: string): any {
  const exp = JSON.parse(jsonStr);
  return {
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
      signature: base64ToBuffer(exp.signedPreKey.signature)
    },
    preKeys: exp.preKeys.map((pk: any) => ({
      keyId: pk.keyId,
      keyPair: {
        pubKey: base64ToBuffer(pk.keyPair.pubKey),
        privKey: base64ToBuffer(pk.keyPair.privKey),
      }
    }))
  };
}

export async function sha256Hex(text: string): Promise<string> {
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return bufferToHex(hashBuffer);
}

export async function encryptIdentityWithPassword(identityJson: string, password: string) {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']);
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const key = await window.crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt']
  );
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const cipherBuffer = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(identityJson));
  return {
    encryptedHex: bufferToHex(iv) + ':' + bufferToHex(cipherBuffer),
    saltHex: bufferToHex(salt)
  };
}

export async function decryptIdentityWithPassword(encryptedHex: string, saltHex: string, password: string) {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']);
  const key = await window.crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: hexToBuffer(saltHex), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['decrypt']
  );
  const [ivHex, cipherHex] = encryptedHex.split(':');
  const iv = hexToBuffer(ivHex);
  const cipherBuffer = hexToBuffer(cipherHex);
  const decrypted = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(iv) }, key, cipherBuffer);
  return new TextDecoder().decode(decrypted);
}
