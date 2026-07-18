import { useEffect, useState } from 'react';
import { Unlock, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAcademic } from '../context/AcademicContext';
import { hasVault, loadEncryptedVault } from '../utils/encryptedVault';
import { hasSemesterData } from '../utils/calculations';

/** Soft prompt on load when an encrypted vault exists and session is empty. */
export default function VaultUnlockBanner() {
  const { data, hydrateAcademicData } = useAcademic();
  const [show, setShow] = useState(false);
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const empty = !data.semesters.some(hasSemesterData);
      if (!empty) return;
      if (await hasVault()) {
        if (!cancelled) setShow(true);
      }
    })();
    return () => { cancelled = true; };
  }, [data.semesters]);

  if (!show) return null;

  const unlock = async () => {
    setBusy(true);
    try {
      const restored = await loadEncryptedVault(pin);
      hydrateAcademicData(restored);
      toast.success('Session restored');
      setShow(false);
      setPin('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Unlock failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-6 card p-4 border border-emerald-500/25 bg-emerald-500/5 flex flex-col sm:flex-row gap-3 sm:items-center">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-emerald-300">Encrypted session found on this device</p>
        <p className="text-xs text-text-muted mt-1">Enter your PIN to restore grades without re-importing.</p>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <input
          type="password"
          inputMode="numeric"
          placeholder="PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && unlock()}
          className="input-field w-28 text-sm h-10 py-0"
          aria-label="Unlock PIN"
        />
        <button type="button" disabled={busy || pin.length < 4} onClick={unlock} className="btn-primary text-xs h-10 px-3 inline-flex items-center justify-center gap-1.5">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlock className="w-3.5 h-3.5" />}
          Unlock
        </button>
        <button type="button" onClick={() => setShow(false)} className="inline-flex items-center justify-center h-10 w-10 text-text-muted hover:text-white rounded-lg hover:bg-white/5" aria-label="Dismiss">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
