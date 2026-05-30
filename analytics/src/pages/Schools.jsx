import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import ActionButton from '../components/common/ActionButton';
import SectionCard from '../components/common/SectionCard';
import MainLayout from '../components/layout/MainLayout';

export default function Schools() {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSchool, setNewSchool] = useState({ school_name: '', school_code: '' });
  const navigate = useNavigate();

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    try {
      const response = await api.get('/schools');
      setSchools(response.data);
    } catch (error) {
      console.error('Failed to fetch schools', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSchool = async (e) => {
    e.preventDefault();
    try {
      await api.post('/schools', newSchool);
      setShowAddModal(false);
      setNewSchool({ school_name: '', school_code: '' });
      fetchSchools();
    } catch (error) {
      alert('Failed to add school. ' + (error.response?.data?.detail || ''));
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this school?')) return;
    try {
      await api.delete(`/schools/${id}`);
      fetchSchools();
    } catch (error) {
      alert('Failed to delete school.');
    }
  };

  return (
    <MainLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-slate-800">Schools Management</h1>
          <ActionButton onClick={() => setShowAddModal(true)} variant="primary">
            Add School
          </ActionButton>
        </div>

        <SectionCard title="Registered Schools">
          {loading ? (
            <p>Loading schools...</p>
          ) : schools.length === 0 ? (
            <p className="text-slate-500">No schools found. Add one to get started.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="py-3 px-4 font-semibold text-slate-600">School Name</th>
                    <th className="py-3 px-4 font-semibold text-slate-600">School Code</th>
                    <th className="py-3 px-4 font-semibold text-slate-600">Students</th>
                    <th className="py-3 px-4 font-semibold text-slate-600">Tests</th>
                    <th className="py-3 px-4 font-semibold text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {schools.map((school) => (
                    <tr key={school.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4">{school.school_name}</td>
                      <td className="py-3 px-4">{school.school_code}</td>
                      <td className="py-3 px-4">
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                          {school.student_count || 0}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full font-medium">
                          {school.test_count || 0}
                        </span>
                      </td>
                      <td className="py-3 px-4 flex gap-2">
                        <ActionButton onClick={() => navigate(`/schools/${school.id}`)} variant="secondary">
                          View
                        </ActionButton>
                        <button onClick={() => handleDelete(school.id)} className="text-red-500 hover:text-red-700 px-3 py-1 text-sm font-medium">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Add New School</h2>
              <form onSubmit={handleAddSchool}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1">School Name</label>
                  <input
                    type="text"
                    required
                    className="w-full border border-slate-300 rounded px-3 py-2"
                    value={newSchool.school_name}
                    onChange={(e) => setNewSchool({ ...newSchool, school_name: e.target.value })}
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1">School Code</label>
                  <input
                    type="text"
                    required
                    className="w-full border border-slate-300 rounded px-3 py-2"
                    value={newSchool.school_code}
                    onChange={(e) => setNewSchool({ ...newSchool, school_code: e.target.value })}
                  />
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">
                    Cancel
                  </button>
                  <ActionButton type="submit" variant="primary">
                    Save School
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
