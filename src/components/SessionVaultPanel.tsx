import { useEffect, useState } from 'react';
import { Lock, Unlock, Shield, Trash2, Save, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAcademic } from '../context/AcademicContext';
import {
  clearEncryptedVault,
  getVaultSavedAt,
  hasVault,
  isVaultOptedIn,
  loadEncryptedVault,
  saveEncryptedVault,
} from '../utils/encryptedVault';
import { hasSemesterData } from '../utils/calculations';

export default function SessionVaultPanel() {
  const { data, hydrateAcademicData } = useAcademic();
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [vaultExists, setVaultExists] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [optedIn, setOptedIn] = useState(false);

  const refreshMeta = async () => {
    setVaultExists(await hasVault());
    setSavedAt(await getVaultSavedAt());
    setOptedIn(isVaultOptedIn());
  };

  useEffect(() => {
    void refreshMeta();
  }, []);

  const hasData = data.semesters.some(hasSemesterData);

  const handleSave = async () => {
    if (!hasData) {
      toast.error('Import results before saving a vault');
      return;
    }
    if (pin.length < 4) {
      toast.error('Choose a PIN with at least 4 characters');
      return;
    }
    setBusy(true);
    try {
      await saveEncryptedVault(data, pin);
      toast.success('Encrypted session saved on this device');
      setPin('');
      await refreshMeta();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save vault');
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async () => {
    if (pin.length < 4) {
      toast.error('Enter your PIN to unlock');
      return;
    }
    setBusy(true);
    try {
      const restored = await loadEncryptedVault(pin);
      hydrateAcademicData(restored);
      toast.success('Session restored from encrypted vault');
      setPin('');
      await refreshMeta();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not unlock vault');
    } finally {
      setBusy(false);
    }
  };

  const handleForget = async () => {
    setBusy(true);
    try {
      await clearEncryptedVault();
      toast.success('Encrypted vault deleted');
      setPin('');
      await refreshMeta();
    } catch {
      toast.error('Could not delete vault');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card p-5 space-y-4 border border-primary/20">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
          <Shield className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-white font-heading">Optional encrypted save</h3>
          <p className="text-xs text-text-muted mt-1 leading-relaxed">
            Default is still session-only. Opt in to keep an AES-encrypted copy on this device, unlocked with your PIN.
            Grades never leave your browser for this vault.
          </p>
          {optedIn && vaultExists && savedAt && (
            <p className="text-[11px] text-emerald-400 mt-2">
              Vault active · saved {new Date(savedAt).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      <input
        type="password"
        inputMode="numeric"
        autoComplete="off"
        placeholder="PIN (min 4 characters)"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        className="input-field w-full"
        aria-label="Vault PIN"
      />

      <div className="flex flex-wrap gap-2 items-center">
        <button
          type="button"
          disabled={busy || !hasData}
          onClick={handleSave}
          className="btn-primary text-xs h-10 px-3 inline-flex items-center justify-center gap-1.5 disabled:opacity-40"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save encrypted
        </button>
        <button
          type="button"
          disabled={busy || !vaultExists}
          onClick={handleRestore}
          className="btn-secondary text-xs h-10 px-3 inline-flex items-center justify-center gap-1.5 disabled:opacity-40"
        >
          <Unlock className="w-3.5 h-3.5" />
          Unlock & restore
        </button>
        <button
          type="button"
          disabled={busy || !vaultExists}
          onClick={handleForget}
          className="btn-secondary text-xs h-10 px-3 inline-flex items-center justify-center gap-1.5 text-rose-300 disabled:opacity-40"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Forget vault
        </button>
      </div>

      <p className="text-[10px] text-text-muted flex items-center gap-1.5">
        <Lock className="w-3 h-3" />
        If you forget the PIN, the vault cannot be recovered — by design.
      </p>
    </div>
  );
}
