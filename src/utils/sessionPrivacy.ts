import {
  clearEncryptedVault,
  hasVault,
  isVaultOptedIn,
  loadEncryptedVault,
  saveEncryptedVault,
  getVaultSavedAt,
} from './encryptedVault';

const LEGACY_DB_NAME = 'jntuh_academic_os';
const STORAGE_PREFIX = 'jntuh_';
/** Keys that survive wipe when vault opt-in is enabled */
const PROTECTED_KEYS = new Set(['jntuh_vault_opt_in', 'jntuh_alert_prefs', 'jntuh_backlog_checklist']);

/** Remove ephemeral client data. Preserves encrypted vault when opted in. */
export async function purgeClientStorage(): Promise<void> {
  const keepVault = isVaultOptedIn();

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(STORAGE_PREFIX)) continue;
      if (keepVault && PROTECTED_KEYS.has(key)) continue;
      keysToRemove.push(key);
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch {
    /* private browsing / blocked storage */
  }

  try {
    // Preserve notes focus + vault-related session keys when opted in
    if (!keepVault) {
      sessionStorage.clear();
    } else {
      const keep = new Set(['notesFocusSubject', 'notesFocusCode']);
      const toRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && !keep.has(key)) toRemove.push(key);
      }
      toRemove.forEach((k) => sessionStorage.removeItem(k));
    }
  } catch {
    /* ignore */
  }

  try {
    // Never delete the encrypted vault DB here — only the legacy OS DB
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase(LEGACY_DB_NAME);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    });
  } catch {
    /* ignore */
  }
}

/**
 * Clear storage when the tab is closed — skipped when user opted into vault
 * so encrypted restore remains available on next visit.
 */
export function installSessionPrivacyGuards(): () => void {
  const onLeave = () => {
    if (isVaultOptedIn()) return;
    void purgeClientStorage();
  };
  window.addEventListener('pagehide', onLeave);
  return () => window.removeEventListener('pagehide', onLeave);
}

export {
  clearEncryptedVault,
  hasVault,
  isVaultOptedIn,
  loadEncryptedVault,
  saveEncryptedVault,
  getVaultSavedAt,
};
