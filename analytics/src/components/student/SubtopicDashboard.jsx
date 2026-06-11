import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import SectionCard from '../common/SectionCard';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

export default function SubtopicDashboard({ studentId }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState('All');

  useEffect(() => {
    setLoading(true);
    api.get(`/schools/students/${studentId}/subtopics`)
      .then(res => {
        setData(res.data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Failed to load subtopic mastery data');
        setLoading(false);
      });
  }, [studentId]);

  // Aggregate data for the latest test per subtopic
  const latestSubtopics = useMemo(() => {
    if (!data.length) return [];
    const map = new Map();
    // Since data is ordered by test_id ASC, the last one seen is the latest
    data.forEach(item => {
      map.set(item.subtopic, item);
    });
    return Array.from(map.values());
  }, [data]);

  const filteredSubtopics = useMemo(() => {
    if (selectedSubject === 'All') return latestSubtopics;
    return latestSubtopics.filter(s => s.subject === selectedSubject);
  }, [latestSubtopics, selectedSubject]);

  const subjects = useMemo(() => {
    const subs = new Set(latestSubtopics.map(s => s.subject));
    return ['All', ...Array.from(subs)];
  }, [latestSubtopics]);

  // Top Strengths (Highest Accuracy)
  const strengths = useMemo(() => {
    return [...filteredSubtopics]
      .filter(s => s.accuracy >= 50)
      .sort((a, b) => b.accuracy - a.accuracy || b.total_questions - a.total_questions);
  }, [filteredSubtopics]);

  // Needs Improvement (Lowest Accuracy)
  const weaknesses = useMemo(() => {
    return [...filteredSubtopics]
      .filter(s => s.accuracy < 50) 
      .sort((a, b) => a.accuracy - b.accuracy || b.total_questions - a.total_questions);
  }, [filteredSubtopics]);

  // Mastery Distribution for Pie Chart
  const distribution = useMemo(() => {
    let excellent = 0, good = 0, needsImprovement = 0;
    filteredSubtopics.forEach(s => {
      if (s.mastery_level === 'EXCELLENT') excellent++;
      else if (s.mastery_level === 'GOOD') good++;
      else needsImprovement++;
    });
    return [
      { name: 'Excellent', value: excellent, color: '#10b981' },
      { name: 'Good', value: good, color: '#3b82f6' },
      { name: 'Needs Improvement', value: needsImprovement, color: '#f43f5e' }
    ].filter(d => d.value > 0);
  }, [filteredSubtopics]);

  // Hierarchy Data (Subject -> Chapter -> Topic -> Subtopic)
  const hierarchy = useMemo(() => {
    const tree = {};
    filteredSubtopics.forEach(s => {
      if (!tree[s.subject]) tree[s.subject] = {};
      if (!tree[s.subject][s.chapter]) tree[s.subject][s.chapter] = {};
      if (!tree[s.subject][s.chapter][s.topic]) tree[s.subject][s.chapter][s.topic] = [];
      
      tree[s.subject][s.chapter][s.topic].push(s);
    });
    return tree;
  }, [filteredSubtopics]);

  // Trend Chart Data
  const trendData = useMemo(() => {
    // Group all tests chronologically
    const testMap = {};
    data.forEach(item => {
      if (!testMap[item.test_id]) {
        testMap[item.test_id] = { name: `Test ${item.test_id}`, totalAcc: 0, count: 0 };
      }
      if (selectedSubject === 'All' || item.subject === selectedSubject) {
        testMap[item.test_id].totalAcc += item.accuracy;
        testMap[item.test_id].count += 1;
      }
    });

    return Object.values(testMap)
      .filter(t => t.count > 0)
      .map(t => ({
        name: t.name,
        'Avg Accuracy (%)': Math.round(t.totalAcc / t.count)
      }));
  }, [data, selectedSubject]);

  if (loading) return <div className="animate-pulse h-32 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center text-slate-400">Loading Concept Mastery...</div>;
  if (error) return null;
  if (!data.length) return null;

  const renderTrendBadge = (trend) => {
    if (!trend || trend === 'N/A') return null;
    if (trend === 'Improving') return <span className="text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">↑ Improving</span>;
    if (trend === 'Declining') return <span className="text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">↓ Declining</span>;
    return <span className="text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">→ Stable</span>;
  };

  const renderMasteryBadge = (level) => {
    if (level === 'EXCELLENT') return <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Excellent</span>;
    if (level === 'GOOD') return <span className="text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Good</span>;
    return <span className="text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Needs Impr.</span>;
  };

  return (
    <div className="space-y-6 mb-8 mt-12">
      <div className="flex justify-between items-end border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Concept Mastery Analytics</h2>
          <p className="text-sm text-slate-500 mt-1">Deep analysis at the Subtopic level</p>
        </div>
        <div className="flex gap-2">
          {subjects.map(sub => (
            <button
              key={sub}
              onClick={() => setSelectedSubject(sub)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${selectedSubject === sub ? 'bg-indigo-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              {sub}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Top Strengths */}
        <SectionCard title="Top Strengths" className="lg:col-span-1 border-emerald-100 bg-white">
          <div className="space-y-3 mt-2">
            {strengths.length > 0 ? strengths.map((s, idx) => (
              <div key={idx} className="flex flex-col border-b border-slate-50 pb-3 last:border-0">
                <div className="flex justify-between items-start">
                  <span className="font-bold text-slate-700 text-sm">{s.subtopic}</span>
                  <span className="text-emerald-600 font-bold">{s.accuracy}%</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-slate-400 truncate max-w-[150px]">{s.subject} &gt; {s.topic}</span>
                  <div className="flex gap-1">
                    {renderTrendBadge(s.trend)}
                    {renderMasteryBadge(s.mastery_level)}
                  </div>
                </div>
              </div>
            )) : <p className="text-slate-400 text-xs italic">Not enough data.</p>}
          </div>
        </SectionCard>

        {/* Needs Improvement */}
        <SectionCard title="Needs Improvement" className="lg:col-span-1 border-rose-100 bg-white">
          <div className="space-y-3 mt-2">
            {weaknesses.length > 0 ? weaknesses.map((s, idx) => (
              <div key={idx} className="flex flex-col border-b border-slate-50 pb-3 last:border-0">
                <div className="flex justify-between items-start">
                  <span className="font-bold text-slate-700 text-sm">{s.subtopic}</span>
                  <span className="text-rose-600 font-bold">{s.accuracy}%</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-slate-400 truncate max-w-[150px]">{s.subject} &gt; {s.topic}</span>
                  <div className="flex gap-1">
                    {renderTrendBadge(s.trend)}
                    {renderMasteryBadge(s.mastery_level)}
                  </div>
                </div>
              </div>
            )) : <p className="text-slate-400 text-xs italic">No weaknesses identified!</p>}
          </div>
        </SectionCard>

        {/* Distribution */}
        <SectionCard title="Mastery Distribution" className="lg:col-span-1 bg-white border-slate-200">
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Trend Over Time */}
        {trendData.length >= 2 && (
          <SectionCard title="Subtopic Accuracy Trend" className="lg:col-span-1 bg-white border-slate-200">
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Line type="monotone" dataKey="Avg Accuracy (%)" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        )}

        {/* Hierarchy Breakdown */}
        <SectionCard title="Complete Concept Breakdown" className={`bg-white border-slate-200 overflow-hidden ${trendData.length >= 2 ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <div className="overflow-y-auto max-h-[320px] pr-2 custom-scrollbar">
            {Object.entries(hierarchy).map(([subject, chapters]) => (
              <div key={subject} className="mb-4">
                <h3 className="font-black text-indigo-900 bg-indigo-50 px-3 py-1.5 rounded-lg text-sm sticky top-0 z-10 border border-indigo-100 shadow-sm">{subject}</h3>
                <div className="ml-2 mt-2 border-l-2 border-indigo-50 pl-3 space-y-3">
                  {Object.entries(chapters).map(([chapter, topics]) => (
                    <div key={chapter}>
                      <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-1 text-indigo-400">{chapter}</h4>
                      <div className="space-y-2 mt-1">
                        {Object.entries(topics).map(([topic, subtopics]) => (
                          <div key={topic} className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                            <h5 className="font-semibold text-slate-800 text-sm mb-2">{topic}</h5>
                            <div className="space-y-2">
                              {subtopics.map((sub, idx) => (
                                <div key={idx} className="flex items-center justify-between group">
                                  <div className="flex-1 min-w-0 pr-4">
                                    <p className="text-xs font-medium text-slate-600 truncate" title={sub.subtopic}>
                                      • {sub.subtopic}
                                    </p>
                                    <div className="w-full bg-slate-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
                                      <div 
                                        className={`h-full rounded-full ${sub.accuracy >= 75 ? 'bg-emerald-500' : sub.accuracy >= 50 ? 'bg-blue-500' : 'bg-rose-500'}`} 
                                        style={{ width: `${sub.accuracy}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <div className="text-right">
                                      <span className={`font-bold text-xs ${sub.accuracy >= 75 ? 'text-emerald-600' : sub.accuracy >= 50 ? 'text-blue-600' : 'text-rose-600'}`}>
                                        {sub.accuracy}%
                                      </span>
                                      <p className="text-[9px] text-slate-400 uppercase leading-none mt-0.5">{sub.correct_questions}/{sub.total_questions} Qs</p>
                                    </div>
                                    <div className="w-16 flex justify-end">
                                      {renderTrendBadge(sub.trend)}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
