import { useState, useEffect } from 'react'
import MainLayout from '../components/layout/MainLayout'
import SectionCard from '../components/common/SectionCard'
import LoadingState from '../components/common/LoadingState'
import api from '../services/api'

function DatabaseView() {
  const [students, setStudents] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedStudentId, setExpandedStudentId] = useState(null)

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      const [studentsRes, summaryRes] = await Promise.all([
        api.get('/upload/database/students'),
        api.get('/upload/database/summary'),
      ])
      setStudents(Array.isArray(studentsRes.data) ? studentsRes.data : [])
      setSummary(summaryRes.data && !summaryRes.data.message ? summaryRes.data : null)
    } catch (err) {
      console.error(err)
      setError('Failed to fetch database details. Ensure the backend is active.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const toggleExpand = (studentId) => {
    setExpandedStudentId((prev) => (prev === studentId ? null : studentId))
  }

  const filteredStudents = students.filter(
    (student) =>
      student.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.register_no.includes(searchQuery)
  )

  return (
    <MainLayout>
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Database Records</h1>
          <p className="mt-2 max-w-2xl text-gray-600">
            Inspect all students, subject marks, and exam summaries stored inside the PostgreSQL database.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition active:scale-95"
        >
          Refresh Data
        </button>
      </div>

      {loading ? (
        <div className="py-20">
          <LoadingState />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700 shadow-sm">
          <p className="font-semibold">{error}</p>
          <button
            onClick={fetchData}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition"
          >
            Try Again
          </button>
        </div>
      ) : (
        <>
          {/* Exam Summary Banner */}
          {summary ? (
            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Students</p>
                <p className="mt-2 text-3xl font-bold text-slate-800">{summary.total_students}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Class Average</p>
                <p className="mt-2 text-3xl font-bold text-slate-800">
                  {summary.average_score} <span className="text-sm font-normal text-slate-500">/ 300</span>
                </p>
                <p className="mt-1 text-xs text-slate-500">({summary.average_percentage}% Avg Percentage)</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Topper</p>
                <p className="mt-2 text-xl font-bold text-blue-600 truncate">{summary.topper_name}</p>
                <p className="mt-1 text-xs text-slate-500">Highest Score: {summary.highest_score} / 300</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Class Accuracy</p>
                <p className="mt-2 text-3xl font-bold text-green-600">{summary.average_accuracy}%</p>
                <p className="mt-1 text-xs text-slate-500">Lowest Score: {summary.lowest_score}</p>
              </div>
            </div>
          ) : (
            <div className="mb-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-500">
              No exam summary found. Upload your data first.
            </div>
          )}

          {/* Student Explorer */}
          <SectionCard>
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Student Standings</h2>
                <p className="text-sm text-gray-500">Click a student's row to view subject and accuracy details.</p>
              </div>
              <div className="w-full sm:max-w-xs">
                <input
                  type="text"
                  placeholder="Search by name or roll number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {filteredStudents.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Rank</th>
                      <th className="px-4 py-3">Roll No</th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Class & Section</th>
                      <th className="px-4 py-3">Physics</th>
                      <th className="px-4 py-3">Chemistry</th>
                      <th className="px-4 py-3">Maths</th>
                      <th className="px-4 py-3">Total Score</th>
                      <th className="px-4 py-3">Percentage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {filteredStudents.map((student) => {
                      const isExpanded = expandedStudentId === student.id
                      return (
                        <tr key={student.id} className="transition hover:bg-slate-50 cursor-pointer">
                          <td onClick={() => toggleExpand(student.id)} className="px-4 py-4 font-bold text-slate-700">
                            #{student.rank}
                          </td>
                          <td onClick={() => toggleExpand(student.id)} className="px-4 py-4 text-slate-600 font-medium">
                            {student.register_no}
                          </td>
                          <td onClick={() => toggleExpand(student.id)} className="px-4 py-4 font-semibold text-slate-800">
                            {student.student_name}
                          </td>
                          <td onClick={() => toggleExpand(student.id)} className="px-4 py-4 text-slate-500">
                            {student.class_name || 'Standard 12'} - {student.section || 'A'}
                          </td>
                          <td onClick={() => toggleExpand(student.id)} className="px-4 py-4 text-slate-600 font-medium">
                            {student.phy_marks ?? 0}
                          </td>
                          <td onClick={() => toggleExpand(student.id)} className="px-4 py-4 text-slate-600 font-medium">
                            {student.che_marks ?? 0}
                          </td>
                          <td onClick={() => toggleExpand(student.id)} className="px-4 py-4 text-slate-600 font-medium">
                            {student.mat_marks ?? 0}
                          </td>
                          <td onClick={() => toggleExpand(student.id)} className="px-4 py-4 font-bold text-blue-600">
                            {student.total_marks ?? 0} <span className="text-xs font-normal text-slate-400">/ 300</span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                              {student.percentage}%
                            </span>
                            {isExpanded && (
                              <div className="absolute left-0 right-0 mt-4 bg-slate-50 p-6 border-y border-slate-200 cursor-default shadow-inner z-10">
                                <div className="max-w-6xl mx-auto grid gap-6 md:grid-cols-2">
                                  {/* Detailed stats */}
                                  <div>
                                    <h3 className="text-base font-bold text-slate-800 mb-3">Overall Performance Summary</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                      <div className="bg-white p-3 rounded-lg border border-slate-200">
                                        <p className="text-xs text-slate-400 uppercase">Accuracy</p>
                                        <p className="text-lg font-bold text-green-600">{student.accuracy}%</p>
                                      </div>
                                      <div className="bg-white p-3 rounded-lg border border-slate-200">
                                        <p className="text-xs text-slate-400 uppercase">Attempted</p>
                                        <p className="text-lg font-bold text-slate-800">{student.attempted}</p>
                                      </div>
                                      <div className="bg-white p-3 rounded-lg border border-slate-200">
                                        <p className="text-xs text-slate-400 uppercase">Correct Answers</p>
                                        <p className="text-lg font-bold text-slate-800">{student.correct}</p>
                                      </div>
                                      <div className="bg-white p-3 rounded-lg border border-slate-200">
                                        <p className="text-xs text-slate-400 uppercase">Wrong Answers</p>
                                        <p className="text-lg font-bold text-red-600">{student.wrong}</p>
                                      </div>
                                      <div className="bg-white p-3 rounded-lg border border-slate-200">
                                        <p className="text-xs text-slate-400 uppercase">Negative Marks</p>
                                        <p className="text-lg font-bold text-amber-600">{student.negative_marks}</p>
                                      </div>
                                      <div className="bg-white p-3 rounded-lg border border-slate-200">
                                        <p className="text-xs text-slate-400 uppercase">Risk Assessment / Band</p>
                                        <p className="text-sm font-bold text-indigo-600 mt-1 capitalize">
                                          {student.risk_exp_best || 'Normal'} ({student.band || 'N/A'})
                                        </p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Subject performance breakdown */}
                                  <div>
                                    <h3 className="text-base font-bold text-slate-800 mb-3">Subject Breakdown</h3>
                                    {student.subjects && student.subjects.length > 0 ? (
                                      <div className="space-y-3">
                                        {student.subjects.map((sub, i) => (
                                          <div key={i} className="bg-white p-3 rounded-lg border border-slate-200">
                                            <div className="flex justify-between items-center mb-1">
                                              <span className="font-semibold text-slate-800">{sub.subject_name}</span>
                                              <span className="font-bold text-blue-600">{sub.marks} / 100</span>
                                            </div>
                                            <div className="grid grid-cols-4 gap-2 text-xs text-slate-500 mt-2">
                                              <div>
                                                <span>Att: <b>{sub.attempted}</b></span>
                                              </div>
                                              <div>
                                                <span>Corr: <b>{sub.correct}</b></span>
                                              </div>
                                              <div>
                                                <span>Err: <b>{sub.errors}</b></span>
                                              </div>
                                              <div>
                                                <span>Acc: <b className="text-green-600">{sub.accuracy}%</b></span>
                                              </div>
                                            </div>
                                            <div className="mt-2 text-xs flex justify-between">
                                              <span className="font-medium text-amber-600">Risk: {sub.risk_level || 'Low'}</span>
                                              <span className="italic text-slate-400 truncate max-w-xs">{sub.remarks || 'No remarks'}</span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-sm text-slate-400 italic">No subject breakdown available.</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-500 italic">
                No matching records found in the database.
              </div>
            )}
          </SectionCard>
        </>
      )}
    </MainLayout>
  )
}

export default DatabaseView
