import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import MainLayout from '../components/layout/MainLayout';
import SectionCard from '../components/common/SectionCard';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis
} from 'recharts';

// Global styling constants
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const RISK_COLORS = {
  'Low Risk': '#10b981',
  'Medium Risk': '#f59e0b',
  'High Risk': '#ef4444'
};
const PERF_COLORS = {
  'Excellent': '#10b981',
  'Good': '#6366f1',
  'Average': '#f59e0b',
  'Needs Improvement': '#ef4444'
};

export default function Comparison() {
  const navigate = useNavigate();

  // Tab State: 'school' or 'student'
  const [activeTab, setActiveTab] = useState('school');

  // Filters State
  const [testType, setTestType] = useState('');
  const [testNumber, setTestNumber] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Data States
  const [schools, setSchools] = useState([]);
  const [students, setStudents] = useState([]);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedSchoolId, setSelectedSchoolId] = useState('');

  // Search & Pagination inside minimal Student table
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Load all schools on mount or filter change
  useEffect(() => {
    fetchSchools();
  }, [testType, testNumber, startDate, endDate]);

  // Load students when selected school or filters change
  useEffect(() => {
    if (selectedSchoolId) {
      fetchStudents(selectedSchoolId);
    } else {
      setStudents([]);
    }
  }, [selectedSchoolId, testType, testNumber, startDate, endDate]);

  const getFilterParams = () => {
    const params = {};
    if (testType) params.test_type = testType;
    if (testNumber) params.test_number = parseInt(testNumber);
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    return params;
  };

  const fetchSchools = async () => {
    setLoadingSchools(true);
    try {
      const response = await api.get('/comparison/schools', { params: getFilterParams() });
      const data = response.data;
      setSchools(data);
      if (data.length > 0 && !selectedSchoolId) {
        setSelectedSchoolId(data[0].school_id);
      }
    } catch (error) {
      console.error('Failed to fetch school comparisons', error);
    } finally {
      setLoadingSchools(false);
    }
  };

  const fetchStudents = async (schoolId) => {
    setLoadingStudents(true);
    try {
      const response = await api.get(`/comparison/schools/${schoolId}/students`, { params: getFilterParams() });
      setStudents(response.data);
      setCurrentPage(1);
    } catch (error) {
      console.error('Failed to fetch student comparisons', error);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleClearFilters = () => {
    setTestType('');
    setTestNumber('');
    setStartDate('');
    setEndDate('');
  };

  // -------------------------------------------------------------
  // SCHOOL CALCULATIONS & INSIGHTS DERIVATIONS
  // -------------------------------------------------------------
  const schoolKPIs = useMemo(() => {
    if (schools.length === 0) return null;

    let bestSchool = schools[0];
    let lowestSchool = schools[0];
    let highestRiskSchool = schools[0];
    let totalScoreSum = 0;
    let totalPassSum = 0;
    let highRiskCount = 0;

    schools.forEach(school => {
      if (school.average_score > bestSchool.average_score) {
        bestSchool = school;
      }
      if (school.average_score < lowestSchool.average_score) {
        lowestSchool = school;
      }
      if (school.risk_percentage > highestRiskSchool.risk_percentage) {
        highestRiskSchool = school;
      }
      totalScoreSum += school.average_score;
      totalPassSum += school.pass_percentage;
      if (school.risk_percentage > 25) {
        highRiskCount++;
      }
    });

    // Check if there's any school that improved (trend_direction === 'up')
    const improvedSchool = schools.find(s => s.trend_direction === 'up') || null;

    return {
      bestSchool,
      lowestSchool,
      highestRiskSchool,
      improvedSchool,
      avgScore: (totalScoreSum / schools.length).toFixed(2),
      avgPass: (totalPassSum / schools.length).toFixed(2),
      totalSchools: schools.length,
      highRiskCount
    };
  }, [schools]);

  // School Performance Ranking (Sorted Descending)
  const schoolRankingData = useMemo(() => {
    return [...schools].sort((a, b) => b.average_score - a.average_score);
  }, [schools]);

  // School Risk Donut Data
  const schoolRiskDonutData = useMemo(() => {
    let low = 0;
    let medium = 0;
    let high = 0;

    schools.forEach(s => {
      if (s.risk_percentage > 25) high++;
      else if (s.risk_percentage > 10) medium++;
      else low++;
    });

    const total = schools.length || 1;
    return [
      { name: 'Low Risk Schools', value: low, percentage: ((low / total) * 100).toFixed(1) },
      { name: 'Medium Risk Schools', value: medium, percentage: ((medium / total) * 100).toFixed(1) },
      { name: 'High Risk Schools', value: high, percentage: ((high / total) * 100).toFixed(1) }
    ];
  }, [schools]);

  // Custom Scatter Tooltip
  const CustomScatterTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-xl shadow-lg text-xs font-semibold space-y-1">
          <p className="text-slate-800 font-extrabold text-sm border-b pb-1 mb-1">{data.school_name}</p>
          <p className="text-slate-500">Pass Percentage: <span className="text-emerald-600 font-extrabold">{data.pass_percentage}%</span></p>
          <p className="text-slate-500">Average Score: <span className="text-indigo-600 font-extrabold">{data.average_score}</span></p>
          <p className="text-slate-500">Student Count: <span className="text-violet-600 font-extrabold">{data.total_students}</span></p>
        </div>
      );
    }
    return null;
  };

  const getStudentRisk = (avgScore) => {
    const score = avgScore !== undefined && avgScore !== null ? avgScore : 0;
    const pct = (score / 300) * 100;
    if (pct >= 75) return 'Low';
    if (pct >= 50) return 'Medium';
    return 'High';
  };

  // -------------------------------------------------------------
  // STUDENT CALCULATIONS & KPI DERIVATIONS
  // -------------------------------------------------------------
  const studentKPIs = useMemo(() => {
    if (students.length === 0) return null;

    let topPerformer = students[0];
    let lowestPerformer = students[0];
    let scoreSum = 0;
    let passSum = 0;

    students.forEach(student => {
      if (student.average_score > topPerformer.average_score) {
        topPerformer = student;
      }
      if (student.average_score < lowestPerformer.average_score) {
        lowestPerformer = student;
      }
      scoreSum += student.average_score;
      passSum += student.pass_percentage;
    });

    return {
      topPerformer,
      lowestPerformer,
      classAvg: (scoreSum / students.length).toFixed(2),
      passPercentage: (passSum / students.length).toFixed(2)
    };
  }, [students]);

  // Student ranking Top 10 Horizontal (Sorted Descending)
  const studentRankingTop10 = useMemo(() => {
    return [...students]
      .sort((a, b) => b.average_score - a.average_score)
      .slice(0, 10);
  }, [students]);

  // Performance Distribution Donut
  const studentPerfDonutData = useMemo(() => {
    let excellent = 0;
    let good = 0;
    let average = 0;
    let needsImp = 0;

    students.forEach(s => {
      const pct = (s.average_score / 300) * 100;
      if (pct > 85) excellent++;
      else if (pct >= 70) good++;
      else if (pct >= 50) average++;
      else needsImp++;
    });

    const total = students.length || 1;
    return [
      { name: 'Excellent', value: excellent, percentage: ((excellent / total) * 100).toFixed(1) },
      { name: 'Good', value: good, percentage: ((good / total) * 100).toFixed(1) },
      { name: 'Average', value: average, percentage: ((average / total) * 100).toFixed(1) },
      { name: 'Needs Improvement', value: needsImp, percentage: ((needsImp / total) * 100).toFixed(1) }
    ];
  }, [students]);

  // Risk Distribution Donut
  const studentRiskDonutData = useMemo(() => {
    let low = 0;
    let medium = 0;
    let high = 0;

    students.forEach(s => {
      const risk = getStudentRisk(s.average_score);
      if (risk === 'High') high++;
      else if (risk === 'Medium') medium++;
      else low++;
    });

    const total = students.length || 1;
    return [
      { name: 'Low Risk', value: low, percentage: ((low / total) * 100).toFixed(1) },
      { name: 'Medium Risk', value: medium, percentage: ((medium / total) * 100).toFixed(1) },
      { name: 'High Risk', value: high, percentage: ((high / total) * 100).toFixed(1) }
    ];
  }, [students]);

  // Processed Students list (Minimal search/rank calculation)
  const processedStudents = useMemo(() => {
    let result = students.filter(student => {
      const term = searchTerm.toLowerCase();
      return (
        student.student_name.toLowerCase().includes(term) ||
        (student.roll_number && student.roll_number.toLowerCase().includes(term))
      );
    });

    // Default Sort: Highest average score first
    result.sort((a, b) => b.average_score - a.average_score);
    return result;
  }, [students, searchTerm]);

  // Map absolute rank
  const studentRankMap = useMemo(() => {
    const sorted = [...students].sort((a, b) => b.average_score - a.average_score);
    const map = {};
    sorted.forEach((student, idx) => {
      map[student.student_id] = idx + 1;
    });
    return map;
  }, [students]);

  // Pagination for Minimal Student Table
  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return processedStudents.slice(startIndex, startIndex + itemsPerPage);
  }, [processedStudents, currentPage]);

  const totalPages = Math.ceil(processedStudents.length / itemsPerPage);

  const selectedSchoolName = useMemo(() => {
    const school = schools.find(s => s.school_id === selectedSchoolId);
    return school ? school.school_name : 'Selected School';
  }, [schools, selectedSchoolId]);

  return (
    <MainLayout>
      <div className="p-6 space-y-8 bg-slate-50 min-h-screen">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 border-b border-slate-200 pb-5">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight bg-gradient-to-r from-indigo-600 via-violet-700 to-purple-800 bg-clip-text text-transparent">
              Comparison Hub
            </h1>
            <p className="text-slate-500 mt-1 text-sm font-medium">
              Analyze metrics, comparative standings, and school performance matrices in one space.
            </p>
          </div>

          {/* Segmented Control Toggle / Tabs */}
          <div className="flex bg-slate-200/80 p-1.5 rounded-2xl border border-slate-300/40 shadow-inner self-start md:self-center">
            <button
              onClick={() => setActiveTab('school')}
              className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 ${
                activeTab === 'school'
                  ? 'bg-white text-indigo-700 shadow-md transform scale-102'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              School Comparison
            </button>
            <button
              onClick={() => setActiveTab('student')}
              className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 ${
                activeTab === 'student'
                  ? 'bg-white text-indigo-700 shadow-md transform scale-102'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Student Comparison
            </button>
          </div>
        </div>

        {/* Global Filter Bar */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 transition duration-300">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
              Comparison Filters
            </span>
            {(testType || testNumber || startDate || endDate) && (
              <button 
                onClick={handleClearFilters}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition"
              >
                Clear Filters
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Test Type</label>
              <select 
                value={testType}
                onChange={(e) => setTestType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition"
              >
                <option value="">All Types</option>
                <option value="DT">Daily Test (DT)</option>
                <option value="WT">Weekly Test (WT)</option>
                <option value="CT">Cumulative Test (CT)</option>
                <option value="UT">Unit Test (UT)</option>
                <option value="RT">Revision Test (RT)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Test Number</label>
              <input 
                type="number"
                placeholder="e.g. 1"
                value={testNumber}
                onChange={(e) => setTestNumber(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Start Date</label>
              <input 
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">End Date</label>
              <input 
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition"
              />
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* VIEW 1: SCHOOL COMPARISON (Executive Insights Focused) */}
        {/* ============================================================== */}
        {activeTab === 'school' && (
          <div className="space-y-8">
            
            {loadingSchools ? (
              <div className="p-12 text-center text-slate-400 font-semibold animate-pulse">
                Aggregating executive school metrics...
              </div>
            ) : !schoolKPIs ? (
              <div className="p-12 bg-white rounded-2xl text-center border text-slate-400 italic">
                No school comparison data available.
              </div>
            ) : (
              <>
                {/* KPI Cards Row */}
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                  
                  {/* Card 1 */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
                    <span className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Best School</span>
                    <h4 className="text-sm font-black text-slate-800 truncate mt-1">{schoolKPIs.bestSchool.school_name}</h4>
                    <p className="text-xs text-slate-500 mt-2">Avg: <span className="font-bold text-indigo-600">{schoolKPIs.bestSchool.average_score}</span></p>
                  </div>

                  {/* Card 2 */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
                    <span className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Lowest School</span>
                    <h4 className="text-sm font-black text-slate-800 truncate mt-1">{schoolKPIs.lowestSchool.school_name}</h4>
                    <p className="text-xs text-slate-500 mt-2">Avg: <span className="font-bold text-rose-500">{schoolKPIs.lowestSchool.average_score}</span></p>
                  </div>

                  {/* Card 3 */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
                    <span className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Overall Avg Score</span>
                    <h4 className="text-xl font-black text-slate-800 mt-1">{schoolKPIs.avgScore}</h4>
                    <p className="text-[9px] text-slate-400 mt-2">Scale: 0 - 300</p>
                  </div>

                  {/* Card 4 */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
                    <span className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Overall Pass %</span>
                    <h4 className="text-xl font-black text-emerald-600 mt-1">{schoolKPIs.avgPass}%</h4>
                    <p className="text-[9px] text-slate-400 mt-2">Target &gt;= 50%</p>
                  </div>

                  {/* Card 5 */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
                    <span className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">High Risk Schools</span>
                    <h4 className={`text-xl font-black mt-1 ${schoolKPIs.highRiskCount > 0 ? 'text-rose-600' : 'text-slate-800'}`}>{schoolKPIs.highRiskCount}</h4>
                    <p className="text-[9px] text-slate-400 mt-2">Risk rate &gt; 25%</p>
                  </div>

                  {/* Card 6 */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
                    <span className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Total Schools</span>
                    <h4 className="text-xl font-black text-slate-800 mt-1">{schoolKPIs.totalSchools}</h4>
                    <p className="text-[9px] text-slate-400 mt-2">Registered states</p>
                  </div>
                </div>

                {/* Key Insights Section */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Key Executive Insights</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    
                    {/* Insight 1 */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow transition flex gap-3 items-center">
                      <span className="text-2xl">🏆</span>
                      <div>
                        <h4 className="font-extrabold text-slate-800 text-xs truncate max-w-[190px]">{schoolKPIs.bestSchool.school_name}</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">Highest Average Score ({((schoolKPIs.bestSchool.average_score / 300) * 100).toFixed(0)}%)</p>
                      </div>
                    </div>

                    {/* Insight 2 */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow transition flex gap-3 items-center">
                      <span className="text-2xl text-rose-500">⚠️</span>
                      <div>
                        <h4 className="font-extrabold text-slate-800 text-xs truncate max-w-[190px]">{schoolKPIs.highestRiskSchool.school_name}</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">Highest Risk Rate ({schoolKPIs.highestRiskSchool.risk_percentage}%)</p>
                      </div>
                    </div>

                    {/* Insight 3 */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow transition flex gap-3 items-center">
                      <span className="text-2xl text-emerald-500">📈</span>
                      <div>
                        <h4 className="font-extrabold text-slate-800 text-xs truncate max-w-[190px]">
                          {schoolKPIs.improvedSchool ? schoolKPIs.improvedSchool.school_name : schoolKPIs.bestSchool.school_name}
                        </h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {schoolKPIs.improvedSchool ? 'Positive growth trend detected' : 'Demonstrating stable leadership'}
                        </p>
                      </div>
                    </div>

                    {/* Insight 4 */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow transition flex gap-3 items-center">
                      <span className="text-2xl text-amber-500">📉</span>
                      <div>
                        <h4 className="font-extrabold text-slate-800 text-xs truncate max-w-[190px]">{schoolKPIs.lowestSchool.school_name}</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">Requires immediate intervention</p>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Graph 1 – School Performance Ranking (Horizontal Bar Chart) */}
                <SectionCard title="School Performance Ranking (Average Score)">
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={schoolRankingData}
                        layout="vertical"
                        margin={{ top: 10, right: 30, left: 50, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                        <XAxis type="number" domain={[0, 300]} tick={{ fill: '#64748b', fontSize: 11 }} />
                        <YAxis 
                          dataKey="school_name" 
                          type="category" 
                          tick={{ fill: '#475569', fontSize: 10, fontWeight: 'bold' }} 
                          width={90}
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                          formatter={(value) => [`${value} / 300`, 'Average Score']}
                        />
                        <Bar dataKey="average_score" fill="#6366f1" radius={[0, 6, 6, 0]} maxBarSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>

                {/* Graph 2 & 3: Pass % Comparison & Risk Analysis side by side */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Pass Percentage Bar Chart */}
                  <SectionCard title="Pass Percentage Comparison">
                    <div className="h-[280px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={schools}
                          margin={{ top: 15, right: 30, left: 10, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis 
                            dataKey="school_name" 
                            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'medium' }}
                            axisLine={{ stroke: '#cbd5e1' }}
                          />
                          <YAxis 
                            tick={{ fill: '#64748b', fontSize: 10 }} 
                            axisLine={{ stroke: '#cbd5e1' }}
                            domain={[0, 100]}
                          />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                            formatter={(value) => [`${value}%`, 'Pass %']}
                          />
                          <Bar 
                            dataKey="pass_percentage" 
                            fill="#10b981" 
                            radius={[6, 6, 0, 0]} 
                            maxBarSize={45} 
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </SectionCard>

                  {/* Risk Analysis Donut Chart */}
                  <SectionCard title="Risk Analysis">
                    <div className="flex flex-col sm:flex-row items-center justify-around h-[280px]">
                      <div className="h-[180px] w-[180px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={schoolRiskDonutData}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={70}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {schoolRiskDonutData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={RISK_COLORS[entry.name.replace(' Schools', '')] || COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value, name, props) => [`${value} schools (${props.payload.percentage}%)`, name]} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-2 mt-4 sm:mt-0 font-medium text-xs">
                        {schoolRiskDonutData.map((d, index) => (
                          <div key={d.name} className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: RISK_COLORS[d.name.replace(' Schools', '')] }}></span>
                            <span className="text-slate-600 font-semibold">{d.name}:</span>
                            <span className="text-slate-800 font-extrabold">{d.value}</span>
                            <span className="text-xs text-slate-400">({d.percentage}%)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </SectionCard>
                </div>

                {/* Graph 4 – School Performance Matrix (Scatter/Bubble Chart) */}
                <SectionCard title="School Performance Matrix (Pass % vs Avg Score)">
                  <div className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 20, right: 35, bottom: 20, left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis 
                          type="number" 
                          dataKey="pass_percentage" 
                          name="Pass Rate" 
                          unit="%" 
                          domain={[40, 100]}
                          tick={{ fill: '#64748b', fontSize: 10 }}
                        />
                        <YAxis 
                          type="number" 
                          dataKey="average_score" 
                          name="Average Score" 
                          domain={[100, 300]}
                          tick={{ fill: '#64748b', fontSize: 10 }}
                        />
                        <ZAxis 
                          type="number" 
                          dataKey="total_students" 
                          range={[60, 400]} 
                          name="StudentsCount" 
                        />
                        <Tooltip content={<CustomScatterTooltip />} />
                        <Scatter name="Schools" data={schools} fill="#8b5cf6">
                          {schools.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-[10px] text-slate-400 italic mt-2 text-right">
                    💡 Bubble size corresponds directly to the total student strength inside that specific school.
                  </p>
                </SectionCard>

              </>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 2: STUDENT COMPARISON (Minimal & Clean) */}
        {/* ============================================================== */}
        {activeTab === 'student' && (
          <div className="space-y-8">
            
            {/* School Dropdown */}
            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-extrabold text-slate-800 text-base">Select Comparison Context</h3>
                <p className="text-slate-400 text-xs mt-0.5">Pick a school to automatically load its student profiles.</p>
              </div>
              <select 
                value={selectedSchoolId}
                onChange={(e) => setSelectedSchoolId(e.target.value)}
                className="bg-slate-50 border border-slate-200 shadow-sm rounded-xl px-4 py-2.5 text-slate-700 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition cursor-pointer w-full sm:w-72"
              >
                {schools.map(s => (
                  <option key={s.school_id} value={s.school_id}>
                    {s.school_name}
                  </option>
                ))}
              </select>
            </div>

            {loadingStudents ? (
              <div className="p-12 text-center text-slate-400 font-semibold animate-pulse">
                Loading student records...
              </div>
            ) : !studentKPIs ? (
              <div className="p-12 bg-white rounded-2xl text-center border text-slate-400 italic">
                No student comparison records found.
              </div>
            ) : (
              <>
                {/* KPI Cards Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  
                  {/* Top Performer */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Top Performer</span>
                    <h3 className="text-base font-extrabold text-slate-800 mt-1.5 truncate" title={studentKPIs.topPerformer.student_name}>
                      {studentKPIs.topPerformer.student_name}
                    </h3>
                    <p className="text-lg font-black text-emerald-600 mt-2">{studentKPIs.topPerformer.average_score} <span className="text-xs font-normal text-slate-400">/ 300</span></p>
                  </div>

                  {/* Lowest Performer */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Lowest Performer</span>
                    <h3 className="text-base font-extrabold text-slate-800 mt-1.5 truncate" title={studentKPIs.lowestPerformer.student_name}>
                      {studentKPIs.lowestPerformer.student_name}
                    </h3>
                    <p className="text-lg font-black text-rose-500 mt-2">{studentKPIs.lowestPerformer.average_score} <span className="text-xs font-normal text-slate-400">/ 300</span></p>
                  </div>

                  {/* Class Average */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Class Average Score</span>
                    <h3 className="text-2xl font-black text-slate-800 mt-1.5">{studentKPIs.classAvg}</h3>
                    <p className="text-xs text-slate-500 mt-2">Overall standard mean</p>
                  </div>

                  {/* Pass Percentage */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Pass Percentage</span>
                    <h3 className="text-2xl font-black text-indigo-600 mt-1.5">{studentKPIs.passPercentage}%</h3>
                    <p className="text-xs text-slate-500 mt-2">Class success index</p>
                  </div>

                </div>

                {/* Graph 1 – Student Ranking (Top 10 Students Horizontal) */}
                <SectionCard title={`Top 10 Students - ${selectedSchoolName}`}>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={studentRankingTop10}
                        layout="vertical"
                        margin={{ top: 10, right: 30, left: 50, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                        <XAxis type="number" domain={[0, 300]} tick={{ fill: '#64748b', fontSize: 11 }} />
                        <YAxis 
                          dataKey="student_name" 
                          type="category" 
                          tick={{ fill: '#475569', fontSize: 10, fontWeight: 'bold' }} 
                          width={85}
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                          formatter={(value) => [value, 'Average Score']}
                        />
                        <Bar dataKey="average_score" fill="#10b981" radius={[0, 6, 6, 0]} maxBarSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>

                {/* Graph 2 & 3: Performance Distribution & Risk Distribution side by side */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Performance Distribution Donut */}
                  <SectionCard title="Performance Distribution">
                    <div className="flex flex-col sm:flex-row items-center justify-around h-[280px]">
                      <div className="h-[180px] w-[180px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={studentPerfDonutData}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={70}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {studentPerfDonutData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={PERF_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value, name, props) => [`${value} students (${props.payload.percentage}%)`, name]} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-2 mt-4 sm:mt-0 font-medium text-xs">
                        {studentPerfDonutData.map((d, index) => (
                          <div key={d.name} className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: PERF_COLORS[d.name] }}></span>
                            <span className="text-slate-600 font-semibold">{d.name}:</span>
                            <span className="text-slate-800 font-extrabold">{d.value}</span>
                            <span className="text-xs text-slate-400">({d.percentage}%)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </SectionCard>

                  {/* Risk Distribution Donut */}
                  <SectionCard title="Risk Distribution">
                    <div className="flex flex-col sm:flex-row items-center justify-around h-[280px]">
                      <div className="h-[180px] w-[180px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={studentRiskDonutData}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={70}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {studentRiskDonutData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={RISK_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value, name, props) => [`${value} students (${props.payload.percentage}%)`, name]} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-2 mt-4 sm:mt-0 font-medium text-xs">
                        {studentRiskDonutData.map((d, index) => (
                          <div key={d.name} className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: RISK_COLORS[d.name] }}></span>
                            <span className="text-slate-600 font-semibold">{d.name}:</span>
                            <span className="text-slate-800 font-extrabold">{d.value}</span>
                            <span className="text-xs text-slate-400">({d.percentage}%)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </SectionCard>

                </div>

                {/* Minimal Student Ranking Table */}
                <SectionCard title="Student Standings Table">
                  <div className="space-y-4">
                    
                    {/* Minimal Search and counts */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="relative flex-1 max-w-sm">
                        <input 
                          type="text"
                          placeholder="Search student or roll number..."
                          value={searchTerm}
                          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-slate-700 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                        />
                        <span className="absolute left-3.5 top-2.5 text-slate-400">🔍</span>
                      </div>
                      <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                        Matched: {processedStudents.length}
                      </div>
                    </div>

                    {/* Table markup */}
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b divide-x divide-slate-100">
                            <th className="py-3 px-4 w-20 text-center">Rank</th>
                            <th className="py-3 px-4">Student</th>
                            <th className="py-3 px-4 text-center">Avg Score</th>
                            <th className="py-3 px-4 text-center">%</th>
                            <th className="py-3 px-4 text-center">Risk</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {paginatedStudents.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-slate-400 italic font-medium">
                                No student records found.
                              </td>
                            </tr>
                          ) : (
                            paginatedStudents.map((student) => {
                              const rank = studentRankMap[student.student_id] || '-';
                              return (
                                <tr 
                                  key={student.student_id} 
                                  onClick={() => navigate(`/students/${student.student_id}`)}
                                  className="hover:bg-slate-50/80 cursor-pointer transition duration-150 font-medium"
                                >
                                  <td className="py-3 px-4 text-center font-bold text-slate-800">
                                    {rank === 1 ? '🥇 1' : rank === 2 ? '🥈 2' : rank === 3 ? '🥉 3' : `#${rank}`}
                                  </td>
                                  <td className="py-3 px-4 font-extrabold text-slate-800">
                                    {student.student_name}
                                    {student.roll_number && <span className="text-[10px] text-slate-400 font-bold ml-2">({student.roll_number})</span>}
                                  </td>
                                  <td className="py-3 px-4 text-center font-bold text-slate-800">{student.average_score}</td>
                                  <td className="py-3 px-4 text-center text-indigo-600 font-bold">
                                    {((student.average_score / 300) * 100).toFixed(1)}%
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border ${
                                      getStudentRisk(student.average_score) === 'High' 
                                        ? 'bg-red-50 text-red-700 border-red-200' 
                                        : getStudentRisk(student.average_score) === 'Medium' 
                                          ? 'bg-amber-50 text-amber-700 border-amber-200' 
                                          : 'bg-green-50 text-green-700 border-green-200'
                                    }`}>
                                      {getStudentRisk(student.average_score) === 'High' ? '🚨 High' : getStudentRisk(student.average_score) === 'Medium' ? '⚠️ Medium' : '✅ Low'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex justify-between items-center text-xs font-semibold pt-3 border-t border-slate-100">
                        <span className="text-slate-400">
                          Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, processedStudents.length)} of {processedStudents.length} students
                        </span>
                        <div className="flex gap-2">
                          <button 
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => p - 1)}
                            className="px-3 py-1.5 border rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 shadow-sm"
                          >
                            Prev
                          </button>
                          <button 
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(p => p + 1)}
                            className="px-3 py-1.5 border rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 shadow-sm"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                </SectionCard>

              </>
            )}
          </div>
        )}

      </div>
    </MainLayout>
  );
}
