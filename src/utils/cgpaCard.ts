import type { AcademicData } from '../types';
import { getBacklogs } from './calculations';
import { maskHallTicket } from './htnoProfile';

function academicClass(cgpa: number): string {
  if (cgpa >= 8.5) return 'First Class with Distinction';
  if (cgpa >= 7.0) return 'First Class';
  if (cgpa >= 6.0) return 'Second Class';
  return 'Pass';
}

/** Draw a WhatsApp-friendly CGPA card and return a PNG blob. */
export async function renderCgpaCard(opts: {
  data: AcademicData;
  cgpa: number;
  percentage: number;
  includeName?: boolean;
}): Promise<Blob> {
  const { data, cgpa, percentage, includeName = true } = opts;
  const backlogs = getBacklogs(data.semesters).length;
  const w = 1080;
  const h = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');

  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#05070d');
  grad.addColorStop(0.55, '#0a1224');
  grad.addColorStop(1, '#1a0a0a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(59,130,246,0.35)';
  ctx.lineWidth = 4;
  ctx.strokeRect(48, 48, w - 96, h - 96);

  ctx.fillStyle = '#ef4444';
  ctx.font = '700 28px Outfit, system-ui, sans-serif';
  ctx.fillText('JNTUH ACADEMIC INSIGHTS', 96, 140);

  ctx.fillStyle = '#fafafa';
  ctx.font = '750 64px Outfit, system-ui, sans-serif';
  ctx.fillText('Session Snapshot', 96, 230);

  if (includeName && data.studentName) {
    ctx.fillStyle = '#a1a1aa';
    ctx.font = '500 32px Outfit, system-ui, sans-serif';
    ctx.fillText(data.studentName.slice(0, 42), 96, 300);
  }

  ctx.fillStyle = '#60a5fa';
  ctx.font = '600 28px ui-monospace, monospace';
  ctx.fillText(maskHallTicket(data.hallTicket), 96, includeName && data.studentName ? 350 : 300);

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 180px Outfit, system-ui, sans-serif';
  ctx.fillText(cgpa > 0 ? cgpa.toFixed(2) : '—', 96, 620);

  ctx.fillStyle = '#93c5fd';
  ctx.font = '700 36px Outfit, system-ui, sans-serif';
  ctx.fillText('CGPA', 96, 680);

  ctx.fillStyle = '#fafafa';
  ctx.font = '700 56px Outfit, system-ui, sans-serif';
  ctx.fillText(`${percentage > 0 ? percentage.toFixed(1) : '—'}%`, 96, 820);

  ctx.fillStyle = '#a1a1aa';
  ctx.font = '500 28px Outfit, system-ui, sans-serif';
  ctx.fillText(`Class · ${academicClass(cgpa)}`, 96, 880);
  ctx.fillText(`Regulation · ${data.regulation}`, 96, 930);
  ctx.fillText(`Active backlogs · ${backlogs}`, 96, 980);

  ctx.fillStyle = '#71717a';
  ctx.font = '500 22px Outfit, system-ui, sans-serif';
  ctx.fillText('Unofficial student tool · Not affiliated with JNTUH', 96, 1180);
  ctx.fillText('Analyse yours → import hall ticket', 96, 1225);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to export card'));
    }, 'image/png');
  });
}

export async function downloadCgpaCard(blob: Blob, filename = 'jntuh-cgpa-card.png'): Promise<void> {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function shareCgpaCard(blob: Blob, title: string): Promise<boolean> {
  const file = new File([blob], 'jntuh-cgpa-card.png', { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title, text: 'My JNTUH academic snapshot' });
    return true;
  }
  return false;
}
