import { useAcademic } from '../context/AcademicContext';
import { getSemesterSGPA, calculateCGPA } from '../utils/calculations';
import { Printer } from 'lucide-react';

export default function PrintableTranscript() {
    const { data } = useAcademic();
    const cgpaResult = calculateCGPA(data.semesters);

    const semestersWithData = data.semesters.filter(sem => {
        if (sem.mode === 'manual') return (sem.manualSGPA ?? 0) > 0;
        return sem.subjects.length > 0;
    });

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="space-y-6">
            {/* Action Buttons */}
            <div className="flex justify-end gap-3 no-print">
                <button onClick={handlePrint} className="btn-primary flex items-center gap-2">
                    <Printer className="w-4 h-4" />
                    Print Transcript
                </button>
            </div>

            {/* Printable Content - Clean White Theme for Print */}
            <div className="bg-white text-black p-8 rounded-2xl shadow-lg print:shadow-none print:p-4">
                {/* Header */}
                <div className="text-center mb-6 pb-4 border-b-2 border-gray-300">
                    <h1 className="text-2xl font-bold text-gray-900 mb-1">
                        Academic Transcript
                    </h1>
                    <p className="text-gray-600 text-sm">
                        JNTUH - Jawaharlal Nehru Technological University Hyderabad
                    </p>
                </div>

                {/* Student Info Row */}
                {(data.studentName || data.hallTicket) && (
                    <div className="mb-6 grid grid-cols-3 gap-4 text-sm border border-gray-300 rounded p-3 bg-gray-50">
                        {data.studentName && (
                            <div>
                                <span className="text-gray-500 font-medium">Name:</span>
                                <span className="ml-2 font-semibold text-gray-900">{data.studentName}</span>
                            </div>
                        )}
                        {data.hallTicket && (
                            <div>
                                <span className="text-gray-500 font-medium">Hall Ticket:</span>
                                <span className="ml-2 font-semibold text-gray-900">{data.hallTicket}</span>
                            </div>
                        )}
                        <div>
                            <span className="text-gray-500 font-medium">Regulation:</span>
                            <span className="ml-2 font-semibold text-gray-900">{data.regulation}</span>
                        </div>
                    </div>
                )}

                {/* Semester-wise Results Tables */}
                {semestersWithData.map((semester) => {
                    const sgpa = getSemesterSGPA(semester);

                    return (
                        <div key={semester.id} className="mb-8">
                            {/* Semester Header */}
                            <div className="bg-sky-100 border border-sky-300 py-2 px-4 text-center">
                                <h3 className="font-bold text-sky-800 text-sm">
                                    {semester.year}-{semester.sem} Results
                                </h3>
                            </div>

                            {semester.mode === 'detailed' && semester.subjects.length > 0 ? (
                                <table className="w-full text-sm border-collapse border border-gray-400">
                                    <thead>
                                        <tr className="bg-gray-100">
                                            <th className="border border-gray-400 py-2 px-3 text-center font-semibold text-gray-700 w-24">
                                                Subject Code
                                            </th>
                                            <th className="border border-gray-400 py-2 px-3 text-center font-semibold text-gray-700">
                                                Subject Name
                                            </th>
                                            <th className="border border-gray-400 py-2 px-3 text-center font-semibold text-gray-700 w-20">
                                                Internal
                                            </th>
                                            <th className="border border-gray-400 py-2 px-3 text-center font-semibold text-gray-700 w-20">
                                                External
                                            </th>
                                            <th className="border border-gray-400 py-2 px-3 text-center font-semibold text-gray-700 w-16">
                                                Total
                                            </th>
                                            <th className="border border-gray-400 py-2 px-3 text-center font-semibold text-gray-700 w-16">
                                                Grade
                                            </th>
                                            <th className="border border-gray-400 py-2 px-3 text-center font-semibold text-gray-700 w-16">
                                                Credits
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {semester.subjects.map((subject, idx) => (
                                            <tr key={subject.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                <td className="border border-gray-400 py-2 px-3 text-center text-gray-800">
                                                    {subject.code || '—'}
                                                </td>
                                                <td className="border border-gray-400 py-2 px-3 text-center text-gray-800">
                                                    {subject.name || 'Unnamed Subject'}
                                                </td>
                                                <td className="border border-gray-400 py-2 px-3 text-center text-gray-700">
                                                    {subject.internal ?? '—'}
                                                </td>
                                                <td className="border border-gray-400 py-2 px-3 text-center text-gray-700">
                                                    {subject.external ?? '—'}
                                                </td>
                                                <td className="border border-gray-400 py-2 px-3 text-center text-gray-700">
                                                    {subject.total ?? '—'}
                                                </td>
                                                <td className={`border border-gray-400 py-2 px-3 text-center font-bold ${subject.grade === 'F' || subject.grade === 'Ab'
                                                    ? 'text-red-600'
                                                    : subject.grade === 'O' || subject.grade === 'A+'
                                                        ? 'text-green-600'
                                                        : 'text-gray-800'
                                                    }`}>
                                                    {subject.grade}
                                                </td>
                                                <td className="border border-gray-400 py-2 px-3 text-center text-gray-800">
                                                    {subject.credits}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    {/* SGPA Row */}
                                    <tfoot>
                                        <tr className="bg-gray-100">
                                            <td colSpan={6} className="border border-gray-400 py-2 px-3 text-center font-bold text-gray-800">
                                                SGPA
                                            </td>
                                            <td className="border border-gray-400 py-2 px-3 text-center font-black text-sky-700 text-lg">
                                                {sgpa.toFixed(2)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            ) : (
                                <div className="border border-gray-400 p-4 text-center bg-gray-50">
                                    <span className="text-gray-600">Manual Entry — </span>
                                    <span className="font-bold text-sky-700">SGPA: {sgpa.toFixed(2)}</span>
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* Summary */}
                <div className="mt-6 pt-4 border-t-2 border-gray-300">
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="border border-gray-300 rounded p-4 bg-gray-50">
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Credits</p>
                            <p className="text-2xl font-black text-gray-900">
                                {cgpaResult.totalCredits}
                            </p>
                        </div>
                        <div className="border border-sky-300 rounded p-4 bg-sky-50">
                            <p className="text-xs text-sky-600 uppercase tracking-wider mb-1">CGPA</p>
                            <p className="text-2xl font-black text-sky-700">
                                {cgpaResult.cgpa.toFixed(2)}
                            </p>
                        </div>
                        <div className="border border-emerald-300 rounded p-4 bg-emerald-50">
                            <p className="text-xs text-emerald-600 uppercase tracking-wider mb-1">Percentage</p>
                            <p className="text-2xl font-black text-emerald-700">
                                {cgpaResult.percentage.toFixed(2)}%
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-6 text-center text-xs text-gray-400">
                    <p>Generated by JNTUH Academic Insights</p>
                    <p className="mt-1">
                        Percentage calculated using JNTUH formula: (CGPA - 0.5) × 10
                    </p>
                </div>
            </div>
        </div>
    );
}
