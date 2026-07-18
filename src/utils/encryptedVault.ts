/**
 * Opt-in encrypted academic vault (Web Crypto AES-GCM).
 * Survives refresh when the user enables "Remember this session".
 * Default privacy remains session-wipe unless opted in.
 */

import type { AcademicData } from '../types';

const VAULT_DB = 'jntuh_encrypted_vault';
const VAULT_STORE = 'vault';
const VAULT_KEY = 'academic_v1';
const OPT_IN_FLAG = 'jntuh_vault_opt_in'; // intentionally uses jntuh_ prefix but is excluded from purge

export function isVaultOptedIn(): boolean {
  try {
    return localStorage.getItem(OPT_IN_FLAG) === '1';
  } catch {
    return false;
  }
}

export function setVaultOptIn(enabled: boolean): void {
  try {
    if (enabled) localStorage.setItem(OPT_IN_FLAG, '1');
    else localStorage.removeItem(OPT_IN_FLAG);
  } catch {
    /* ignore */
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(VAULT_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(VAULT_STORE)) {
        db.createObjectStore(VAULT_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VAULT_STORE, 'readonly');
    const req = tx.objectStore(VAULT_STORE).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VAULT_STORE, 'readwrite');
    tx.objectStore(VAULT_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbDel(key: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VAULT_STORE, 'readwrite');
    tx.objectStore(VAULT_STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function bufToB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function b64ToBuf(b64: string): ArrayBuffer {
  const s = atob(b64);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes.buffer;
}

async function deriveKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const base = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveKey']);
  const saltBuf = salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength) as ArrayBuffer;
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: saltBuf, iterations: 120_000, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

interface VaultBlob {
  v: 1;
  salt: string;
  iv: string;
  cipher: string;
  savedAt: string;
}

export async function hasVault(): Promise<boolean> {
  try {
    const blob = await idbGet<VaultBlob>(VAULT_KEY);
    return Boolean(blob?.cipher);
  } catch {
    return false;
  }
}

export async function saveEncryptedVault(data: AcademicData, pin: string): Promise<void> {
  if (pin.length < 4) throw new Error('PIN must be at least 4 characters');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pin, salt);
  const payload = new TextEncoder().encode(JSON.stringify(data));
  const ivBuf = iv.buffer.slice(iv.byteOffset, iv.byteOffset + iv.byteLength) as ArrayBuffer;
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: ivBuf }, key, payload);
  const blob: VaultBlob = {
    v: 1,
    salt: bufToB64(salt.buffer),
    iv: bufToB64(iv.buffer),
    cipher: bufToB64(cipher),
    savedAt: new Date().toISOString(),
  };
  await idbSet(VAULT_KEY, blob);
  setVaultOptIn(true);
}

export async function loadEncryptedVault(pin: string): Promise<AcademicData> {
  const blob = await idbGet<VaultBlob>(VAULT_KEY);
  if (!blob?.cipher) throw new Error('No saved session found');
  const salt = new Uint8Array(b64ToBuf(blob.salt));
  const iv = new Uint8Array(b64ToBuf(blob.iv));
  const key = await deriveKey(pin, salt);
  try {
    const ivBuf = iv.buffer.slice(iv.byteOffset, iv.byteOffset + iv.byteLength) as ArrayBuffer;
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBuf }, key, b64ToBuf(blob.cipher));
    return JSON.parse(new TextDecoder().decode(plain)) as AcademicData;
  } catch {
    throw new Error('Wrong PIN or corrupted vault');
  }
}

export async function clearEncryptedVault(): Promise<void> {
  try {
    await idbDel(VAULT_KEY);
  } catch {
    /* ignore */
  }
  setVaultOptIn(false);
  try {
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase(VAULT_DB);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    });
  } catch {
    /* ignore */
  }
}

export async function getVaultSavedAt(): Promise<string | null> {
  try {
    const blob = await idbGet<VaultBlob>(VAULT_KEY);
    return blob?.savedAt ?? null;
  } catch {
    return null;
  }
}
