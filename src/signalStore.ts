import {
  StorageType,
  Direction,
  KeyPairType,
  SessionRecordType,
} from '@privacyresearch/libsignal-protocol-typescript';

export function arrayBufferToString(buffer: ArrayBuffer): string {
  const arr = new Uint8Array(buffer);
  let str = '';
  for (let i = 0; i < arr.byteLength; i++) {
    str += arr[i].toString(16).padStart(2, '0');
  }
  return str;
}

export class SignalProtocolStore implements StorageType {
  private p: { [key: string]: any } = {};

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
    return true;
  }

  async loadPreKey(keyId: number | string): Promise<KeyPairType | undefined> {
    return this.p['25519KeypreKey' + keyId];
  }

  async storePreKey(keyId: number | string, keyPair: KeyPairType): Promise<void> {
    this.p['25519KeypreKey' + keyId] = keyPair;
  }

  async removePreKey(keyId: number | string): Promise<void> {
    delete this.p['25519KeypreKey' + keyId];
  }

  async storeSession(encodedAddress: string, record: SessionRecordType): Promise<void> {
    this.p['session' + encodedAddress] = record;
  }

  async loadSession(encodedAddress: string): Promise<SessionRecordType | undefined> {
    return this.p['session' + encodedAddress];
  }

  async loadSignedPreKey(keyId: number | string): Promise<KeyPairType | undefined> {
    return this.p['25519KeysignedKey' + keyId];
  }

  async storeSignedPreKey(keyId: number | string, keyPair: KeyPairType): Promise<void> {
    this.p['25519KeysignedKey' + keyId] = keyPair;
  }

  async removeSignedPreKey(keyId: number | string): Promise<void> {
    delete this.p['25519KeysignedKey' + keyId];
  }

  // Helper method to set local data directly
  put(key: string, value: any) {
    this.p[key] = value;
  }
}
