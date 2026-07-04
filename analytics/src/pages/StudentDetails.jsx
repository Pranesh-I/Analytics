import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import SectionCard from '../components/common/SectionCard';
import MainLayout from '../components/layout/MainLayout';
import ErrorBoundary from '../components/common/ErrorBoundary';
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
  const [subtopics, setSubtopics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // 'combined' or a test_id string
  const [selectedTest, setSelectedTest] = useState('combined');
  const [activeSubtopicTab, setActiveSubtopicTab] = useState('Total');

  useEffect(() => {
    setLoading(true);
    api.get(`/schools/students/${id}/analytics`)
      .then(res => {
        setData(res.data);
        setLoading(false);
        // Fetch subtopics (all tests combined)
        return api.get(`/schools/students/${id}/subtopics`).catch(() => null);
      })
      .then(subRes => {
        if (subRes) setSubtopics(subRes.data);
      })
      .catch(err => {
        console.error(err);
        setError(err.response?.data?.detail || err.message || 'Failed to fetch student details');
        setLoading(false);
      });
  }, [id]);

  // When test selection changes, fetch subtopics filtered by test_id
  useEffect(() => {
    if (!data) return;
    if (selectedTest === 'combined') {
      api.get(`/schools/students/${id}/subtopics`).then(r => setSubtopics(r.data)).catch(() => {});
    } else {
      api.get(`/schools/students/${id}/subtopics?test_id=${selectedTest}`).then(r => setSubtopics(r.data)).catch(() => {});
    }
  }, [selectedTest, id, data]);

  // Prepare subtopic columns data
  const subtopicColumns = React.useMemo(() => {
    if (!subtopics || !subtopics.subtopics) return [];
    const subjects = Object.keys(subtopics.subtopics);
    if (subjects.length === 0) return [];

    let totalSubtopics = [];
    subjects.forEach(subj => {
      const rows = subtopics.subtopics[subj].map(r => ({ ...r, subject: subj }));
      totalSubtopics.push(...rows);
    });

    const columns = [
      { id: 'Total', title: 'Total', color: 'bg-slate-600', dot: 'bg-slate-500', data: totalSubtopics }
    ];

    subjects.forEach(subj => {
      columns.push({
        id: subj,
        title: subj,
        color: subj.toLowerCase().includes('phys') ? 'text-indigo-700 bg-indigo-50 border-indigo-200' :
               subj.toLowerCase().includes('chem') ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-rose-700 bg-rose-50 border-rose-200',
        dot: subj.toLowerCase().includes('phys') ? 'bg-indigo-500' :
             subj.toLowerCase().includes('chem') ? 'bg-emerald-500' : 'bg-rose-500',
        data: subtopics.subtopics[subj].map(r => ({ ...r, subject: subj }))
      });
    });

    return columns;
  }, [subtopics]);

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

  const { profile, combined, tests, history } = data;

  // Determine which view to show
  const isCombined = selectedTest === 'combined';
  const activeTestData = isCombined
    ? null
    : tests.find(t => String(t.test_id) === String(selectedTest));

  // The "overall" stats depend on the selected view
  const activeOverall = isCombined
    ? combined
    : activeTestData
      ? {
          total_tests: 1,
          average_score: activeTestData.total_score,
          average_accuracy: activeTestData.accuracy,
          attempted: activeTestData.attempted,
          correct: activeTestData.correct,
          wrong: activeTestData.wrong,
          negative_marks: activeTestData.negative_marks,
          band: activeTestData.band,
          risk_exp_best: activeTestData.risk_exp_best
        }
      : combined;

  // The subjects breakdown for the selected view
  const activeSubjects = isCombined
    ? combined.subjects
    : (activeTestData ? activeTestData.subjects : combined.subjects);

  // Percentile to display for current view
  const activePercentile = isCombined
    ? (combined.overall_estimated_percentile ?? 0)
    : (activeTestData ? (activeTestData.estimated_percentile ?? 0) : 0);

  const activePercentileLabel = isCombined
    ? (combined.overall_percentile_label || '')
    : (activeTestData ? (activeTestData.percentile_label || '') : '');

  const activePercentileNote = isCombined
    ? (combined.overall_percentile_note || '')
    : (activeTestData ? `Score: ${activeTestData.total_score ?? 'N/A'} / 300` : '');

  const getRiskBadge = (risk) => {
    const riskLower = String(risk).toLowerCase();
    if (riskLower.includes('high') || riskLower.includes('critical')) {
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
    if (b.startsWith('E')) return 'text-green-600 border-green-200 bg-green-50';
    if (b.startsWith('S') || b.startsWith('A')) return 'text-blue-600 border-blue-200 bg-blue-50';
    return 'text-amber-600 border-amber-200 bg-amber-50';
  };

  // Format history for recharts to ensure numeric values
  const chartHistoryData = [...(history || [])].reverse().map(h => ({
    name: h.test_name,
    'Total Score': h.total_score || 0,
    'Accuracy (%)': h.accuracy || 0,
    Physics: h.physics || 0,
    Chemistry: h.chemistry || 0,
    Maths: h.maths || 0
  }));

  // Format subject performance for BarChart based on active view
  const subjectChartData = activeSubjects.map(s => ({
    name: s.subject_name,
    Marks: s.marks,
    Accuracy: s.accuracy
  }));

  const getMasteryColor = (acc, correct, wrong, attempted) => {
    if ((attempted || 0) === 0) return { bg: 'bg-slate-50 border-slate-200', text: 'text-slate-500', badge: 'Not Attempted' };
    if (acc >= 75) return { bg: 'bg-green-100 border-green-300', text: 'text-green-800', badge: 'Strong' };
    if (acc >= 50) return { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800', badge: 'Moderate' };
    return { bg: 'bg-red-50 border-red-200', text: 'text-red-800', badge: 'Weak' };
  };

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
              Class &amp; Section: <span className="font-semibold text-slate-700">{profile.class_name || 'Standard 12'} - {profile.section || 'A'}</span> | 
              School: <span className="font-semibold text-slate-700">{profile.school_name}</span>
            </p>
          </div>
          <div>
            {getRiskBadge(activeOverall.risk_exp_best)}
          </div>
        </div>

        {/* ── Test Selector Tabs ── */}
        {tests && tests.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="tab-combined"
              onClick={() => setSelectedTest('combined')}
              className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all duration-150 ${
                isCombined
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
              }`}
            >
              📊 All Tests (Combined)
            </button>
            {tests.map(t => (
              <button
                key={t.test_id}
                id={`tab-test-${t.test_id}`}
                onClick={() => setSelectedTest(String(t.test_id))}
                className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all duration-150 ${
                  String(selectedTest) === String(t.test_id)
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                }`}
              >
                {t.test_name}
              </button>
            ))}
          </div>
        )}

        {/* Scope label */}
        <div className="text-xs text-slate-400 font-medium -mt-2">
          {isCombined
            ? `Showing combined view across ${combined.total_tests} test${combined.total_tests !== 1 ? 's' : ''}`
            : `Showing isolated view for: ${activeTestData?.test_name || 'Selected Test'}${activeTestData?.test_date ? ` — ${new Date(activeTestData.test_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}` : ''}`
          }
        </div>

        {/* Overview Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {isCombined ? 'Avg. Accuracy' : 'Accuracy'}
            </p>
            <p className="mt-2 text-3xl font-bold text-green-600">{activeOverall.average_accuracy}%</p>
            <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5">
              <div 
                className="bg-green-500 h-1.5 rounded-full" 
                style={{ width: `${Math.min(100, Math.max(0, activeOverall.average_accuracy))}%` }}
              ></div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {isCombined ? 'Average Test Score' : 'Test Score'}
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-800">
              {activeOverall.average_score} <span className="text-sm font-normal text-slate-500">/ 300</span>
            </p>
            {isCombined && (
              <p className="mt-1 text-xs text-slate-500">Calculated across {activeOverall.total_tests} tests</p>
            )}
          </div>

          {/* Estimated Percentile Card */}
          <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
              {isCombined ? 'Overall Est. Percentile' : 'Est. Percentile'}
            </p>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-black text-indigo-700">{activePercentile}</span>
              <span className="text-sm font-semibold text-indigo-400">%ile</span>
            </div>
            {activePercentileLabel && (
              <p className="mt-1 text-xs font-semibold text-indigo-500">{activePercentileLabel}</p>
            )}
            {activePercentileNote && (
              <p className="mt-0.5 text-[11px] text-slate-400 italic">{activePercentileNote}</p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Performance Band</p>
            <div className="mt-2 flex items-center gap-2">
              <span className={`inline-flex items-center rounded-lg border px-3 py-1 text-xl font-black ${getBandColor(activeOverall.band)}`}>
                {activeOverall.band || 'N/A'}
              </span>
            </div>
            <p className="mt-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Academic Risk</p>
            <p className="mt-1 text-sm font-bold text-slate-700 capitalize">{activeOverall.risk_exp_best || 'Normal'}</p>
          </div>
        </div>

        {/* Detailed Stats & Subject Breakdown Grids */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Attempt Statistics */}
          <SectionCard title="Attempt Summary" className="lg:col-span-1">
            <div className="space-y-4 py-2">
              {isCombined && (
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <span className="text-slate-500 font-medium">Tests Attempted</span>
                  <span className="font-bold text-slate-800">{activeOverall.total_tests}</span>
                </div>
              )}
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <span className="text-slate-500 font-medium">Total Questions Attempted</span>
                <span className="font-bold text-slate-800">{activeOverall.attempted}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <span className="text-green-600 font-medium">Correct Answers</span>
                <span className="font-bold text-green-600">{activeOverall.correct}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <span className="text-red-500 font-medium">Wrong Answers (Errors)</span>
                <span className="font-bold text-red-500">{activeOverall.wrong}</span>
              </div>
              <div className="flex justify-between items-center pb-1">
                <span className="text-amber-600 font-medium">Negative Marks Incurred</span>
                <span className="font-bold text-amber-600">-{activeOverall.negative_marks}</span>
              </div>

              {/* Response Distribution bar */}
              <div className="mt-6 border-t border-slate-100 pt-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Response Distribution</h4>
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden flex">
                    <div 
                      title={`Correct: ${activeOverall.correct}`}
                      className="bg-green-500 h-full transition-all duration-300" 
                      style={{ width: `${activeOverall.attempted ? (activeOverall.correct / activeOverall.attempted) * 100 : 0}%` }}
                    ></div>
                    <div 
                      title={`Wrong: ${activeOverall.wrong}`}
                      className="bg-red-500 h-full transition-all duration-300" 
                      style={{ width: `${activeOverall.attempted ? (activeOverall.wrong / activeOverall.attempted) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
                <div className="flex justify-between text-xs font-medium text-slate-500 mt-2">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"></span> Correct ({activeOverall.attempted ? Math.round((activeOverall.correct / activeOverall.attempted) * 100) : 0}%)</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span> Errors ({activeOverall.attempted ? Math.round((activeOverall.wrong / activeOverall.attempted) * 100) : 0}%)</span>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Subject Breakdown Card */}
          <SectionCard title="Subject Performance Breakdown" className="lg:col-span-2">
            {activeSubjects && activeSubjects.length > 0 ? (
              <div className="space-y-4">
                {activeSubjects.map((sub, idx) => {
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
                          <span className="text-xs text-slate-400 font-normal"> / 100{isCombined ? ' avg' : ''}</span>
                        </div>
                      </div>

                      {/* Accuracy bar */}
                      <div className="w-full bg-slate-100 rounded-full h-1.5 mb-3">
                        <div
                          className={`${barColorClass} h-1.5 rounded-full transition-all duration-300`}
                          style={{ width: `${Math.min(100, sub.accuracy || 0)}%` }}
                        ></div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-slate-500 pt-2 border-t border-slate-50">
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
          {/* Performance Trend Line Chart — always shows full history */}
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

          {/* Subject Average Comparison Chart — reflects active scope */}
          <SectionCard title={isCombined ? 'Subject Performance Comparison (Combined)' : `Subject Comparison — ${activeTestData?.test_name || ''}`}>
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
                      name="Marks"
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

                {/* Subtopic Analysis Section */}
        <ErrorBoundary fallback={
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-6 text-center">
            <h3 className="font-bold text-red-600 mb-2">Error Loading Subtopic Analysis</h3>
            <p className="text-slate-500 text-sm">Something went wrong while rendering subtopics. Please refresh or contact support.</p>
          </div>
        }>
          <SectionCard title="Subtopic-wise Analysis">
          {subtopicColumns.length > 0 ? (
            <div className="mt-2 flex flex-col h-full">
              {/* Mobile Tabs */}
              <div className="lg:hidden flex overflow-x-auto pb-3 mb-3 gap-2 border-b border-slate-200 hide-scrollbar">
                {subtopicColumns.map(col => (
                  <button
                    key={`tab-${col.id}`}
                    onClick={() => setActiveSubtopicTab(col.id)}
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
                      activeSubtopicTab === col.id 
                        ? 'bg-slate-800 text-white' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {col.title}
                  </button>
                ))}
              </div>

              {/* Columns Container */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-grow">
                {subtopicColumns.map(col => {
                  // Only show active tab on mobile, show all on desktop
                  const isVisible = activeSubtopicTab === col.id;
                  
                  // Calculate summary for this column
                  const summary = { strong: 0, moderate: 0, weak: 0, unattempted: 0 };
                  col.data.forEach(row => {
                    if ((row.attempted || 0) === 0) summary.unattempted++;
                    else if (row.accuracy >= 75) summary.strong++;
                    else if (row.accuracy >= 50) summary.moderate++;
                    else summary.weak++;
                  });
                  const totalCount = col.data.length;

                  return (
                    <div key={`col-${col.id}`} className={`${isVisible ? 'flex' : 'hidden lg:flex'} flex-col h-[550px]`}>
                      {/* Column Header */}
                      <div className="mb-3 shrink-0">
                        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                          {col.title !== 'Total' && <span className={`w-2 h-2 rounded-full inline-block ${col.dot}`}></span>}
                          {col.title} <span className="text-xs text-slate-400 font-normal normal-case">({totalCount})</span>
                        </h3>
                        
                        {/* Stacked Bar Summary */}
                        {totalCount > 0 && (
                          <div className="w-full h-2.5 flex rounded-full overflow-hidden bg-slate-100 gap-0.5">
                            {summary.strong > 0 && <div style={{width: `${(summary.strong/totalCount)*100}%`}} className="bg-green-500" title={`Strong: ${summary.strong}`} />}
                            {summary.moderate > 0 && <div style={{width: `${(summary.moderate/totalCount)*100}%`}} className="bg-amber-400" title={`Moderate: ${summary.moderate}`} />}
                            {summary.weak > 0 && <div style={{width: `${(summary.weak/totalCount)*100}%`}} className="bg-red-500" title={`Weak: ${summary.weak}`} />}
                            {summary.unattempted > 0 && <div style={{width: `${(summary.unattempted/totalCount)*100}%`}} className="bg-slate-300" title={`Not Attempted: ${summary.unattempted}`} />}
                          </div>
                        )}
                        <div className="flex justify-between text-[10px] text-slate-400 font-medium mt-1.5 px-1">
                          <span className="text-green-600">{summary.strong}</span>
                          <span className="text-amber-500">{summary.moderate}</span>
                          <span className="text-red-500">{summary.weak}</span>
                          <span className="text-slate-400">{summary.unattempted}</span>
                        </div>
                      </div>

                      {/* Scrollable Subtopic List */}
                      <div className="flex-grow overflow-y-auto pr-2 space-y-2 custom-scrollbar pb-4">
                        {col.data.map((row, i) => {
                          const mc = getMasteryColor(row.accuracy, row.correct, row.wrong, row.attempted);
                          const totalAttempts = (row.correct || 0) + (row.wrong || 0);
                          const isUnattempted = (row.attempted || 0) === 0;
                          
                          return (
                            <div key={i} className={`rounded-xl border p-3 ${mc.bg}`}>
                              <div className="flex justify-between items-start gap-2 mb-2">
                                <p className={`text-xs font-semibold ${mc.text} leading-tight`}>
                                  {col.id === 'Total' && (
                                    <span className="text-[10px] opacity-70 uppercase block mb-0.5 font-bold tracking-wider">{row.subject}</span>
                                  )}
                                  {row.subtopic}
                                </p>
                              </div>
                              <div className="flex justify-between items-end">
                                <div className="flex gap-3 text-xs text-slate-500 font-medium bg-white/50 px-2 py-1 rounded-md">
                                  <span className="text-green-600" title="Correct">✅ {row.correct || 0}</span>
                                  <span className="text-red-500" title="Wrong">❌ {row.wrong || 0}</span>
                                  <span className="text-slate-600 border-l border-slate-300 pl-3" title="Total Attempts">Σ {totalAttempts}</span>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap ${
                                    isUnattempted ? 'bg-slate-200 text-slate-600' :
                                    row.accuracy >= 75 ? 'bg-green-200 text-green-800' :
                                    row.accuracy >= 50 ? 'bg-amber-100 text-amber-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {mc.badge}
                                  </span>
                                  <span className={`font-bold text-sm ${isUnattempted ? 'text-slate-400' : 'text-slate-700'}`}>
                                    {isUnattempted ? '-' : `${row.accuracy}%`}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="py-10 text-center">
              <p className="text-slate-400 italic text-sm">
                No subtopic data available for this view. Re-run analytics to populate subtopic mastery.
              </p>
              <p className="text-slate-300 text-xs mt-1">
                Subtopic data is computed during the analytics generation pipeline.
              </p>
            </div>
          )}
        </SectionCard>
        </ErrorBoundary>

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
                  <th className="py-3 px-4">Est. Percentile</th>
                  <th className="py-3 px-4">Physics</th>
                  <th className="py-3 px-4">Chemistry</th>
                  <th className="py-3 px-4">Maths</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {tests && tests.length > 0 ? (
                  tests.map((t, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition duration-150">
                      <td className="py-3 px-4 font-semibold text-slate-800">{t.test_name}</td>
                      <td className="py-3 px-4 text-slate-500">
                        {t.test_date ? new Date(t.test_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                      </td>
                      <td className="py-3 px-4 font-bold text-blue-600">{t.total_score} <span className="text-xs text-slate-400 font-normal">/ 300</span></td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                          {t.accuracy}%
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-indigo-700">{t.estimated_percentile ?? '—'}%ile</span>
                          {t.percentile_label && (
                            <span className="text-[11px] text-indigo-400">{t.percentile_label}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">{t.physics}</td>
                      <td className="py-3 px-4 text-slate-600 font-medium">{t.chemistry}</td>
                      <td className="py-3 px-4 text-slate-600 font-medium">{t.maths}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500 italic">
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
