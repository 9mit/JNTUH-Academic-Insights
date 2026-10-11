/**
 * Comprehensive JNTUH Hall Ticket Parsing & Institutional Identity Engine.
 * Standard format: 21071A0501
 *   [0..2] = 21  (Year: 2021)
 *   [2..4] = 07  (College Code: JNTUH CEH)
 *   [4]    = 1   (Admission Mode: 1=Regular, 5=Lateral Entry)
 *   [5]    = A   (Degree: A=B.Tech, R=B.Pharm, D=M.Tech, E=MBA, F=MCA)
 *   [6..8] = 05  (Branch: Computer Science & Engineering)
 *   [8..10]= 01  (Candidate Roll Number in Section)
 */

export interface HtnoProfile {
  raw: string;
  admissionYear: number | null;
  completionYear: number | null;
  batchSpan: string;
  collegeCode: string;
  collegeName: string;
  isLateral: boolean;
  degreeCode: string;
  degreeLabel: string;
  branchCode: string;
  branchName: string;
  regulationHint: string;
  rollIndex: string;
}

export const JNTUH_COLLEGES: Record<string, string> = {
  '07': 'JNTUH University College of Engineering Science & Technology, Hyderabad',
  '08': 'JNTUH University College of Engineering, Manthani',
  '67': 'JNTUH University College of Engineering, Sultanpur',
  '68': 'JNTUH University College of Engineering, Rajanna Sircilla',
  '05': 'CVR College of Engineering',
  '12': 'Chaitanya Bharathi Institute of Technology (CBIT)',
  '16': 'Kakatiya Institute of Technology & Science (KITS)',
  '24': 'Gokaraju Rangaraju Institute of Engineering & Technology (GRIET)',
  '25': 'CMR College of Engineering & Technology (CMRCET)',
  '32': 'BVRIT Hyderabad / BV Raju Institute of Technology',
  '62': 'Keshav Memorial Institute of Technology (KMIT)',
  '64': 'Vasavi College of Engineering',
  '71': 'MLR Institute of Technology',
  '73': 'Maturi Venkata Subba Rao (MVSR) Engineering College',
  '83': 'Guru Nanak Institutions Technical Campus (GNITC)',
  '84': 'Geethanjali College of Engineering and Technology',
  '86': 'G. Narayanamma Institute of Technology and Science (GNITS)',
  '91': 'Vidya Jyothi Institute of Technology (VJIT)',
  'B9': 'VNR Vignana Jyothi Institute of Engineering & Technology',
  'C0': 'Scient Institute of Technology',
  'E3': 'Mahatma Gandhi Institute of Technology (MGIT)',
  'H1': 'Sreenidhi Institute of Science and Technology (SNIST)',
  'J2': 'Joginpally B.R. Engineering College',
  'K8': "St. Martin's Engineering College",
  'P6': 'Vignana Bharathi Institute of Technology (VBIT)',
  'RH': 'Malla Reddy Engineering College (MREC)',
  'U6': 'Malla Reddy College of Engineering & Technology (MRCET)',
  'TQ': 'Vardhaman College of Engineering',
  'W8': 'CMR Institute of Technology (CMRIT)',
};

export const JNTUH_BRANCHES: Record<string, string> = {
  '01': 'Civil Engineering',
  '02': 'Electrical & Electronics Engineering (EEE)',
  '03': 'Mechanical Engineering (MECH)',
  '04': 'Electronics & Communication Engineering (ECE)',
  '05': 'Computer Science & Engineering (CSE)',
  '08': 'Chemical Engineering',
  '10': 'Electronics & Instrumentation Engineering (EIE)',
  '12': 'Information Technology (IT)',
  '21': 'Aeronautical Engineering',
  '22': 'Automobile Engineering',
  '23': 'Mining Engineering',
  '24': 'Petroleum Engineering',
  '56': 'Computer Science & Information Technology (CSIT)',
  '62': 'CSE (Cyber Security)',
  '66': 'CSE (Data Science)',
  '67': 'CSE (Artificial Intelligence & Machine Learning)',
  '69': 'CSE (Internet of Things)',
  '70': 'Artificial Intelligence & Machine Learning',
  '72': 'Artificial Intelligence & Data Science',
  '73': 'Computer Science & Design (CSD)',
  '74': 'Computer Science & Business Systems (CSBS)',
};

const DEGREE_MAP: Record<string, string> = {
  A: 'B.Tech',
  R: 'B.Pharmacy',
  D: 'M.Tech',
  E: 'MBA',
  F: 'MCA',
  S: 'B.Pharmacy',
};

export function parseHtno(htno?: string): HtnoProfile | null {
  const raw = (htno || '').trim().toUpperCase();
  if (!/^[0-9]{2}[A-Z0-9]{2}[15][A-Z0-9][0-9A-Z]{2}[0-9A-Z]{2}$/.test(raw) && raw.length !== 10) {
    if (!/^[0-9A-Z]{10}$/.test(raw)) return null;
  }

  const yy = parseInt(raw.slice(0, 2), 10);
  const admissionYear = Number.isFinite(yy) ? 2000 + yy : null;
  const collegeCode = raw.slice(2, 4);
  const admissionMode = raw.charAt(4);
  const isLateral = admissionMode === '5';
  const degreeCode = raw.charAt(5);
  const branchCode = raw.slice(6, 8);
  const rollIndex = raw.slice(8, 10);

  const durationYears = isLateral ? 3 : 4;
  const completionYear = admissionYear ? admissionYear + durationYears : null;
  const batchSpan = admissionYear && completionYear ? `${admissionYear} – ${completionYear}` : 'Class of 2021 – 2025';

  let regulationHint = 'R18';
  if (admissionYear) {
    if (admissionYear >= 2025) regulationHint = 'R25';
    else if (admissionYear >= 2024) regulationHint = 'R24';
    else if (admissionYear >= 2022) regulationHint = 'R22';
    else if (admissionYear >= 2018) regulationHint = 'R18';
    else if (admissionYear >= 2016) regulationHint = 'R16';
    else if (admissionYear === 2015) regulationHint = 'R15';
    else regulationHint = 'R13';
  }

  const collegeName = JNTUH_COLLEGES[collegeCode] || `JNTUH Affiliated College (${collegeCode})`;
  const branchName = JNTUH_BRANCHES[branchCode] || `Engineering Specialization (${branchCode})`;

  return {
    raw,
    admissionYear,
    completionYear,
    batchSpan,
    collegeCode,
    collegeName,
    isLateral,
    degreeCode,
    degreeLabel: DEGREE_MAP[degreeCode] || 'B.Tech',
    branchCode,
    branchName,
    regulationHint,
    rollIndex,
  };
}

export function maskHallTicket(htno?: string): string {
  const raw = (htno || '').trim().toUpperCase();
  if (raw.length < 6) return raw || '—';
  return `${raw.slice(0, 4)}****${raw.slice(-2)}`;
}

export const decodeHTNO = parseHtno;
export const parseHtnoProfile = parseHtno;

