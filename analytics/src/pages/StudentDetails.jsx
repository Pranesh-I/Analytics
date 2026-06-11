import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import SectionCard from '../components/common/SectionCard';
import SubtopicDashboard from '../components/student/SubtopicDashboard';
import MainLayout from '../components/layout/MainLayout';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

export default function StudentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    api.get(`/schools/students/${id}/analytics`)
      .then(res => {
        setData(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(err.response?.data?.detail || err.message || 'Failed to fetch student details');
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <MainLayout>
        <div className="p-8 text-center text-slate-500 font-medium animate-pulse">
          Loading student analytics profiles...
        </div>
      </MainLayout>
    );
  }

  if (error || !data) {
    return (
      <MainLayout>
        <div className="p-6">
          <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline mb-4 block text-sm font-medium">
            &larr; Back
          </button>
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
            <h3 className="font-bold text-lg mb-1">Error Fetching Student Profile</h3>
            <p>{error || 'Student details could not be found.'}</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  const { profile, overall, subjects, history } = data;

  const getRiskBadge = (risk) => {
    const riskLower = String(risk).toLowerCase();
    if (riskLower.includes('high')) {
      return (
        <span className="inline-flex items-center rounded-full bg-red-50 border border-red-200 px-3 py-1 text-sm font-bold text-red-700 shadow-sm">
          🚨 High Risk
        </span>
      );
    }
    if (riskLower.includes('medium') || riskLower.includes('moderate')) {
      return (
        <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-sm font-bold text-amber-700 shadow-sm">
          ⚠️ Medium Risk
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-full bg-green-50 border border-green-200 px-3 py-1 text-sm font-bold text-green-700 shadow-sm">
        ✅ Low Risk (Stable)
      </span>
    );
  };

  const getBandColor = (band) => {
    const b = String(band).toUpperCase();
    if (b.startsWith('A') || b.startsWith('E')) return 'text-green-600 border-green-200 bg-green-50';
    if (b.startsWith('B') || b.startsWith('C')) return 'text-blue-600 border-blue-200 bg-blue-50';
    return 'text-amber-600 border-amber-200 bg-amber-50';
  };

  // Format history for recharts to ensure numeric values
  const chartHistoryData = [...history].reverse().map(h => ({
    name: h.test_name,
    'Total Score': h.total_score || 0,
    'Accuracy (%)': h.accuracy || 0,
    Physics: h.physics || 0,
    Chemistry: h.chemistry || 0,
    Maths: h.maths || 0
  }));

  // Format subject performance for BarChart
  const subjectChartData = subjects.map(s => ({
    name: s.subject_name,
    Marks: s.marks,
    Accuracy: s.accuracy
  }));

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        {/* Navigation & Header */}
        <div className="flex justify-between items-end">
          <div>
            <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline mb-2 block text-sm font-medium">
              &larr; Back to Standings
            </button>
            <h1 className="text-3xl font-bold text-slate-800">{profile.student_name}</h1>
            <p className="text-slate-500 mt-1">
              Roll No: <span className="font-semibold text-slate-700">{profile.roll_no}</span> | 
              Class & Section: <span className="font-semibold text-slate-700">{profile.class_name || 'Standard 12'} - {profile.section || 'A'}</span> | 
              School: <span className="font-semibold text-slate-700">{profile.school_name}</span>
            </p>
          </div>
          <div>
            {getRiskBadge(overall.risk_exp_best)}
          </div>
        </div>

        {/* Overview Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overall Accuracy</p>
            <p className="mt-2 text-3xl font-bold text-green-600">{overall.average_accuracy}%</p>
            <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5">
              <div 
                className="bg-green-500 h-1.5 rounded-full" 
                style={{ width: `${Math.min(100, Math.max(0, overall.average_accuracy))}%` }}
              ></div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Average Test Score</p>
            <p className="mt-2 text-3xl font-bold text-slate-800">
              {overall.average_score} <span className="text-sm font-normal text-slate-500">/ 300</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">Calculated across {overall.total_tests} tests</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Performance Band</p>
            <div className="mt-2 flex items-center gap-2">
              <span className={`inline-flex items-center rounded-lg border px-3 py-1 text-xl font-black ${getBandColor(overall.band)}`}>
                {overall.band || 'N/A'}
              </span>
              <p className="text-xs text-slate-500 italic">Latest assessed capability band</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Academic Risk Assessment</p>
            <p className="mt-2 text-lg font-bold text-slate-800 capitalize">{overall.risk_exp_best || 'Normal'}</p>
            <p className="mt-1 text-xs text-slate-500">Based on negative marking & response errors</p>
          </div>
        </div>

        {/* Detailed Stats & Subject Breakdown Grids */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Attempt Statistics */}
          <SectionCard title="Attempt Summary" className="lg:col-span-1">
            <div className="space-y-4 py-2">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <span className="text-slate-500 font-medium">Tests Attempted</span>
                <span className="font-bold text-slate-800">{overall.total_tests}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <span className="text-slate-500 font-medium">Total Questions Attempted</span>
                <span className="font-bold text-slate-800">{overall.attempted}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <span className="text-green-600 font-medium">Correct Answers</span>
                <span className="font-bold text-green-600">{overall.correct}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <span className="text-red-500 font-medium">Wrong Answers (Errors)</span>
                <span className="font-bold text-red-500">{overall.wrong}</span>
              </div>
              <div className="flex justify-between items-center pb-1">
                <span className="text-amber-600 font-medium">Negative Marks Incurred</span>
                <span className="font-bold text-amber-600">-{overall.negative_marks}</span>
              </div>

              {/* Graphical Pie Breakdown representation inside attempt summary */}
              <div className="mt-6 border-t border-slate-100 pt-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Response Distribution</h4>
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden flex">
                    <div 
                      title={`Correct: ${overall.correct}`}
                      className="bg-green-500 h-full" 
                      style={{ width: `${overall.attempted ? (overall.correct / overall.attempted) * 100 : 0}%` }}
                    ></div>
                    <div 
                      title={`Wrong: ${overall.wrong}`}
                      className="bg-red-500 h-full" 
                      style={{ width: `${overall.attempted ? (overall.wrong / overall.attempted) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
                <div className="flex justify-between text-xs font-medium text-slate-500 mt-2">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"></span> Correct ({overall.attempted ? Math.round((overall.correct / overall.attempted) * 100) : 0}%)</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span> Errors ({overall.attempted ? Math.round((overall.wrong / overall.attempted) * 100) : 0}%)</span>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Subject Breakdown Card */}
          <SectionCard title="Subject Performance Breakdown" className="lg:col-span-2">
            {subjects && subjects.length > 0 ? (
              <div className="space-y-4">
                {subjects.map((sub, idx) => {
                  let subColorClass = 'border-indigo-100 bg-indigo-50/30 text-indigo-800';
                  let barColorClass = 'bg-indigo-500';
                  if (sub.subject_name.toLowerCase().includes('chem')) {
                    subColorClass = 'border-emerald-100 bg-emerald-50/30 text-emerald-800';
                    barColorClass = 'bg-emerald-500';
                  } else if (sub.subject_name.toLowerCase().includes('math')) {
                    subColorClass = 'border-rose-100 bg-rose-50/30 text-rose-800';
                    barColorClass = 'bg-rose-500';
                  }

                  return (
                    <div key={idx} className="border border-slate-100 rounded-xl p-4 bg-white shadow-sm hover:shadow transition duration-150">
                      <div className="flex justify-between items-center mb-2">
                        <span className={`px-2.5 py-0.5 rounded-md border text-xs font-bold ${subColorClass}`}>
                          {sub.subject_name}
                        </span>
                        <div className="text-right">
                          <span className="text-lg font-bold text-slate-800">{sub.marks}</span>
                          <span className="text-xs text-slate-400 font-normal"> / 100 avg</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-slate-500 mt-3 pt-3 border-t border-slate-50">
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-semibold">Attempted</p>
                          <p className="text-sm font-bold text-slate-700">{sub.attempted}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-semibold">Accuracy</p>
                          <p className="text-sm font-bold text-green-600">{sub.accuracy}%</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-semibold">Errors (Wrong)</p>
                          <p className="text-sm font-bold text-red-500">{sub.errors}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-semibold">Negative Marks</p>
                          <p className="text-sm font-bold text-amber-600">-{sub.negative_marks}</p>
                        </div>
                      </div>

                      <div className="mt-3 text-xs flex justify-between items-center text-slate-500 italic">
                        <span className="font-semibold text-amber-600 not-italic">Risk Level: {sub.risk_level}</span>
                        <span className="truncate max-w-xs">{sub.remarks || 'conceptual understanding stable'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-slate-400 italic text-center py-6">No subject analytics records found.</p>
            )}
          </SectionCard>
        </div>

        {/* Charts & Graphical Trend Reports */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Performance Trend Line Chart */}
          <SectionCard title="Performance Trend Over Time">
            {chartHistoryData.length > 0 ? (
              <div className="h-[320px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartHistoryData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorAccuracy" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: '#64748b', fontSize: 11 }} 
                      axisLine={{ stroke: '#cbd5e1' }}
                    />
                    <YAxis 
                      yAxisId="left"
                      tick={{ fill: '#64748b', fontSize: 11 }} 
                      axisLine={{ stroke: '#cbd5e1' }}
                      domain={[0, 300]}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      tick={{ fill: '#64748b', fontSize: 11 }} 
                      axisLine={{ stroke: '#cbd5e1' }}
                      domain={[0, 100]}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      labelStyle={{ fontWeight: 'bold', color: '#1e293b' }}
                    />
                    <Legend verticalAlign="top" height={36}/>
                    <Area 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="Total Score" 
                      stroke="#3b82f6" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorScore)" 
                    />
                    <Area 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="Accuracy (%)" 
                      stroke="#10b981" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorAccuracy)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-slate-400 italic text-center py-12">No score history records available to plot.</p>
            )}
          </SectionCard>

          {/* Subject Average Comparison Chart */}
          <SectionCard title="Subject Performance Comparison">
            {subjectChartData.length > 0 ? (
              <div className="h-[320px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={subjectChartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: '#64748b', fontSize: 12, fontWeight: 'medium' }}
                      axisLine={{ stroke: '#cbd5e1' }}
                    />
                    <YAxis 
                      tick={{ fill: '#64748b', fontSize: 11 }} 
                      axisLine={{ stroke: '#cbd5e1' }}
                      domain={[0, 100]}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                    />
                    <Legend verticalAlign="top" height={36}/>
                    <Bar 
                      dataKey="Marks" 
                      fill="#4f46e5" 
                      radius={[8, 8, 0, 0]} 
                      maxBarSize={45} 
                      name="Average Marks"
                    />
                    <Bar 
                      dataKey="Accuracy" 
                      fill="#0ea5e9" 
                      radius={[8, 8, 0, 0]} 
                      maxBarSize={45} 
                      name="Accuracy (%)"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-slate-400 italic text-center py-12">No subject marks available to compare.</p>
            )}
          </SectionCard>
        </div>

        {/* Subtopic Mastery Section */}
        <SubtopicDashboard studentId={id} />

        {/* Test History List */}
        <SectionCard title="Test Performance History">
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b divide-x divide-slate-100">
                  <th className="py-3 px-4">Test Name</th>
                  <th className="py-3 px-4">Test Date</th>
                  <th className="py-3 px-4">Total Score</th>
                  <th className="py-3 px-4">Accuracy</th>
                  <th className="py-3 px-4">Physics</th>
                  <th className="py-3 px-4">Chemistry</th>
                  <th className="py-3 px-4">Maths</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {history && history.length > 0 ? (
                  history.map((h, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition duration-150">
                      <td className="py-3 px-4 font-semibold text-slate-800">{h.test_name}</td>
                      <td className="py-3 px-4 text-slate-500">
                        {h.test_date ? new Date(h.test_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                      </td>
                      <td className="py-3 px-4 font-bold text-blue-600">{h.total_score} <span className="text-xs text-slate-400 font-normal">/ 300</span></td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                          {h.accuracy}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">{h.physics}</td>
                      <td className="py-3 px-4 text-slate-600 font-medium">{h.chemistry}</td>
                      <td className="py-3 px-4 text-slate-600 font-medium">{h.maths}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500 italic">
                      No test history records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </MainLayout>
  );
}
