import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import MainLayout from '../components/layout/MainLayout'
import api from '../services/api'
import ActionButton from '../components/common/ActionButton'

function Home() {
  const [stats, setStats] = useState({
    total_schools: 0,
    total_students: 0,
    total_tests: 0,
    total_analytics_generated: 0
  })
  const navigate = useNavigate()

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/dashboard/stats')
        setStats(response.data)
      } catch (error) {
        console.error("Failed to load stats", error)
      }
    }
    fetchStats()
  }, [])

  const cards = [
    { title: 'Total Schools', value: stats.total_schools, color: 'text-blue-600' },
    { title: 'Total Students', value: stats.total_students, color: 'text-green-600' },
    { title: 'Total Tests', value: stats.total_tests, color: 'text-purple-600' },
    { title: 'Total Analytics Generated', value: stats.total_analytics_generated, color: 'text-orange-600' }
  ]

  return (
    <MainLayout>
      <div className="p-6">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-slate-800">
              Super Admin Dashboard
            </h1>
            <p className="mt-3 max-w-2xl text-gray-600">
              Overview of the entire analytics platform across all schools.
            </p>
          </div>
          <ActionButton onClick={() => navigate('/schools')} variant="primary">
            Manage Schools
          </ActionButton>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition"
            >
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                {card.title}
              </h2>
              <p className={`mt-2 text-4xl font-bold ${card.color}`}>
                {card.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  )
}

export default Home