import {
  StorageType,
  Direction,
  KeyPairType,
  SessionRecordType,
} from '@privacyresearch/libsignal-protocol-typescript';
import { PQKeyPair, PQSessionState } from './types';

export function arrayBufferToString(buffer: ArrayBuffer): string {
  const arr = new Uint8Array(buffer);
  let str = '';
  for (let i = 0; i < arr.byteLength; i++) {
    str += arr[i].toString(16).padStart(2, '0');
  }
  return str;
}

function bufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary_string = atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary_string = atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes;
}

const replacer = (key: string, value: any) => {
  if (value instanceof Uint8Array) {
    return { _type: 'Uint8Array', data: uint8ArrayToBase64(value) };
  }
  if (value instanceof ArrayBuffer) {
    return { _type: 'ArrayBuffer', data: bufferToBase64(value) };
  }
  if (value && value.buffer instanceof ArrayBuffer && value.byteLength !== undefined) {
    return { _type: 'ArrayBuffer', data: bufferToBase64(value.buffer) };
  }
  return value;
};

const reviver = (key: string, value: any) => {
  if (value && typeof value === 'object') {
    if (value._type === 'Uint8Array') {
      return base64ToUint8Array(value.data);
    }
    if (value._type === 'ArrayBuffer') {
      return base64ToBuffer(value.data);
    }
  }
  return value;
};

export class SignalProtocolStore implements StorageType {
  private p: { [key: string]: any } = {};
  private storeKey = "signal_store_default";

  constructor() {
    try {
      const identStr = localStorage.getItem("signal_identity");
      if (identStr) {
        const ident = JSON.parse(identStr);
        if (ident && ident.securelyId) {
          this.storeKey = `signal_store_${ident.securelyId}`;
        }
      }
      const saved = localStorage.getItem(this.storeKey);
      if (saved) {
        this.p = JSON.parse(saved, reviver);
      }
    } catch (e) {
      console.error("Failed to load Signal store from localStorage", e);
    }
  }

  private save() {
    try {
      localStorage.setItem(this.storeKey, JSON.stringify(this.p, replacer));
    } catch(e) {
      console.error("Failed to save Signal store to localStorage", e);
    }
  }

  async getIdentityKeyPair(): Promise<KeyPairType | undefined> {
    return this.p['identityKey'];
  }

  async getLocalRegistrationId(): Promise<number | undefined> {
    return this.p['registrationId'];
  }

  async isTrustedIdentity(
    identifier: string,
    identityKey: ArrayBuffer,
    direction: Direction
  ): Promise<boolean> {
    if (identifier === null) {
      throw new Error('tried to check identity key for undefined/null key');
    }
    const trusted = this.p['identityKey' + identifier];
    if (trusted === undefined) {
      return Promise.resolve(true);
    }
    return Promise.resolve(
      arrayBufferToString(trusted as ArrayBuffer) === arrayBufferToString(identityKey)
    );
  }

  async saveIdentity(
    encodedAddress: string,
    publicKey: ArrayBuffer,
    nonblockingApproval?: boolean
  ): Promise<boolean> {
    if (encodedAddress === null) throw new Error('tried to put identity key for undefined/null key');
    this.p['identityKey' + encodedAddress] = publicKey;
    this.save();
    return true;
  }

  async loadPreKey(keyId: number | string): Promise<KeyPairType | undefined> {
    return this.p['25519KeypreKey' + keyId];
  }

  async storePreKey(keyId: number | string, keyPair: KeyPairType): Promise<void> {
    this.p['25519KeypreKey' + keyId] = keyPair;
    this.save();
  }

  async removePreKey(keyId: number | string): Promise<void> {
    delete this.p['25519KeypreKey' + keyId];
    this.save();
  }

  async storeSession(encodedAddress: string, record: SessionRecordType): Promise<void> {
    this.p['session' + encodedAddress] = record;
    this.save();
  }

  async loadSession(encodedAddress: string): Promise<SessionRecordType | undefined> {
    return this.p['session' + encodedAddress];
  }

  async loadSignedPreKey(keyId: number | string): Promise<KeyPairType | undefined> {
    return this.p['25519KeysignedKey' + keyId];
  }

  async storeSignedPreKey(keyId: number | string, keyPair: KeyPairType): Promise<void> {
    this.p['25519KeysignedKey' + keyId] = keyPair;
    this.save();
  }

  async removeSignedPreKey(keyId: number | string): Promise<void> {
    delete this.p['25519KeysignedKey' + keyId];
    this.save();
  }

  // --- Post-Quantum (ML-KEM-768) Storage Methods ---

  storePQIdentityKeyPair(keyPair: PQKeyPair): void {
    this.p['pqIdentityKeyPair'] = keyPair;
    this.save();
  }

  getPQIdentityKeyPair(): PQKeyPair | undefined {
    return this.p['pqIdentityKeyPair'];
  }

  storePQPreKey(keyId: number | string, keyPair: PQKeyPair): void {
    this.p['pqPreKey_' + keyId] = keyPair;
    this.save();
  }

  loadPQPreKey(keyId: number | string): PQKeyPair | undefined {
    return this.p['pqPreKey_' + keyId];
  }

  removePQPreKey(keyId: number | string): void {
    delete this.p['pqPreKey_' + keyId];
    this.save();
  }

  storePQSignedPreKey(keyId: number | string, keyPair: PQKeyPair): void {
    this.p['pqSignedPreKey_' + keyId] = keyPair;
    this.save();
  }

  loadPQSignedPreKey(keyId: number | string): PQKeyPair | undefined {
    return this.p['pqSignedPreKey_' + keyId];
  }

  storePQSession(peerId: string, session: PQSessionState): void {
    this.p['pqSession_' + peerId] = session;
    this.save();
  }

  loadPQSession(peerId: string): PQSessionState | undefined {
    return this.p['pqSession_' + peerId];
  }

  removePQSession(peerId: string): void {
    delete this.p['pqSession_' + peerId];
    this.save();
  }

  // Helper method to set local data directly
  put(key: string, value: any) {
    this.p[key] = value;
    this.save();
  }

  get(key: string): any {
    return this.p[key];
  }
}
