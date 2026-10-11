export interface FallbackNotification {
  id: string;
  title: string;
  date: string;
  category: string;
  degree: string[];
  regulation: string[];
  url: string;
  exam_year: string;
  source?: string;
}

export interface FallbackCalendarItem {
  id: string;
  title: string;
  academic_year: string;
  degree: string;
  date: string;
  url: string;
  events: { type: string; label: string; date: string }[];
}

export const FALLBACK_NOTIFICATIONS: FallbackNotification[] = [
  {
    id: 'notif-fastupdates-hyderabad',
    title: 'JNTUH Hyderabad B.Tech / B.Pharmacy Results & Notification Updates',
    date: 'Current Academic Session',
    category: 'results',
    degree: ['B.Tech', 'B.Pharm'],
    regulation: ['R18', 'R22', 'R24', 'R25'],
    url: 'https://www.jntufastupdates.com/jntu-hyderabad/',
    exam_year: '2026',
    source: 'JNTU Fast Updates',
  },
  {
    id: 'notif-jntuh-official',
    title: 'Official JNTUH Examination Branch Circulars & Announcements',
    date: 'Official Portal',
    category: 'exams',
    degree: ['B.Tech', 'B.Pharm'],
    regulation: ['R18', 'R22', 'R24', 'R25'],
    url: 'https://jntuh.ac.in',
    exam_year: '2026',
    source: 'JNTUH Official Portal',
  },
  {
    id: 'notif-jntuh-results-portal',
    title: 'JNTUH Official Examination Results & Recounting / Revaluation (RC/RV) Portals',
    date: 'Official Portal',
    category: 'results',
    degree: ['B.Tech', 'B.Pharm'],
    regulation: ['R18', 'R22', 'R24', 'R25'],
    url: 'http://results.jntuh.ac.in',
    exam_year: '2026',
    source: 'JNTUH Results Server',
  },
];

export const FALLBACK_CALENDARS: FallbackCalendarItem[] = [
  {
    id: 'cal-2026-btech',
    title: 'B.Tech II, III & IV Years Academic Calendar 2026-27',
    academic_year: '2026-27',
    degree: 'B.Tech',
    date: '2026-05-01',
    url: 'https://jntuh.ac.in/academic-calendars',
    events: [
      { type: 'instruction', label: 'Instruction begins', date: '2026-07-15' },
      { type: 'mid_exam', label: 'Mid examinations', date: '2026-09-15' },
      { type: 'supply_exam', label: 'Supply / supplementary window', date: '2026-08-20' },
      { type: 'end_exam', label: 'End examinations', date: '2026-11-20' },
    ],
  },
  {
    id: 'cal-2026-btech-1',
    title: 'B.Tech I Year I & II Semesters Calendar 2025-26',
    academic_year: '2025-26',
    degree: 'B.Tech',
    date: '2025-10-14',
    url: 'https://jntuh.ac.in/academic-calendars',
    events: [],
  },
];
