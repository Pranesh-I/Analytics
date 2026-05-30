import { useState, useEffect, Fragment } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import api from '../services/api';
import ActionButton from '../components/common/ActionButton';
import SectionCard from '../components/common/SectionCard';
import MainLayout from '../components/layout/MainLayout';

export default function SchoolDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [school, setSchool] = useState(null);
  const [activeTab, setActiveTab] = useState('tests'); // tests, students, analytics
  const [tests, setTests] = useState([]);
  const [students, setStudents] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  
  const [showAddTestModal, setShowAddTestModal] = useState(false);
  const [newTest, setNewTest] = useState({ test_type: 'WT', test_number: '' });
  const [uploadingExcel, setUploadingExcel] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedStudentId, setExpandedStudentId] = useState(null);

  useEffect(() => {
    fetchSchoolData();
    fetchTests();
    fetchStudents();
    fetchAnalytics();
  }, [id]);

  const fetchSchoolData = async () => {
    try {
      const res = await api.get(`/schools/${id}`);
      setSchool(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchTests = async () => {
    try {
      const res = await api.get(`/schools/${id}/tests`);
      setTests(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await api.get(`/schools/${id}/students`);
      setStudents(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await api.get(`/schools/${id}/analytics`);
      setAnalytics(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreateTest = async (e) => {
    e.preventDefault();
    const payload = {
      school_id: parseInt(id),
      test_type: newTest.test_type,
      test_number: parseInt(newTest.test_number)
    };
    try {
      await api.post(`/schools/${id}/tests`, payload);
      setShowAddTestModal(false);
      fetchTests();
      fetchSchoolData(); // update test count
    } catch (error) {
      alert('Failed to create test: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleStudentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploadingExcel(true);
    try {
      const res = await axios.post(`http://localhost:8000/schools/${id}/students/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data && res.data.success) {
        alert(`Students imported successfully! Total imported: ${res.data.students_imported}`);
      } else {
        alert('Students imported successfully!');
      }
      fetchStudents();
      fetchSchoolData(); // update total student count on the page
    } catch (error) {
      console.error("Student upload error:", error);
      const errorMsg = error.response?.data?.detail || error.message || "Network Error";
      alert('Import failed: ' + errorMsg);
    } finally {
      setUploadingExcel(false);
      e.target.value = '';
    }
  };

  // Calculate summary metrics dynamically for this school
  const rankedStudents = students.filter(s => s.rank && s.rank !== 999);
  const totalStudentsCount = students.length;
  
  let classAverage = 0;
  let classAveragePercentage = 0;
  let topperName = 'N/A';
  let highestScore = 0;
  let classAccuracy = 0;
  let lowestScore = 0;

  if (rankedStudents.length > 0) {
    const totalScoreSum = rankedStudents.reduce((acc, curr) => acc + (curr.total_marks || 0), 0);
    classAverage = Math.round(totalScoreSum / rankedStudents.length);
    classAveragePercentage = ((classAverage / 300) * 100).toFixed(2);
    
    const topper = [...rankedStudents].sort((a, b) => (b.total_marks || 0) - (a.total_marks || 0))[0];
    if (topper) {
      topperName = topper.student_name;
      highestScore = topper.total_marks;
    }
    
    const accuracySum = rankedStudents.reduce((acc, curr) => acc + (parseFloat(curr.accuracy) || 0), 0);
    classAccuracy = (accuracySum / rankedStudents.length).toFixed(2);
    
    lowestScore = Math.min(...rankedStudents.map(s => s.total_marks || 0));
  }

  const toggleExpand = (studentId) => {
    setExpandedStudentId((prev) => (prev === studentId ? null : studentId));
  };

  const filteredStudents = students.filter(
    (student) =>
      student.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (student.roll_no && String(student.roll_no).toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (!school) return <div className="p-6">Loading school...</div>;

  return (
    <MainLayout>
      <div className="p-6">
        <div className="flex justify-between items-end mb-6">
          <div>
            <button onClick={() => navigate('/schools')} className="text-blue-600 hover:underline mb-2 block text-sm font-medium">
              &larr; Back to Schools
            </button>
            <h1 className="text-3xl font-bold text-slate-800">{school.school_name}</h1>
            <p className="text-slate-500">Code: {school.school_code} | Total Students: {school.student_count}</p>
          </div>
        </div>

        <div className="flex border-b border-slate-200 mb-6">
          {['tests', 'students', 'analytics'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium text-sm capitalize ${activeTab === tab ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'tests' && (
          <SectionCard title="School Tests">
            <div className="mb-4">
              <ActionButton onClick={() => setShowAddTestModal(true)} variant="primary">Create New Test</ActionButton>
            </div>
            {tests.length === 0 ? (
              <p className="text-slate-500">No tests created yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tests.map(test => (
                  <div key={test.id} onClick={() => navigate(`/tests/${test.id}`)} className="border border-slate-200 p-4 rounded-lg hover:shadow-md cursor-pointer transition bg-white">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg text-slate-800">{test.test_name}</h3>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${test.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {test.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">Type: {test.test_type} | Number: {test.test_number}</p>
                    <div className="mt-4 text-blue-600 text-sm font-medium flex items-center">
                      Open Test &rarr;
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        )}

        {activeTab === 'students' && (
          <div className="space-y-6">
            {/* Import / Upload section */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Import Student Records</h3>
                <p className="text-sm text-slate-500 mt-1">Expected columns in Excel: Roll No, Student Name, Class, Section</p>
              </div>
              <div className="relative">
                <input type="file" accept=".xlsx,.xls" onChange={handleStudentUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={uploadingExcel} />
                <ActionButton variant="primary" disabled={uploadingExcel}>
                  {uploadingExcel ? 'Importing...' : 'Upload Student Excel'}
                </ActionButton>
              </div>
            </div>

            {/* Performance Cards */}
            {students.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Students</p>
                  <p className="mt-2 text-3xl font-bold text-slate-800">{totalStudentsCount}</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Class Average</p>
                  <p className="mt-2 text-3xl font-bold text-slate-800">
                    {classAverage} <span className="text-sm font-normal text-slate-500">/ 300</span>
                  </p>
                  <p className="mt-1 text-xs text-slate-500">({classAveragePercentage}% Avg Percentage)</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Topper</p>
                  <p className="mt-2 text-xl font-bold text-blue-600 truncate">{topperName}</p>
                  <p className="mt-1 text-xs text-slate-500">Highest Score: {highestScore} / 300</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Class Accuracy</p>
                  <p className="mt-2 text-3xl font-bold text-green-600">{classAccuracy}%</p>
                  <p className="mt-1 text-xs text-slate-500">Lowest Score: {lowestScore}</p>
                </div>
              </div>
            )}

            {/* Student Standings Explorer */}
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
                        const isExpanded = expandedStudentId === student.id;
                        return (
                          <Fragment key={student.id}>
                            <tr 
                              onClick={() => toggleExpand(student.id)}
                              className={`hover:bg-slate-50 transition duration-150 cursor-pointer ${isExpanded ? 'bg-slate-50 font-medium' : ''}`}
                            >
                              <td className="px-4 py-4 font-bold text-slate-700 w-[10%]">
                                {student.rank === 999 ? '-' : `#${student.rank}`}
                              </td>
                              <td className="px-4 py-4 text-slate-600 font-medium w-[12%]">
                                {student.roll_no}
                              </td>
                              <td className="px-4 py-4 font-semibold text-slate-800 w-[20%]">
                                {student.student_name}
                              </td>
                              <td className="px-4 py-4 text-slate-500 w-[18%]">
                                {student.class_name || 'Standard 12'} - {student.section || 'A'}
                              </td>
                              <td className="px-4 py-4 text-slate-600 font-medium w-[10%]">
                                {student.phy_marks ?? 0}
                              </td>
                              <td className="px-4 py-4 text-slate-600 font-medium w-[10%]">
                                {student.che_marks ?? 0}
                              </td>
                              <td className="px-4 py-4 text-slate-600 font-medium w-[10%]">
                                {student.mat_marks ?? 0}
                              </td>
                              <td className="px-4 py-4 font-bold text-blue-600 w-[15%]">
                                {student.total_marks ?? 0} <span className="text-xs font-normal text-slate-400">/ 300</span>
                              </td>
                              <td className="px-4 py-4 w-[15%]">
                                <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                                  {student.percentage}%
                                </span>
                              </td>
                            </tr>

                            {isExpanded && (
                              <tr className="bg-slate-50 cursor-default">
                                <td colSpan={9} className="p-6 border-y border-slate-200">
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
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
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
          </div>
        )}

        {activeTab === 'analytics' && analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
              <h3 className="text-sm font-medium text-slate-500 mb-1">Total Students</h3>
              <p className="text-3xl font-bold text-slate-800">{analytics.total_students}</p>
            </div>
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
              <h3 className="text-sm font-medium text-slate-500 mb-1">Average Score</h3>
              <p className="text-3xl font-bold text-slate-800">{analytics.average_score}</p>
            </div>
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
              <h3 className="text-sm font-medium text-slate-500 mb-1">Accuracy</h3>
              <p className="text-3xl font-bold text-slate-800">{analytics.accuracy}%</p>
            </div>
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
              <h3 className="text-sm font-medium text-slate-500 mb-1">School Topper</h3>
              <p className="text-3xl font-bold text-slate-800 truncate">{analytics.topper}</p>
            </div>
          </div>
        )}

        {showAddTestModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Create New Test</h2>
              <form onSubmit={handleCreateTest}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Test Type</label>
                  <select 
                    className="w-full border border-slate-300 rounded px-3 py-2 bg-white"
                    value={newTest.test_type}
                    onChange={(e) => setNewTest({ ...newTest, test_type: e.target.value })}
                  >
                    <option value="DT">Daily Test (DT)</option>
                    <option value="WT">Weekly Test (WT)</option>
                    <option value="CT">Cumulative Test (CT)</option>
                    <option value="UT">Unit Test (UT)</option>
                    <option value="RT">Revision Test (RT)</option>
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Test Number</label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="w-full border border-slate-300 rounded px-3 py-2"
                    value={newTest.test_number}
                    onChange={(e) => setNewTest({ ...newTest, test_number: e.target.value })}
                  />
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button type="button" onClick={() => setShowAddTestModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">
                    Cancel
                  </button>
                  <ActionButton type="submit" variant="primary">
                    Create
                  </ActionButton>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
