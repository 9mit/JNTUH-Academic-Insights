import * as XLSX from 'xlsx';
import type { Semester } from '../types';
import { getSemesterSGPA, calculateCGPA } from './calculations';
import { getSemesterLabel } from '../constants/grading';

interface ExportData {
    semesters: Semester[];
    studentName?: string;
    hallTicket?: string;
    regulation: string;
}

/**
 * Export academic data to Excel file
 */
export function exportToExcel(data: ExportData): void {
    const workbook = XLSX.utils.book_new();

    // 1. Subjects Sheet
    const subjectsData: any[] = [];
    data.semesters.forEach(sem => {
        if (sem.mode === 'detailed') {
            sem.subjects.forEach(sub => {
                subjectsData.push({
                    'Semester': getSemesterLabel(sem.year, sem.sem),
                    'Subject Code': sub.code || '-',
                    'Subject Name': sub.name,
                    'Grade': sub.grade,
                    'Credits': sub.credits,
                });
            });
        }
    });

    if (subjectsData.length > 0) {
        const subjectsSheet = XLSX.utils.json_to_sheet(subjectsData);
        XLSX.utils.book_append_sheet(workbook, subjectsSheet, 'Subjects');
    }

    // 2. Semesters Sheet
    const semestersData: any[] = [];
    data.semesters.forEach(sem => {
        const sgpa = getSemesterSGPA(sem);
        if (sgpa > 0) {
            semestersData.push({
                'Semester': getSemesterLabel(sem.year, sem.sem),
                'SGPA': sgpa.toFixed(2),
                'Mode': sem.mode === 'manual' ? 'Manual Entry' : 'Detailed',
            });
        }
    });

    if (semestersData.length > 0) {
        const semestersSheet = XLSX.utils.json_to_sheet(semestersData);
        XLSX.utils.book_append_sheet(workbook, semestersSheet, 'Semesters');
    }

    // 3. Summary Sheet
    const cgpaResult = calculateCGPA(data.semesters);
    const summaryData = [
        { 'Field': 'Student Name', 'Value': data.studentName || '-' },
        { 'Field': 'Hall Ticket', 'Value': data.hallTicket || '-' },
        { 'Field': 'Regulation', 'Value': data.regulation },
        { 'Field': 'Total Credits', 'Value': cgpaResult.totalCredits },
        { 'Field': 'CGPA', 'Value': cgpaResult.cgpa.toFixed(2) },
        { 'Field': 'Percentage', 'Value': cgpaResult.percentage.toFixed(2) + '%' },
    ];
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Generate filename
    const filename = data.hallTicket
        ? `JNTUH_Results_${data.hallTicket}.xlsx`
        : 'JNTUH_Results.xlsx';

    // Download
    XLSX.writeFile(workbook, filename);
}

/**
 * Encode data for shareable URL
 */
export function encodeShareableData(data: ExportData): string {
    const minimalData = {
        s: data.semesters.map(sem => ({
            y: sem.year,
            m: sem.sem,
            mode: sem.mode,
            sgpa: sem.manualSGPA,
            subs: sem.mode === 'detailed' ? sem.subjects.map(sub => ({
                n: sub.name,
                c: sub.code,
                g: sub.grade,
                cr: sub.credits,
            })) : [],
        })),
        n: data.studentName,
        h: data.hallTicket,
        r: data.regulation,
    };

    const jsonStr = JSON.stringify(minimalData);
    // Use base64 encoding
    return btoa(encodeURIComponent(jsonStr));
}

/**
 * Decode shareable URL data
 */
export function decodeShareableData(encoded: string): ExportData | null {
    try {
        const jsonStr = decodeURIComponent(atob(encoded));
        const minData = JSON.parse(jsonStr);

        return {
            semesters: minData.s.map((sem: any, idx: number) => ({
                id: `${sem.y}-${sem.m}`,
                year: sem.y,
                sem: sem.m,
                mode: sem.mode,
                manualSGPA: sem.sgpa,
                isExpanded: idx === 0,
                subjects: (sem.subs || []).map((sub: any, subIdx: number) => ({
                    id: `sub-${idx}-${subIdx}`,
                    name: sub.n,
                    code: sub.c,
                    grade: sub.g,
                    credits: sub.cr,
                })),
            })),
            studentName: minData.n,
            hallTicket: minData.h,
            regulation: minData.r,
        };
    } catch {
        return null;
    }
}

/**
 * Generate shareable URL
 */
export function generateShareableUrl(data: ExportData): string {
    const encoded = encodeShareableData(data);
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?share=${encoded}`;
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        return true;
    }
}
