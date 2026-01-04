import { createContext, useContext, useCallback, useMemo, useState } from 'react';
import type { AcademicData, Semester, Subject, Regulation } from '../types';

import { createEmptySemesters, generateId, toPercentage } from '../constants/grading';
import { getSemesterSGPA, calculateCGPA } from '../utils/calculations';

// ... (interface restored)
interface AcademicContextType {
    data: AcademicData;

    // Semester actions
    setSemesterMode: (semesterId: string, mode: 'detailed' | 'manual') => void;
    toggleSemesterExpand: (semesterId: string) => void;
    setManualSGPA: (semesterId: string, sgpa: number | null) => void;

    // Subject actions
    addSubject: (semesterId: string, subject?: Partial<Subject>) => void;
    updateSubject: (semesterId: string, subjectId: string, updates: Partial<Subject>) => void;
    removeSubject: (semesterId: string, subjectId: string) => void;

    // Bulk actions
    setRegulation: (regulation: Regulation) => void;
    setStudentInfo: (name?: string, hallTicket?: string) => void;
    setOfficialCGPA: (cgpa: number) => void;
    importSemesters: (semesters: Partial<Semester>[]) => void;
    clearAllData: () => void;

    // Computed values
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
    // UPDATED: Using useState instead of useLocalStorage ensures data rests on reload
    const [data, setData] = useState<AcademicData>(initialData);


    const updateSemester = useCallback((semesterId: string, updates: Partial<Semester>) => {
        setData(prev => ({
            ...prev,
            semesters: prev.semesters.map(sem =>
                sem.id === semesterId ? { ...sem, ...updates } : sem
            ),
        }));
    }, [setData]);

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
    }, [setData]);

    const setManualSGPA = useCallback((semesterId: string, sgpa: number | null) => {
        updateSemester(semesterId, { manualSGPA: sgpa });
    }, [updateSemester]);

    const addSubject = useCallback((semesterId: string, subject?: Partial<Subject>) => {
        const newSubject: Subject = {
            id: generateId(),
            code: subject?.code,
            name: subject?.name || '',
            grade: subject?.grade || 'O',
            credits: subject?.credits || 3,
        };

        setData(prev => ({
            ...prev,
            semesters: prev.semesters.map(sem =>
                sem.id === semesterId
                    ? { ...sem, subjects: [...sem.subjects, newSubject] }
                    : sem
            ),
        }));
    }, [setData]);

    const updateSubject = useCallback((semesterId: string, subjectId: string, updates: Partial<Subject>) => {
        setData(prev => ({
            ...prev,
            semesters: prev.semesters.map(sem =>
                sem.id === semesterId
                    ? {
                        ...sem,
                        subjects: sem.subjects.map(sub =>
                            sub.id === subjectId ? { ...sub, ...updates } : sub
                        ),
                    }
                    : sem
            ),
        }));
    }, [setData]);

    const removeSubject = useCallback((semesterId: string, subjectId: string) => {
        setData(prev => ({
            ...prev,
            semesters: prev.semesters.map(sem =>
                sem.id === semesterId
                    ? { ...sem, subjects: sem.subjects.filter(sub => sub.id !== subjectId) }
                    : sem
            ),
        }));
    }, [setData]);

    const setRegulation = useCallback((regulation: Regulation) => {
        setData(prev => ({ ...prev, regulation }));
    }, [setData]);

    const setStudentInfo = useCallback((name?: string, hallTicket?: string) => {
        setData(prev => ({
            ...prev,
            studentName: name !== undefined ? name : prev.studentName,
            hallTicket: hallTicket !== undefined ? hallTicket : prev.hallTicket,
        }));
    }, [setData]);

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
                        };
                    } else if (parsed.manualSGPA !== undefined && parsed.manualSGPA !== null) {
                        newSemesters[idx] = {
                            ...newSemesters[idx],
                            mode: 'manual',
                            manualSGPA: parsed.manualSGPA,
                            isExpanded: true,
                        };
                    }
                }
            }

            return { ...prev, semesters: newSemesters };
        });
    }, [setData]);

    const clearAllData = useCallback(() => {
        setData(initialData);
    }, [setData]);

    const getSGPA = useCallback((semesterId: string): number => {
        const semester = data.semesters.find(s => s.id === semesterId);
        if (!semester) return 0;
        return getSemesterSGPA(semester);
    }, [data.semesters]);

    const setOfficialCGPA = useCallback((cgpa: number) => {
        setData(prev => ({ ...prev, official_cgpa: cgpa }));
    }, [setData]);

    const getCGPA = useCallback(() => {
        // If official CGPA exists and is valid, use it
        if (data.official_cgpa && data.official_cgpa > 0) {
            return {
                cgpa: data.official_cgpa,
                percentage: toPercentage(data.official_cgpa),
                totalCredits: calculateCGPA(data.semesters).totalCredits
            };
        }

        const result = calculateCGPA(data.semesters);
        return {
            cgpa: result.cgpa,
            percentage: result.percentage,
            totalCredits: result.totalCredits,
        };
    }, [data.semesters, data.official_cgpa]);

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
        setOfficialCGPA,
        importSemesters,
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
        setOfficialCGPA,
        importSemesters,
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

export function useAcademic() {
    const context = useContext(AcademicContext);
    if (!context) {
        throw new Error('useAcademic must be used within an AcademicProvider');
    }
    return context;
}
