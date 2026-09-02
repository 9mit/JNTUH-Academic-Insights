import { createContext, useContext, useCallback, useMemo, useState, useEffect } from 'react';
import type { AcademicData, Semester, Subject, Regulation } from '../types';

import { createEmptySemesters, generateId, toPercentage } from '../constants/grading';
import { getSemesterSGPA, calculateCGPA } from '../utils/calculations';
import { purgeClientStorage, installSessionPrivacyGuards } from '../utils/sessionPrivacy';

interface AcademicContextType {
    data: AcademicData;

    setSemesterMode: (semesterId: string, mode: 'detailed' | 'manual') => void;
    toggleSemesterExpand: (semesterId: string) => void;
    setManualSGPA: (semesterId: string, sgpa: number | null) => void;

    addSubject: (semesterId: string, subject?: Partial<Subject>) => void;
    updateSubject: (semesterId: string, subjectId: string, updates: Partial<Subject>) => void;
    removeSubject: (semesterId: string, subjectId: string) => void;

    setRegulation: (regulation: Regulation) => void;
    setStudentInfo: (name?: string, hallTicket?: string) => void;
    updateStudentInfo: (data: { name?: string; hallTicket?: string }) => void;
    setOfficialCGPA: (cgpa: number) => void;
    importSemesters: (semesters: Partial<Semester>[]) => void;
    /** Atomic replace used by HT/PDF import (avoids clear+import race). */
    replaceFromImport: (payload: {
        semesters: Partial<Semester>[];
        studentName?: string;
        hallTicket?: string;
        regulation?: Regulation;
        officialCGPA?: number;
        studentStatus?: 'active' | 'detained' | 'graduated' | 'incomplete';
        isConsolidated?: boolean;
        regulationsSeen?: string[];
        resolutionAudit?: any[];
        searchPath?: string[];
    }) => void;
    hydrateAcademicData: (payload: AcademicData) => void;
    clearAllData: () => void;

    getSGPA: (semesterId: string) => number;
    getCGPA: () => { cgpa: number; percentage: number; totalCredits: number };
}

const AcademicContext = createContext<AcademicContextType | null>(null);

const initialData: AcademicData = {
    regulation: 'R22',
    semesters: createEmptySemesters(),
    studentName: '',
    hallTicket: '',
};

