import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import ActionButton from '../components/common/ActionButton';
import SectionCard from '../components/common/SectionCard';
import MainLayout from '../components/layout/MainLayout';

// We import the refactored components
import UploadTab from '../components/test/UploadTab';
import PreviewTab from '../components/test/PreviewTab';
import ReportTab from '../components/test/ReportTab';

export default function TestDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // overview, upload, preview, reports, analytics
  const [analyticsData, setAnalyticsData] = useState(null); // The raw data returned after generation

  useEffect(() => {
    fetchTest();
  }, [id]);

  const fetchTest = async () => {
    try {
      const res = await api.get(`/tests/${id}`);
      setTest(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleUploadSuccess = (data) => {
    setAnalyticsData(data);
    setActiveTab('preview');
    fetchTest(); // refresh test status
  };

  if (!test) return <div className="p-6">Loading test details...</div>;

  return (
    <MainLayout>
      <div className="p-6">
        <div className="flex justify-between items-end mb-6">
          <div>
            <button onClick={() => navigate(`/schools/${test.school_id}`)} className="text-blue-600 hover:underline mb-2 block text-sm font-medium">
              &larr; Back to School
            </button>
            <h1 className="text-3xl font-bold text-slate-800">{test.test_name}</h1>
            <p className="text-slate-500">Type: {test.test_type} | Number: {test.test_number} | Status: {test.status}</p>
          </div>
        </div>

        <div className="flex border-b border-slate-200 mb-6">
          {['overview', 'upload files', 'preview', 'reports', 'analytics'].map(tab => {
            const tabKey = tab.split(' ')[0]; // 'upload files' -> 'upload'
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tabKey)}
                className={`px-4 py-2 font-medium text-sm capitalize ${activeTab === tabKey ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {tab}
              </button>
            )
          })}
        </div>

        {activeTab === 'overview' && (
          <SectionCard title="Test Overview">
            <p>Test Name: {test.test_name}</p>
            <p>Status: {test.status}</p>
            <div className="mt-4">
              <ActionButton onClick={() => setActiveTab('upload')}>Go to Upload Files</ActionButton>
            </div>
          </SectionCard>
        )}

        {activeTab === 'upload' && (
          <UploadTab testId={id} onSuccess={handleUploadSuccess} />
        )}

        {activeTab === 'preview' && (
          <PreviewTab data={analyticsData} onNext={() => setActiveTab('reports')} />
        )}

        {activeTab === 'reports' && (
          <ReportTab data={analyticsData} />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsTab testId={id} />
        )}
      </div>
    </MainLayout>
  );
}

function AnalyticsTab({ testId }) {
  const [data, setData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'rank', direction: 'ascending' });
  const navigate = useNavigate();

  useEffect(() => {
    api.get(`/tests/${testId}/analytics`)
      .then(res => setData(res.data))
      .catch(console.error);
  }, [testId]);

  if (!data) return <div className="py-8 text-center text-slate-500 font-medium">Loading analytics data...</div>;
  if (data.message) return <div className="py-8 text-center text-amber-600 bg-amber-50 rounded-xl border border-amber-200 p-6">{data.message}</div>;

  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getRankBadge = (rank) => {
    if (rank === 1) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-bold text-amber-700 shadow-sm">
          👑 1
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-300 px-2.5 py-0.5 text-xs font-bold text-slate-700 shadow-sm">
          🥈 2
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 border border-orange-200 px-2.5 py-0.5 text-xs font-bold text-orange-700 shadow-sm">
          🥉 3
        </span>
      );
    }
    return <span className="font-semibold text-slate-600 pl-2">#{rank}</span>;
  };

  const filteredResults = (data.results || []).filter(r => {
    const name = r.student_name ? r.student_name.toLowerCase() : '';
    const roll = r.roll_no ? String(r.roll_no).toLowerCase() : '';
    const query = searchQuery.toLowerCase();
    return name.includes(query) || roll.includes(query);
  });

  const sortedResults = [...filteredResults].sort((a, b) => {
    let aVal = a[sortConfig.key];
    let bVal = b[sortConfig.key];

    if (sortConfig.key === 'rank') {
      if (aVal === null || aVal === undefined) aVal = 999;
      if (bVal === null || bVal === undefined) bVal = 999;
    } else {
      if (aVal === null || aVal === undefined) aVal = 0;
      if (bVal === null || bVal === undefined) bVal = 0;
    }

    if (aVal < bVal) {
      return sortConfig.direction === 'ascending' ? -1 : 1;
    }
    if (aVal > bVal) {
      return sortConfig.direction === 'ascending' ? 1 : -1;
    }
    return 0;
  });

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <h3 className="text-sm font-medium text-slate-500 mb-1">Students Appeared</h3>
          <p className="text-3xl font-bold text-slate-800">{data.students_appeared}</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <h3 className="text-sm font-medium text-slate-500 mb-1">Average Score</h3>
          <p className="text-3xl font-bold text-slate-800">{data.average_score}</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <h3 className="text-sm font-medium text-slate-500 mb-1">Highest Score</h3>
          <p className="text-3xl font-bold text-green-600">{data.highest_score}</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <h3 className="text-sm font-medium text-slate-500 mb-1">Topper</h3>
          <p className="text-3xl font-bold text-slate-800 truncate">{data.topper}</p>
        </div>
      </div>

      {/* School Name and Test Date Banner */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center bg-white border border-slate-200 p-5 rounded-2xl shadow-sm gap-4">
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">School Name</span>
          <h4 className="text-lg font-bold text-slate-800">{data.school_name}</h4>
        </div>
        <div className="md:text-right">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">Test Date</span>
          <h4 className="text-lg font-bold text-slate-800">
            {data.test_date ? new Date(data.test_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
          </h4>
        </div>
      </div>
      
      <SectionCard>
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Student Rankings</h2>
            <p className="text-sm text-slate-500">Click a student's row to navigate to their detailed profile and subject breakdown.</p>
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

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b divide-x divide-slate-100">
                <th 
                  onClick={() => handleSort('rank')} 
                  className="py-3 px-4 cursor-pointer select-none text-blue-600 hover:bg-slate-100 transition duration-150"
                >
                  Rank {sortConfig.key === 'rank' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : '↕'}
                </th>
                <th className="py-3 px-4 text-slate-500">Roll No</th>
                <th className="py-3 px-4 text-slate-500">Student Name</th>
                <th className="py-3 px-4 text-slate-500">Class & Section</th>
                <th 
                  onClick={() => handleSort('total_score')} 
                  className="py-3 px-4 cursor-pointer select-none text-blue-600 hover:bg-slate-100 transition duration-150"
                >
                  Total Score {sortConfig.key === 'total_score' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : '↕'}
                </th>
                <th 
                  onClick={() => handleSort('accuracy')} 
                  className="py-3 px-4 cursor-pointer select-none text-blue-600 hover:bg-slate-100 transition duration-150"
                >
                  Accuracy {sortConfig.key === 'accuracy' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : '↕'}
                </th>
                <th className="py-3 px-4 text-slate-500">Physics</th>
                <th className="py-3 px-4 text-slate-500">Chemistry</th>
                <th className="py-3 px-4 text-slate-500">Maths</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {sortedResults.length > 0 ? (
                sortedResults.map(r => (
                  <tr 
                    key={r.id} 
                    onClick={() => navigate(`/students/${r.student_id}`)}
                    className="hover:bg-slate-50 cursor-pointer transition duration-150"
                  >
                    <td className="py-3 px-4 font-medium">{getRankBadge(r.rank)}</td>
                    <td className="py-3 px-4 text-slate-600 font-medium">{r.roll_no}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{r.student_name}</td>
                    <td className="py-3 px-4 text-slate-500">
                      {r.class_name || 'Standard 12'} - {r.section || 'A'}
                    </td>
                    <td className="py-3 px-4 font-bold text-blue-600">{r.total_score}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                        {r.accuracy}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">{r.physics}</td>
                    <td className="py-3 px-4 text-slate-600 font-medium">{r.chemistry}</td>
                    <td className="py-3 px-4 text-slate-600 font-medium">{r.maths}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500 italic">
                    No matching records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  )
}