export function AcademicProvider({ children }: { children: React.ReactNode }) {
    const [data, setData] = useState<AcademicData>(initialData);

    // Session-only by default: purge ephemeral storage on load.
    // Opt-in encrypted vault is preserved (see sessionPrivacy / encryptedVault).
    useEffect(() => {
        void purgeClientStorage();
        return installSessionPrivacyGuards();
    }, []);

    const updateSemester = useCallback((semesterId: string, updates: Partial<Semester>) => {
        setData(prev => ({
            ...prev,
            semesters: prev.semesters.map(sem =>
                sem.id === semesterId ? { ...sem, ...updates } : sem
            ),
        }));
    }, []);

    const setSemesterMode = useCallback((semesterId: string, mode: 'detailed' | 'manual') => {
        updateSemester(semesterId, { mode });
    }, [updateSemester]);

    const toggleSemesterExpand = useCallback((semesterId: string) => {
        setData(prev => ({
            ...prev,
            semesters: prev.semesters.map(sem =>
                sem.id === semesterId ? { ...sem, isExpanded: !sem.isExpanded } : sem
            ),
        }));
    }, []);

    const setManualSGPA = useCallback((semesterId: string, sgpa: number | null) => {
        setData(prev => ({
            ...prev,
            official_cgpa: undefined,
            semesters: prev.semesters.map(sem => {
                if (sem.id !== semesterId) return sem;
                return {
                    ...sem,
                    manualSGPA: sgpa,
                    subjects: sem.subjects.map(sub => {
                        const next = { ...sub };
                        delete next.official_sem_sgpa;
                        return next;
                    }),
                };
            }),
        }));
    }, []);

    const addSubject = useCallback((semesterId: string, subject?: Partial<Subject>) => {
        const newSubject: Subject = {
            id: generateId(),
            code: subject?.code,
            name: subject?.name || '',
            grade: subject?.grade || 'O',
            credits: subject?.credits ?? 3,
            ...(subject?.internal !== undefined && { internal: subject.internal }),
            ...(subject?.external !== undefined && { external: subject.external }),
            ...(subject?.total !== undefined && { total: subject.total }),
            ...(subject?.nonCredit !== undefined && { nonCredit: subject.nonCredit }),
            ...(subject?.official_sem_sgpa !== undefined && { official_sem_sgpa: subject.official_sem_sgpa }),
        };

        setData(prev => ({
            ...prev,
            // User-driven add clears locked official CGPA so recalculation applies
            official_cgpa: subject?.official_sem_sgpa !== undefined ? prev.official_cgpa : undefined,
            semesters: prev.semesters.map(sem =>
                sem.id === semesterId
                    ? { ...sem, subjects: [...sem.subjects, newSubject] }
                    : sem
            ),
        }));
    }, []);

    const updateSubject = useCallback((semesterId: string, subjectId: string, updates: Partial<Subject>) => {
        setData(prev => ({
            ...prev,
            // Grade/credit edits invalidate memo-locked official scores
            official_cgpa: undefined,
            semesters: prev.semesters.map(sem => {
                if (sem.id !== semesterId) return sem;
                return {
                    ...sem,
                    subjects: sem.subjects.map(sub => {
                        const next = sub.id === subjectId ? { ...sub, ...updates } : { ...sub };
                        delete next.official_sem_sgpa;
                        return next;
                    }),
                };
            }),
        }));
    }, []);

    const removeSubject = useCallback((semesterId: string, subjectId: string) => {
        setData(prev => ({
            ...prev,
            official_cgpa: undefined,
            semesters: prev.semesters.map(sem => {
                if (sem.id !== semesterId) return sem;
                return {
                    ...sem,
                    subjects: sem.subjects
                        .filter(sub => sub.id !== subjectId)
                        .map(sub => {
                            const next = { ...sub };
                            delete next.official_sem_sgpa;
                            return next;
                        }),
                };
            }),
        }));
    }, []);

    const setRegulation = useCallback((regulation: Regulation) => {
        setData(prev => ({ ...prev, regulation }));
    }, []);

    const setStudentInfo = useCallback((name?: string, hallTicket?: string) => {
        setData(prev => ({
            ...prev,
            studentName: name !== undefined ? name : prev.studentName,
            hallTicket: hallTicket !== undefined ? hallTicket : prev.hallTicket,
        }));
    }, []);

    const updateStudentInfo = useCallback((info: { name?: string; hallTicket?: string }) => {
        setStudentInfo(info.name, info.hallTicket);
    }, [setStudentInfo]);

    const importSemesters = useCallback((parsedSemesters: Partial<Semester>[]) => {
        setData(prev => {
            const newSemesters = [...prev.semesters];

            for (const parsed of parsedSemesters) {
                const idx = newSemesters.findIndex(
                    s => s.year === parsed.year && s.sem === parsed.sem
                );

                if (idx !== -1) {
                    if (parsed.subjects && parsed.subjects.length > 0) {
                        newSemesters[idx] = {
                            ...newSemesters[idx],
                            mode: 'detailed',
                            subjects: parsed.subjects.map(sub => ({
                                ...sub,
                                id: generateId(),
                            })),
                            isExpanded: true,
                            ...(typeof parsed.officialCredits === 'number'
                                ? { officialCredits: parsed.officialCredits }
                                : {}),
                            ...(parsed.regulation ? { regulation: parsed.regulation } : {}),
                        };
                    } else if (parsed.manualSGPA !== undefined && parsed.manualSGPA !== null) {
                        newSemesters[idx] = {
                            ...newSemesters[idx],
                            mode: 'manual',
                            manualSGPA: parsed.manualSGPA,
                            isExpanded: true,
                            ...(parsed.regulation ? { regulation: parsed.regulation } : {}),
                        };
                    }
                }
            }

            return { ...prev, semesters: newSemesters };
        });
    }, []);

    const replaceFromImport = useCallback((payload: {
        semesters: Partial<Semester>[];
        studentName?: string;
        hallTicket?: string;
        regulation?: Regulation;
        officialCGPA?: number;
        studentStatus?: 'active' | 'detained' | 'graduated' | 'incomplete';
        isConsolidated?: boolean;
        regulationsSeen?: string[];
        resolutionAudit?: any[];
        searchPath?: string[];
    }) => {
        const base = createEmptySemesters();
        const merged = base.map((empty) => {
            const match = payload.semesters.find((s) => s.year === empty.year && s.sem === empty.sem);
            if (!match) return empty;
            if (match.subjects && match.subjects.length > 0) {
                return {
                    ...empty,
                    mode: 'detailed' as const,
                    subjects: match.subjects.map((sub) => ({
                        ...sub,
                        id: sub.id || generateId(),
                    })),
                    isExpanded: true,
                    manualSGPA: null,
                    ...(typeof match.officialCredits === 'number'
                        ? { officialCredits: match.officialCredits }
                        : {}),
                    ...(match.regulation ? { regulation: match.regulation } : {}),
                };
            }
            if (match.manualSGPA !== undefined && match.manualSGPA !== null) {
                return {
                    ...empty,
                    mode: 'manual' as const,
                    manualSGPA: match.manualSGPA,
                    subjects: [],
                    isExpanded: true,
                    ...(match.regulation ? { regulation: match.regulation } : {}),
                };
            }
            return empty;
        });
        setData({
            regulation: payload.regulation || 'R22',
            semesters: merged,
            studentName: payload.studentName || '',
            hallTicket: payload.hallTicket || '',
            studentStatus: payload.studentStatus,
            isConsolidated: payload.isConsolidated,
            regulationsSeen: payload.regulationsSeen,
            resolutionAudit: payload.resolutionAudit,
            searchPath: payload.searchPath,
            ...(typeof payload.officialCGPA === 'number' && payload.officialCGPA > 0
                ? { official_cgpa: payload.officialCGPA }
                : {}),
        });
        void purgeClientStorage();
    }, []);

    const hydrateAcademicData = useCallback((payload: AcademicData) => {
        const base = createEmptySemesters();
        const merged = base.map((empty) => {
            const match = payload.semesters.find((s) => s.year === empty.year && s.sem === empty.sem);
            if (!match) return empty;
            return {
                ...empty,
                mode: match.mode || 'detailed',
                manualSGPA: match.manualSGPA ?? null,
                isExpanded: true,
                subjects: (match.subjects || []).map((sub) => ({
                    ...sub,
                    id: sub.id || generateId(),
                })),
                ...(typeof match.officialCredits === 'number'
                    ? { officialCredits: match.officialCredits }
                    : {}),
                ...(match.regulation ? { regulation: match.regulation } : {}),
            };
        });
        setData({
            regulation: payload.regulation || 'R22',
            semesters: merged,
            studentName: payload.studentName || '',
            hallTicket: payload.hallTicket || '',
            official_cgpa: payload.official_cgpa,
            studentStatus: payload.studentStatus,
            isConsolidated: payload.isConsolidated,
            regulationsSeen: payload.regulationsSeen,
            resolutionAudit: payload.resolutionAudit,
            searchPath: payload.searchPath,
        });
    }, []);

    const clearAllData = useCallback(() => {
        setData({
            regulation: 'R22',
            semesters: createEmptySemesters(),
            studentName: '',
            hallTicket: '',
        });
        void purgeClientStorage();
    }, []);

    const getSGPA = useCallback((semesterId: string): number => {
        const semester = data.semesters.find(s => s.id === semesterId);
        if (!semester) return 0;
        return getSemesterSGPA(semester, data.regulation);
    }, [data.semesters, data.regulation]);

    const setOfficialCGPA = useCallback((cgpa: number) => {
        setData(prev => ({ ...prev, official_cgpa: cgpa }));
    }, []);

    const getCGPA = useCallback(() => {
        if (data.official_cgpa && data.official_cgpa > 0) {
            return {
                cgpa: data.official_cgpa,
                percentage: toPercentage(data.official_cgpa),
                totalCredits: calculateCGPA(data.semesters, data.regulation).totalCredits
            };
        }

        const result = calculateCGPA(data.semesters, data.regulation);
        return {
            cgpa: result.cgpa,
            percentage: result.percentage,
            totalCredits: result.totalCredits,
        };
    }, [data.semesters, data.official_cgpa, data.regulation]);

    const contextValue = useMemo(() => ({
        data,
        setSemesterMode,
        toggleSemesterExpand,
        setManualSGPA,
        addSubject,
        updateSubject,
        removeSubject,
        setRegulation,
        setStudentInfo,
        updateStudentInfo,
        setOfficialCGPA,
        importSemesters,
        replaceFromImport,
        hydrateAcademicData,
        clearAllData,
        getSGPA,
        getCGPA,
    }), [
        data,
        setSemesterMode,
        toggleSemesterExpand,
        setManualSGPA,
        addSubject,
        updateSubject,
        removeSubject,
        setRegulation,
        setStudentInfo,
        updateStudentInfo,
        setOfficialCGPA,
        importSemesters,
        replaceFromImport,
        hydrateAcademicData,
        clearAllData,
        getSGPA,
        getCGPA,
    ]);

    return (
        <AcademicContext.Provider value={contextValue}>
            {children}
        </AcademicContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAcademic() {
    const context = useContext(AcademicContext);
    if (!context) {
        throw new Error('useAcademic must be used within an AcademicProvider');
    }
    return context;
}
